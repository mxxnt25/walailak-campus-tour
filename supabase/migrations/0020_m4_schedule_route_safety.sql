-- M4 additive safety migration. Based on remote 63363e7 (through 0017).
-- Local times are Asia/Bangkok. Completion timing is deliberately unchanged (D3).
-- Proposed overlap policy: ASSIGNED/ACCEPTED occupy [start,end), no travel buffer.
-- Confirm this boundary policy with the integration owner before production rollout.
BEGIN;

CREATE OR REPLACE FUNCTION public.m4_schedule_edit_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Same lock order as assignment RPCs: domain mutex, schedule row, assignment.
  PERFORM pg_advisory_xact_lock(7042026, 4);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS m4_schedule_edit_lock ON public.tour_schedules;
CREATE TRIGGER m4_schedule_edit_lock
BEFORE UPDATE OF tour_date, start_time, end_time, route_id ON public.tour_schedules
FOR EACH STATEMENT EXECUTE FUNCTION public.m4_schedule_edit_lock();

CREATE OR REPLACE FUNCTION public.m4_validate_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_time_changed boolean;
  v_booked bigint;
BEGIN
  v_time_changed := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN
    v_time_changed := (NEW.tour_date, NEW.start_time, NEW.end_time, NEW.route_id)
      IS DISTINCT FROM (OLD.tour_date, OLD.start_time, OLD.end_time, OLD.route_id);
    -- Terminal schedules cannot be silently reopened via a direct update.
    IF OLD.status IN ('CANCELLED','COMPLETED') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'INVALID_STATE';
    END IF;
  END IF;
  IF v_time_changed THEN
    IF NEW.end_time IS NULL OR NEW.end_time <= NEW.start_time THEN RAISE EXCEPTION 'TIME_ORDER'; END IF;
    IF (NEW.tour_date + NEW.start_time) AT TIME ZONE 'Asia/Bangkok' <= clock_timestamp() THEN
      RAISE EXCEPTION 'SCHEDULE_PAST';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.routes WHERE id = NEW.route_id AND status = 'ACTIVE') THEN
      RAISE EXCEPTION 'ROUTE_INACTIVE';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.guide_assignments own_ga
      JOIN public.guide_assignments other_ga ON other_ga.guide_id = own_ga.guide_id AND other_ga.schedule_id <> NEW.id
      JOIN public.tour_schedules other_s ON other_s.id = other_ga.schedule_id
      WHERE own_ga.schedule_id = NEW.id AND own_ga.status IN ('ASSIGNED','ACCEPTED')
        AND other_ga.status IN ('ASSIGNED','ACCEPTED') AND other_s.status IN ('OPEN','FULL','CLOSED')
        AND other_s.tour_date = NEW.tour_date
        AND NEW.start_time < COALESCE(other_s.end_time, '24:00'::time)
        AND other_s.start_time < NEW.end_time
    ) THEN RAISE EXCEPTION 'GUIDE_OVERLAP'; END IF;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.max_participants IS DISTINCT FROM OLD.max_participants THEN
    SELECT COALESCE(sum(participant_count),0) INTO v_booked FROM public.bookings
      WHERE schedule_id = NEW.id AND status IN ('CONFIRMED','COMPLETED');
    IF NEW.max_participants IS NULL OR NEW.max_participants < 1 OR NEW.max_participants < v_booked THEN
      RAISE EXCEPTION 'CAPACITY_INVALID';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS m4_validate_schedule ON public.tour_schedules;
CREATE TRIGGER m4_validate_schedule BEFORE INSERT OR UPDATE ON public.tour_schedules
FOR EACH ROW EXECUTE FUNCTION public.m4_validate_schedule();

