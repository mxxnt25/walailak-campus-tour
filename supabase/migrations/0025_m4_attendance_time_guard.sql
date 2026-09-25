-- M4: guide attendance may only be recorded in the local tour window.
-- Preserves the existing boolean RPC contract, assignment checks, and admin correction path.
-- CHECKED_IN/NOT_CHECKED_IN: from 60 minutes before start through end.
-- NO_SHOW: from 15 minutes after start through end.
-- All schedule times are interpreted in Asia/Bangkok, independent of DB timezone.

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
  v_tour_date date;
  v_start_time time;
  v_end_time time;
  v_schedule_status text;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_action_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_booking_id IS NULL
     OR p_status IS NULL
     OR p_status NOT IN ('NOT_CHECKED_IN', 'CHECKED_IN', 'NO_SHOW') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  SELECT b.schedule_id, b.status
    INTO v_schedule_id, v_booking_status
  FROM public.bookings AS b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_booking_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;

  -- Preserve the existing admin path for correcting historical attendance.
  IF NOT public.is_admin() THEN
    IF public.current_user_role() IS DISTINCT FROM 'GUIDE'
       OR NOT public.is_active_user() THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF v_booking_status <> 'CONFIRMED' THEN
      RAISE EXCEPTION 'INVALID_STATE';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.guide_assignments AS ga
      WHERE ga.schedule_id = v_schedule_id
        AND ga.guide_id = auth.uid()
        AND ga.status = 'ACCEPTED'
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT s.tour_date, s.start_time, s.end_time, s.status
      INTO v_tour_date, v_start_time, v_end_time, v_schedule_status
    FROM public.tour_schedules AS s
    WHERE s.id = v_schedule_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND';
    END IF;

    IF v_schedule_status NOT IN ('OPEN', 'FULL', 'CLOSED')
       OR v_schedule_status IS NULL THEN
      RAISE EXCEPTION 'INVALID_STATE';
    END IF;

    -- Old malformed schedules must not permit attendance just because the
    -- assigned guide has permission to read them.
    IF v_tour_date IS NULL OR v_start_time IS NULL OR v_end_time IS NULL
       OR v_end_time <= v_start_time THEN
      RAISE EXCEPTION 'INVALID_SCHEDULE_TIME';
    END IF;

    v_start_at := (v_tour_date + v_start_time) AT TIME ZONE 'Asia/Bangkok';
    v_end_at := (v_tour_date + v_end_time) AT TIME ZONE 'Asia/Bangkok';
    v_action_at := clock_timestamp();

    IF p_status = 'NO_SHOW' AND v_action_at < v_start_at + interval '15 minutes' THEN
      RAISE EXCEPTION 'NO_SHOW_TOO_EARLY';
    END IF;

    IF v_action_at < v_start_at - interval '60 minutes'
       OR v_action_at > v_end_at THEN
      RAISE EXCEPTION 'ATTENDANCE_WINDOW_CLOSED';
    END IF;
  END IF;

  UPDATE public.bookings
  SET attendance_status = p_status,
      checked_in_at = CASE WHEN p_status = 'CHECKED_IN' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_tour_attendance(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_tour_attendance(uuid, text) TO authenticated;
