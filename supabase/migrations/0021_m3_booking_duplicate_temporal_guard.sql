-- =========================================================
-- M3 Final Fix
-- BOOK-03 option A + lock-safe booking deadline check
--
-- Policy:
-- - One MEMBER may have at most one CONFIRMED booking
--   for the same schedule.
-- - participant_count represents the member's group size.
-- - CANCELLED bookings do not block a new booking.
-- - Existing legacy duplicate rows are preserved.
-- - Expired availability is derived only; schedule status
--   is not automatically changed.
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
  v_existing_booking_id uuid;
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


  -- Serialize all booking attempts for this schedule.
  --
  -- This same row lock protects:
  -- - booking deadline evaluation
  -- - duplicate-booking evaluation
  -- - capacity accounting
  -- - FULL transition
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


  -- D4:
  -- Re-evaluate wall-clock time AFTER obtaining the schedule lock.
  --
  -- clock_timestamp() is intentional here. Unlike now(),
  -- it reflects the actual current time after a request may have
  -- waited for another transaction to release this schedule row.
  --
  -- tour_date + start_time is campus-local time.
  if (v_tour_date + v_start_time)
       <= (
         clock_timestamp()
         at time zone 'Asia/Bangkok'
       ) then

    raise exception 'INVALID_STATE';

  end if;


  -- BOOK-03 option A:
  -- One MEMBER may have at most one CONFIRMED booking
  -- for this schedule.
  --
  -- This query runs while the schedule row lock is held, so
  -- concurrent requests for the same schedule cannot both pass
  -- this check and create duplicate CONFIRMED rows.
  --
  -- CANCELLED rows are intentionally ignored.
  --
  -- Existing historical duplicates are not changed or removed.
  select b.id
  into v_existing_booking_id
  from public.bookings b
  where b.user_id = v_user_id
    and b.schedule_id = p_schedule_id
    and b.status = 'CONFIRMED'
  order by b.created_at asc, b.id asc
  limit 1;


  if v_existing_booking_id is not null then
    raise exception 'DUPLICATE_BOOKING';
  end if;


  -- Only OPEN schedules are bookable.
  -- FULL keeps the canonical capacity-specific error.
  if v_schedule_status = 'FULL' then
    raise exception 'CAPACITY_FULL';
  elsif v_schedule_status is distinct from 'OPEN' then
    raise exception 'INVALID_STATE';
  end if;


  -- Existing capacity accounting is preserved.
  --
  -- Historical duplicate rows still count toward capacity because
  -- no existing records are automatically deleted, cancelled,
  -- merged, or rewritten.
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