-- Availability guard is additive: M3 booking/capacity RPCs are not replaced.
-- Their schedule row lock remains authoritative for capacity.
CREATE OR REPLACE FUNCTION public.m4_guard_booking_time()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schedule public.tour_schedules%rowtype;
BEGIN
  SELECT * INTO v_schedule FROM public.tour_schedules WHERE id = NEW.schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_schedule.status <> 'OPEN' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF v_schedule.end_time IS NULL OR v_schedule.end_time <= v_schedule.start_time THEN RAISE EXCEPTION 'TIME_ORDER'; END IF;
  IF (v_schedule.tour_date + v_schedule.start_time) AT TIME ZONE 'Asia/Bangkok' <= clock_timestamp() THEN
    RAISE EXCEPTION 'SCHEDULE_EXPIRED';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS m4_guard_booking_time ON public.bookings;
CREATE TRIGGER m4_guard_booking_time BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.m4_guard_booking_time();

CREATE OR REPLACE FUNCTION public.m4_guard_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schedule public.tour_schedules%rowtype;
BEGIN
  IF NEW.status NOT IN ('ASSIGNED','ACCEPTED') THEN RETURN NEW; END IF;
  -- Trusted RPCs acquire mutex before row locks; direct client writes remain RLS-denied.
  PERFORM pg_advisory_xact_lock(7042026, 4);
  SELECT * INTO v_schedule FROM public.tour_schedules WHERE id = NEW.schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_schedule.status NOT IN ('OPEN','FULL','CLOSED') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.guide_id AND role = 'GUIDE' AND account_status = 'ACTIVE') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_schedule.end_time IS NULL OR v_schedule.end_time <= v_schedule.start_time THEN RAISE EXCEPTION 'TIME_ORDER'; END IF;
  IF (v_schedule.tour_date + v_schedule.start_time) AT TIME ZONE 'Asia/Bangkok' <= clock_timestamp() THEN
    RAISE EXCEPTION 'SCHEDULE_EXPIRED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.guide_assignments ga JOIN public.tour_schedules s ON s.id = ga.schedule_id
    WHERE ga.guide_id = NEW.guide_id AND ga.schedule_id <> NEW.schedule_id
      AND ga.status IN ('ASSIGNED','ACCEPTED') AND s.status IN ('OPEN','FULL','CLOSED')
      AND s.tour_date = v_schedule.tour_date
      AND v_schedule.start_time < COALESCE(s.end_time,'24:00'::time)
      AND s.start_time < v_schedule.end_time
  ) THEN RAISE EXCEPTION 'GUIDE_OVERLAP'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS m4_guard_assignment ON public.guide_assignments;
CREATE TRIGGER m4_guard_assignment BEFORE INSERT OR UPDATE ON public.guide_assignments
FOR EACH ROW EXECUTE FUNCTION public.m4_guard_assignment();

-- Preserve original authorization, audit and result contracts; acquire mutex first.
CREATE OR REPLACE FUNCTION public.assign_guide(
  p_schedule_id uuid,
  p_guide_id uuid
)
RETURNS public.guide_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid;
  v_schedule_status text;
  v_target_role text;
  v_target_status text;
  v_old_assignment public.guide_assignments%rowtype;
  v_assignment public.guide_assignments%rowtype;
