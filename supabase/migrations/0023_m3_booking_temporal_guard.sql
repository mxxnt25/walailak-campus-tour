-- =========================================================
-- M3 Final Fix
-- Reject booking after the scheduled tour start time.
--
-- Schedule date/time is interpreted in Asia/Bangkok.
-- This migration intentionally does NOT:
-- - change duplicate-booking policy
-- - auto-close expired OPEN schedules
-- - modify schedule lifecycle policy
-- =========================================================

create or replace function public.book_tour_safe(
  p_schedule_id uuid,
  p_participant_count integer,
  p_special_request text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_schedule_status text;
  v_max_participants integer;
  v_tour_date date;
  v_start_time time without time zone;
  v_current_booked integer;
  v_new_booking_id uuid;
begin

  -- Authentication
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;


  -- Only active MEMBER may book.
  if public.current_user_role() is distinct from 'MEMBER'
     or not public.is_active_user() then

    raise exception 'FORBIDDEN';

  end if;


  -- Input validation
  if p_schedule_id is null
     or p_participant_count is null
     or p_participant_count < 1 then

    raise exception 'VALIDATION_ERROR';

  end if;


  -- Lock schedule row so temporal and capacity checks are performed
  -- against one transaction-safe schedule state.
  select
    status,
    max_participants,
    tour_date,
    start_time
  into
    v_schedule_status,
    v_max_participants,
    v_tour_date,
    v_start_time
  from public.tour_schedules
  where id = p_schedule_id
  for update;


  if not found then
    raise exception 'NOT_FOUND';
  end if;


  -- Only OPEN schedules are bookable.
  -- FULL keeps the canonical capacity-specific error.
  if v_schedule_status = 'FULL' then
    raise exception 'CAPACITY_FULL';
  elsif v_schedule_status is distinct from 'OPEN' then
    raise exception 'INVALID_STATE';
  end if;


  -- Final Fix:
  -- tour_date + start_time represents campus local time.
  -- Reject a booking once that start time has been reached/passed.
  --
  -- This derives booking availability only. It does not mutate an
  -- expired OPEN schedule to CLOSED, so schedule lifecycle policy
  -- remains unchanged.
  if (v_tour_date + v_start_time)
       <= (now() at time zone 'Asia/Bangkok') then

    raise exception 'INVALID_STATE';

  end if;


  -- Occupied capacity includes confirmed + completed bookings.
  select coalesce(sum(participant_count), 0)
  into v_current_booked
  from public.bookings
  where schedule_id = p_schedule_id
    and status in ('CONFIRMED', 'COMPLETED');


  if (
    v_current_booked + p_participant_count
  ) > v_max_participants then

    raise exception 'CAPACITY_FULL';

  end if;


  insert into public.bookings (
    user_id,
    schedule_id,
    participant_count,
    special_request,
    status,
    attendance_status
  )
  values (
    v_user_id,
    p_schedule_id,
    p_participant_count,
    nullif(trim(p_special_request), ''),
    'CONFIRMED',
    'NOT_CHECKED_IN'
  )
  returning id into v_new_booking_id;


  -- Final available seat was taken.
  if (
    v_current_booked + p_participant_count
  ) = v_max_participants then

    update public.tour_schedules
    set
      status = 'FULL',
      updated_at = now()
    where id = p_schedule_id;

  end if;


  return v_new_booking_id;

end;
$$;


revoke all
on function public.book_tour_safe(uuid, integer, text)
from public;

grant execute
on function public.book_tour_safe(uuid, integer, text)
to authenticated;
