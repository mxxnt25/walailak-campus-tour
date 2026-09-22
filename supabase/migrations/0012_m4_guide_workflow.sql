-- ============================================================
-- 0012_m4_guide_workflow.sql
-- M4 Guide / Schedule workflow
--
-- Owns:
--   - CLOSED schedule lifecycle
--   - trusted guide assignment
--   - Guide Accept / Decline
--   - restricted Tour Manifest
--   - trusted attendance update
--
-- Does NOT own:
--   - attendance columns (0011)
--   - complete_tour() (0013)
-- ============================================================

BEGIN;


-- ============================================================
-- 1. FINAL SCHEDULE LIFECYCLE
-- ============================================================

ALTER TABLE public.tour_schedules
  DROP CONSTRAINT IF EXISTS tour_schedules_status_check;

ALTER TABLE public.tour_schedules
  ADD CONSTRAINT tour_schedules_status_check
  CHECK (
    status IN (
      'OPEN',
      'FULL',
      'CLOSED',
      'CANCELLED',
      'COMPLETED'
    )
  );


-- ============================================================
-- 2. ADMIN / SUPER_ADMIN ASSIGN GUIDE
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_guide(
  p_schedule_id uuid,
  p_guide_id uuid
)
RETURNS public.guide_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_schedule_status text;
  v_target_role text;
  v_target_status text;
  v_old_assignment public.guide_assignments%rowtype;
  v_assignment public.guide_assignments%rowtype;
BEGIN

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


-- ============================================================
-- 3. GUIDE ACCEPT / DECLINE OWN ASSIGNMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_my_assignment_status(
  p_assignment_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF public.current_user_role() IS DISTINCT FROM 'GUIDE'
     OR NOT public.is_active_user()
  THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_assignment_id IS NULL
     OR p_status NOT IN ('ACCEPTED', 'DECLINED')
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


-- ============================================================
-- 4. LIMITED TOUR MANIFEST
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_tour_manifest(
  p_schedule_id uuid
)
RETURNS TABLE (
  booking_id uuid,
  full_name text,
  phone text,
  participant_count integer,
  special_request text,
  booking_status text,
  attendance_status text,
  checked_in_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_schedule_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;


  IF NOT public.is_admin() THEN

    IF public.current_user_role() IS DISTINCT FROM 'GUIDE'
       OR NOT public.is_active_user()
    THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.guide_assignments ga
      WHERE ga.schedule_id = p_schedule_id
        AND ga.guide_id = auth.uid()
        AND ga.status IN ('ACCEPTED', 'COMPLETED')
    )
    THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

  END IF;


  RETURN QUERY
  SELECT
    b.id,
    p.full_name,
    p.phone,
    b.participant_count,
    b.special_request,
    b.status,
    b.attendance_status,
    b.checked_in_at
  FROM public.bookings b
  JOIN public.profiles p
    ON p.id = b.user_id
  WHERE b.schedule_id = p_schedule_id
    AND b.status IN ('CONFIRMED', 'COMPLETED')
  ORDER BY b.created_at;

END;
$$;


-- ============================================================
-- 5. TRUSTED ATTENDANCE UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_tour_attendance(
  p_booking_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_booking_status text;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_booking_id IS NULL
     OR p_status NOT IN (
       'NOT_CHECKED_IN',
       'CHECKED_IN',
       'NO_SHOW'
     )
  THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;


  SELECT
    schedule_id,
    status
  INTO
    v_schedule_id,
    v_booking_status
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_booking_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;


  IF NOT public.is_admin() THEN

    IF public.current_user_role() IS DISTINCT FROM 'GUIDE'
       OR NOT public.is_active_user()
    THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF v_booking_status <> 'CONFIRMED' THEN
      RAISE EXCEPTION 'INVALID_STATE';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.guide_assignments ga
      WHERE ga.schedule_id = v_schedule_id
        AND ga.guide_id = auth.uid()
        AND ga.status = 'ACCEPTED'
    )
    THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

  END IF;


  UPDATE public.bookings
  SET
    attendance_status = p_status,
    checked_in_at = CASE
      WHEN p_status = 'CHECKED_IN'
        THEN now()
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_booking_id;


  RETURN true;

END;
$$;


-- ============================================================
-- 6. RPC PERMISSIONS
-- ============================================================

REVOKE ALL
ON FUNCTION public.assign_guide(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.assign_guide(uuid, uuid)
TO authenticated;


REVOKE ALL
ON FUNCTION public.update_my_assignment_status(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.update_my_assignment_status(uuid, text)
TO authenticated;


REVOKE ALL
ON FUNCTION public.get_my_tour_manifest(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_my_tour_manifest(uuid)
TO authenticated;


REVOKE ALL
ON FUNCTION public.update_tour_attendance(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.update_tour_attendance(uuid, text)
TO authenticated;


COMMIT;