BEGIN
  PERFORM pg_advisory_xact_lock(7042026, 4);

  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_schedule_id IS NULL OR p_guide_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;


  SELECT status
  INTO v_schedule_status
  FROM public.tour_schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_schedule_status IN ('CANCELLED', 'COMPLETED') THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;


  SELECT role, account_status
  INTO v_target_role, v_target_status
  FROM public.profiles
  WHERE id = p_guide_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_target_role <> 'GUIDE'
     OR v_target_status <> 'ACTIVE'
  THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;


  SELECT *
  INTO v_old_assignment
  FROM public.guide_assignments
  WHERE schedule_id = p_schedule_id;


  INSERT INTO public.guide_assignments (
    schedule_id,
    guide_id,
    status,
    assigned_at
  )
  VALUES (
    p_schedule_id,
    p_guide_id,
    'ASSIGNED',
    now()
  )
  ON CONFLICT (schedule_id)
  DO UPDATE SET
    guide_id = EXCLUDED.guide_id,
    status = 'ASSIGNED',
    assigned_at = now()
  RETURNING *
  INTO v_assignment;


  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    old_data,
    new_data
  )
  VALUES (
    v_actor_id,
    'GUIDE_ASSIGNED',
    'TOUR_SCHEDULE',
    p_schedule_id,

    CASE
      WHEN v_old_assignment.id IS NULL
        THEN NULL
      ELSE jsonb_build_object(
        'assignment_id', v_old_assignment.id,
        'guide_id', v_old_assignment.guide_id,
        'status', v_old_assignment.status
      )
    END,

    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'guide_id', v_assignment.guide_id,
      'status', v_assignment.status
    )
  );


  RETURN v_assignment;

END;
$$;

-- Preserve original authorization, audit and result contracts; acquire mutex first.
CREATE OR REPLACE FUNCTION public.update_my_assignment_status(
  p_assignment_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(7042026, 4);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF public.current_user_role() IS DISTINCT FROM 'GUIDE'
     OR NOT public.is_active_user()
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_assignment_id IS NULL
     OR p_status IS NULL OR p_status NOT IN ('ACCEPTED', 'DECLINED')
  THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;


  UPDATE public.guide_assignments
  SET status = p_status
  WHERE id = p_assignment_id
    AND guide_id = auth.uid()
    AND status = 'ASSIGNED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;


  RETURN true;

END;
$$;

-- One transaction replaces the list; any insert/validation failure restores the old list.
CREATE OR REPLACE FUNCTION public.m4_replace_route_stops(p_route_id uuid, p_stops jsonb)
RETURNS SETOF public.route_stops LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_stop jsonb; v_lat double precision; v_lng double precision;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_route_id IS NULL OR p_stops IS NULL OR jsonb_typeof(p_stops) <> 'array' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  PERFORM 1 FROM public.routes WHERE id = p_route_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  FOR v_stop IN SELECT value FROM jsonb_array_elements(p_stops) LOOP
    IF jsonb_typeof(v_stop) <> 'object' OR jsonb_typeof(v_stop->'name') IS DISTINCT FROM 'string'
      OR NULLIF(btrim(v_stop->>'name'),'') IS NULL
      OR jsonb_typeof(v_stop->'latitude') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_stop->'longitude') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
    v_lat := (v_stop->>'latitude')::double precision;
    v_lng := (v_stop->>'longitude')::double precision;
    IF NOT (v_lat BETWEEN -90 AND 90) OR NOT (v_lng BETWEEN -180 AND 180) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
    IF NULLIF(btrim(v_stop->>'image_url'),'') IS NOT NULL AND btrim(v_stop->>'image_url') !~* '^https?://[^[:space:]/]+[^[:space:]]*$' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  END LOOP;
  DELETE FROM public.route_stops WHERE route_id = p_route_id;
  RETURN QUERY
  INSERT INTO public.route_stops(route_id,name,description,latitude,longitude,stop_order,image_url)
    SELECT p_route_id,btrim(item->>'name'),NULLIF(btrim(item->>'description'),''),
      (item->>'latitude')::double precision,(item->>'longitude')::double precision,
      ordinal::integer,NULLIF(btrim(item->>'image_url'),'')
    FROM jsonb_array_elements(p_stops) WITH ORDINALITY AS items(item,ordinal)
    ORDER BY ordinal RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.m4_schedule_edit_lock(), public.m4_validate_schedule(), public.m4_guard_booking_time(), public.m4_guard_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_guide(uuid,uuid), public.update_my_assignment_status(uuid,text), public.m4_replace_route_stops(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_guide(uuid,uuid), public.update_my_assignment_status(uuid,text), public.m4_replace_route_stops(uuid,jsonb) TO authenticated;
COMMIT;
