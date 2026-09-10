-- M3 Tour Booking
-- Transaction-safe booking cancellation.
-- Cancels an owned CONFIRMED booking and reopens a FULL schedule
-- when cancellation creates available capacity.

create or replace function public.cancel_booking_safe(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
  v_schedule public.tour_schedules%rowtype;
  v_current_booked integer;
begin
  -- 1. Authentication
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- 2. Lock booking so concurrent cancellation cannot modify it twice
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- 3. Only the booking owner may cancel it
  if v_booking.user_id <> v_user_id then
    raise exception 'FORBIDDEN';
  end if;

  -- 4. Only CONFIRMED bookings may be cancelled
  if v_booking.status <> 'CONFIRMED' then
    raise exception 'VALIDATION_ERROR';
  end if;

  -- 5. Lock related schedule while capacity is being changed
  select *
  into v_schedule
  from public.tour_schedules
  where id = v_booking.schedule_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- 6. Cancel booking
  update public.bookings
  set
    status = 'CANCELLED',
    updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  -- 7. Recalculate occupied capacity after cancellation
  select coalesce(sum(participant_count), 0)
  into v_current_booked
  from public.bookings
  where schedule_id = v_booking.schedule_id
    and status in ('CONFIRMED', 'COMPLETED');

  -- 8. If the schedule was FULL and now has capacity, reopen it
  if v_schedule.status = 'FULL'
     and v_current_booked < v_schedule.max_participants then

    update public.tour_schedules
    set
      status = 'OPEN',
      updated_at = now()
    where id = v_schedule.id;

  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.cancel_booking_safe(uuid) from public;
grant execute on function public.cancel_booking_safe(uuid) to authenticated;
