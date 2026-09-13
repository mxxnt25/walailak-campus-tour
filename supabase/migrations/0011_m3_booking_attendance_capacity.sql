-- =========================================================
-- M3 — Booking / Capacity / Attendance Model
-- Source of Truth v1.2
--
-- Depends on M1 v1.2 role/account migrations:
--   current_user_role()
--   is_active_user()
--
-- M3 owns:
--   - booking creation
--   - capacity safety
--   - cancellation capacity restoration
--   - attendance fields in booking model
--   - public capacity read contract
--
-- M4 owns:
--   - manifest authorization
--   - attendance RPC authorization
--   - Complete Tour orchestration
-- =========================================================


-- =========================================================
-- 1. Attendance fields
-- V1 attendance is group-level: one booking = one group.
-- =========================================================

alter table public.bookings
  add column if not exists attendance_status text
  not null default 'NOT_CHECKED_IN';

alter table public.bookings
  add column if not exists checked_in_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_attendance_status_check;

alter table public.bookings
  add constraint bookings_attendance_status_check
  check (
    attendance_status in (
      'NOT_CHECKED_IN',
      'CHECKED_IN',
      'NO_SHOW'
    )
  );


-- =========================================================
-- 2. Disable direct MEMBER booking creation/update.
--
-- Booking creation must go through book_tour_safe().
-- Cancellation must go through cancel_booking_safe().
--
-- No ordinary client role keeps direct booking update access.
-- GUIDE / ADMIN / SUPER_ADMIN operational mutations must use
-- trusted SECURITY DEFINER operations with their own
-- authorization checks.
-- =========================================================

drop policy if exists "bookings own insert"
on public.bookings;

drop policy if exists "bookings own update"
on public.bookings;

-- No ordinary client role receives direct booking UPDATE access here.
-- MEMBER cancellation uses cancel_booking_safe().
-- GUIDE / ADMIN / SUPER_ADMIN operational mutations are performed
-- only through trusted SECURITY DEFINER operations with their own
-- authorization checks.

drop policy if exists "bookings admin operational update"
on public.bookings;


-- =========================================================
-- 3. Booking update protection
--
-- MEMBER:
--   no ordinary direct booking mutation.
--   cancellation is allowed only through cancel_booking_safe().
--
-- GUIDE:
--   may be changed by M4 trusted attendance / Complete Tour
--   operations. Direct Guide update remains blocked by RLS.
--
-- ADMIN / SUPER_ADMIN:
--   operational access.
-- =========================================================

create or replace function public.protect_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  -- ADMIN / SUPER_ADMIN operational override.
  if public.is_admin() then
    return new;
  end if;


  if auth.uid() is null then
    raise exception 'BOOKING_UPDATE_FORBIDDEN';
  end if;


  -- -------------------------------------------------------
  -- MEMBER cancellation path.
  --
  -- cancel_booking_safe() sets this transaction-local flag.
  -- A normal direct client UPDATE cannot use this path.
  -- -------------------------------------------------------

  if auth.uid() = old.user_id then

    if current_setting(
         'app.m3_trusted_cancel',
         true
       ) = 'on'
       and old.status = 'CONFIRMED'
       and new.status = 'CANCELLED'
       and new.user_id is not distinct from old.user_id
       and new.schedule_id is not distinct from old.schedule_id
       and new.participant_count is not distinct from old.participant_count
       and new.attendance_status is not distinct from old.attendance_status
       and new.checked_in_at is not distinct from old.checked_in_at then

      return new;

    end if;

    raise exception 'BOOKING_UPDATE_FORBIDDEN';

  end if;


  -- -------------------------------------------------------
  -- GUIDE trusted-operation compatibility.
  --
  -- M4 RPC must still verify that the Guide is authorized
  -- for the specific tour.
  --
  -- Direct Guide UPDATE is not granted by RLS.
  -- -------------------------------------------------------

  if public.is_guide() then

    if new.user_id is distinct from old.user_id
       or new.schedule_id is distinct from old.schedule_id
       or new.participant_count is distinct from old.participant_count
       or new.special_request is distinct from old.special_request then

      raise exception 'BOOKING_IMMUTABLE_FIELDS';

    end if;


    -- Complete Tour may transition:
    -- CONFIRMED -> COMPLETED
    if new.status is distinct from old.status
       and not (
         old.status = 'CONFIRMED'
         and new.status = 'COMPLETED'
       ) then

      raise exception 'BOOKING_STATUS_FORBIDDEN';

    end if;


    return new;

  end if;


  raise exception 'BOOKING_UPDATE_FORBIDDEN';

