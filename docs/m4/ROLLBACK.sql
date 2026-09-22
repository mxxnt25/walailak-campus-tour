-- Recovery only: restore the previous frontend first (it does not require the new stops RPC).
-- This removes the new protections. Use only with integration-owner coordination.
BEGIN;
DROP TRIGGER IF EXISTS m4_schedule_edit_lock ON public.tour_schedules;
DROP TRIGGER IF EXISTS m4_validate_schedule ON public.tour_schedules;
DROP TRIGGER IF EXISTS m4_guard_booking_time ON public.bookings;
DROP TRIGGER IF EXISTS m4_guard_assignment ON public.guide_assignments;
DROP FUNCTION IF EXISTS public.m4_schedule_edit_lock();
DROP FUNCTION IF EXISTS public.m4_validate_schedule();
DROP FUNCTION IF EXISTS public.m4_guard_booking_time();
DROP FUNCTION IF EXISTS public.m4_guard_assignment();
DROP FUNCTION IF EXISTS public.m4_replace_route_stops(uuid,jsonb);
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
REVOKE ALL ON FUNCTION public.assign_guide(uuid,uuid),public.update_my_assignment_status(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_guide(uuid,uuid),public.update_my_assignment_status(uuid,text) TO authenticated;
COMMIT;
