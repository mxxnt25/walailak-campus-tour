-- D3 confirmed by user: completion at/after scheduled end, Asia/Bangkok.
-- Apply after 0018. Does not edit historical migration files.
BEGIN;
CREATE OR REPLACE FUNCTION public.m4_completion_due(p_date date, p_start time, p_end time, p_now timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(p_end > p_start AND ((p_date + p_end) AT TIME ZONE 'Asia/Bangkok') <= p_now, false);
$$;
CREATE OR REPLACE FUNCTION public.m4_guard_completion_time()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'COMPLETED') THEN
    IF NEW.end_time IS NULL OR NEW.end_time <= NEW.start_time THEN RAISE EXCEPTION 'TIME_ORDER'; END IF;
    IF NOT public.m4_completion_due(NEW.tour_date,NEW.start_time,NEW.end_time,clock_timestamp()) THEN
      RAISE EXCEPTION 'TOUR_NOT_ENDED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS m4_guard_completion_time ON public.tour_schedules;
CREATE TRIGGER m4_guard_completion_time BEFORE INSERT OR UPDATE ON public.tour_schedules
FOR EACH ROW EXECUTE FUNCTION public.m4_guard_completion_time();
-- Recreate explicitly because historical environments may expose
-- a different return type for complete_tour(uuid).
-- No CASCADE: fail safely if a DB object unexpectedly depends on it.
drop function if exists public.complete_tour(uuid);

create or replace function public.complete_tour(
  p_schedule_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_schedule public.tour_schedules%rowtype;
  v_is_admin boolean := false;
  v_is_accepted_guide boolean := false;
  v_completed_bookings integer := 0;
  v_completed_assignments integer := 0;
begin
  -- 1) Authentication
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- 2) Input validation
  if p_schedule_id is null then
    raise exception 'VALIDATION_ERROR';
  end if;

  -- 3) Lock schedule
  select *
  into v_schedule
  from public.tour_schedules
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- 4) Authorization
  v_is_admin := public.is_admin();

  if public.is_active_user()
     and public.current_user_role() = 'GUIDE' then

    select exists (
      select 1
      from public.guide_assignments ga
      where ga.schedule_id = p_schedule_id
        and ga.guide_id = v_actor_id
        and ga.status = 'ACCEPTED'
    )
    into v_is_accepted_guide;

  end if;

  if not v_is_admin and not v_is_accepted_guide then
    raise exception 'FORBIDDEN';
  end if;

  -- 5) Lifecycle
  if v_schedule.status not in ('OPEN', 'FULL', 'CLOSED') then
    raise exception 'INVALID_STATE';
  end if;

  -- Frozen D3: no role, including ADMIN, can complete before the scheduled end.
  if v_schedule.end_time is null or v_schedule.end_time <= v_schedule.start_time then
    raise exception 'TIME_ORDER';
  end if;
  if not public.m4_completion_due(v_schedule.tour_date, v_schedule.start_time,
                                  v_schedule.end_time, clock_timestamp()) then
    raise exception 'TOUR_NOT_ENDED';
  end if;

  -- 6) Complete schedule
  update public.tour_schedules
  set
    status = 'COMPLETED',
    updated_at = now()
  where id = p_schedule_id

  -- 7) Complete accepted guide assignment only
  update public.guide_assignments
  set status = 'COMPLETED'
  where schedule_id = p_schedule_id
    and status = 'ACCEPTED';

  get diagnostics v_completed_assignments = row_count;

  -- 8) Complete confirmed bookings.
  -- M3 protect_booking_update() explicitly supports
  -- CONFIRMED -> COMPLETED for trusted Guide operations.
  -- CANCELLED bookings are untouched.
  update public.bookings
  set
    status = 'COMPLETED',
    updated_at = now()
  where schedule_id = p_schedule_id
    and status = 'CONFIRMED';

  get diagnostics v_completed_bookings = row_count;

  -- 9) Audit
  insert into public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    old_data,
    new_data
  )
  values (
    v_actor_id,
    'TOUR_COMPLETED',
    'TOUR_SCHEDULE',
    p_schedule_id,
    jsonb_build_object(
      'status', v_schedule.status
    ),
    jsonb_build_object(
      'status', 'COMPLETED',
      'completed_bookings', v_completed_bookings,
      'completed_assignments', v_completed_assignments
    )
  );

  return true;
end;
$$;

-- Trusted workflow RPC permissions
revoke all
on function public.complete_tour(uuid)
from public;

revoke all
on function public.complete_tour(uuid)
from anon;

grant execute
on function public.complete_tour(uuid)
to authenticated;

REVOKE ALL ON FUNCTION public.m4_completion_due(date,time,time,timestamptz),public.m4_guard_completion_time() FROM PUBLIC,anon,authenticated;
COMMIT;