end;
$$;


drop trigger if exists trg_protect_booking_update
on public.bookings;

create trigger trg_protect_booking_update
before update on public.bookings
for each row
execute function public.protect_booking_update();


-- =========================================================
-- 4. Transaction-safe MEMBER booking
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
  v_current_booked integer;
  v_new_booking_id uuid;
begin

  -- Authentication
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;


  -- v1.2: only active MEMBER may book.
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


  -- Lock schedule row to prevent concurrent overbooking.
  select
    status,
    max_participants
  into
    v_schedule_status,
    v_max_participants
  from public.tour_schedules
  where id = p_schedule_id
  for update;


  if not found then
    raise exception 'NOT_FOUND';
  end if;


  -- Only OPEN schedules are bookable.
  -- FULL has a canonical capacity-specific error.
  if v_schedule_status = 'FULL' then
    raise exception 'CAPACITY_FULL';
  elsif v_schedule_status is distinct from 'OPEN' then
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


-- =========================================================
-- 5. Transaction-safe MEMBER cancellation
-- =========================================================

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

  v_user_id := auth.uid();


  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;


  -- v1.2: only active MEMBER owns the Member cancellation flow.
  if public.current_user_role() is distinct from 'MEMBER'
     or not public.is_active_user() then

    raise exception 'FORBIDDEN';

  end if;


  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;


  if not found then
    raise exception 'NOT_FOUND';
  end if;


  if v_booking.user_id <> v_user_id then
    raise exception 'FORBIDDEN';
  end if;


  if v_booking.status <> 'CONFIRMED' then
    raise exception 'INVALID_STATE';
  end if;


  select *
  into v_schedule
  from public.tour_schedules
  where id = v_booking.schedule_id
  for update;


  if not found then
    raise exception 'NOT_FOUND';
  end if;


  -- Allow this specific transaction-safe cancellation through
  -- the booking protection trigger.
  perform set_config(
    'app.m3_trusted_cancel',
    'on',
    true
  );


  update public.bookings
  set
    status = 'CANCELLED',
    updated_at = now()
  where id = p_booking_id
  returning * into v_booking;


  select coalesce(sum(participant_count), 0)
  into v_current_booked
  from public.bookings
  where schedule_id = v_booking.schedule_id
    and status in ('CONFIRMED', 'COMPLETED');


  -- Cancellation only automatically reopens FULL.
  -- CLOSED / CANCELLED / COMPLETED schedules remain unchanged.
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


revoke all
on function public.cancel_booking_safe(uuid)
from public;

grant execute
on function public.cancel_booking_safe(uuid)
to authenticated;


-- =========================================================
-- 6. Public capacity read contract
--
-- Returns:
-- max / booked / remaining / status concepts required by v1.2.
-- =========================================================

create or replace function public.get_schedule_capacity(
  p_schedule_id uuid
)
returns table (
  schedule_id uuid,
  max_participants integer,
  booked_participants integer,
  remaining_seats integer,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_schedule public.tour_schedules%rowtype;
  v_booked integer;
begin

  select *
  into v_schedule
  from public.tour_schedules
  where id = p_schedule_id;


  if not found then
    raise exception 'NOT_FOUND';
  end if;


  select coalesce(sum(b.participant_count), 0)::integer
  into v_booked
  from public.bookings b
  where b.schedule_id = p_schedule_id
    and b.status in ('CONFIRMED', 'COMPLETED');


  return query
  select
    v_schedule.id,
    v_schedule.max_participants,
    v_booked,
    greatest(
      v_schedule.max_participants - v_booked,
      0
    ),
    v_schedule.status;

end;
$$;


revoke all
on function public.get_schedule_capacity(uuid)
from public;

grant execute
on function public.get_schedule_capacity(uuid)
to anon, authenticated;
