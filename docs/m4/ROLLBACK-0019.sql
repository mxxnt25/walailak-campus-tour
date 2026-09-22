-- Recovery only: restores previous completion behavior WITHOUT time restriction.
-- Coordinate with integration owner and restore compatible frontend first.
BEGIN;
DROP TRIGGER IF EXISTS m4_guard_completion_time ON public.tour_schedules;
DROP FUNCTION IF EXISTS public.m4_guard_completion_time();
DROP FUNCTION IF EXISTS public.m4_completion_due(date,time,time,timestamptz);
create or replace function public.complete_tour(
  p_schedule_id uuid
)
returns public.tour_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_schedule public.tour_schedules%rowtype;
  v_completed_schedule public.tour_schedules%rowtype;
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

  -- 6) Complete schedule
  update public.tour_schedules
  set
    status = 'COMPLETED',
    updated_at = now()
  where id = p_schedule_id
  returning *
  into v_completed_schedule;

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

  return v_completed_schedule;
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

COMMIT;
