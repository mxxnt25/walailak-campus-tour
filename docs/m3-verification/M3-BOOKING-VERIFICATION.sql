-- =========================================================
-- M3 Booking Verification
-- BOOK-03 Option A + D4 Derived Expiry
--
-- STATUS: NOT RUN
--
-- IMPORTANT:
-- - Draft verification only.
-- - Do NOT place this file in supabase/migrations.
-- - Run only in a team-approved TEST database/project.
-- - Do NOT run against production data.
-- - 0020 and 0021 must already be applied before runtime testing.
-- - Run expected-error test sections individually if the SQL client
--   stops execution after an expected RPC exception.
--
-- Required existing data:
--   1. One valid route UUID.
--   2. Two different ACTIVE MEMBER profile UUIDs.
--
-- Replace the NULL values in m3_verify_config before running.
-- =========================================================


-- =========================================================
-- 0. CONFIGURATION
-- =========================================================

create temporary table if not exists m3_verify_config (
  route_id uuid,
  member_a uuid,
  member_b uuid
);

delete from m3_verify_config;

insert into m3_verify_config (
  route_id,
  member_a,
  member_b
)
values (
  null,
  null,
  null
);

do $$
begin
  if exists (
    select 1
    from m3_verify_config
    where route_id is null
       or member_a is null
       or member_b is null
       or member_a = member_b
  ) then
    raise exception
      'SET route_id, member_a, and a different member_b before testing';
  end if;
end;
$$;


-- =========================================================
-- 1. AUTH TEST HELPER
-- =========================================================
--
-- Supabase RPC authorization still uses auth.uid().
-- This helper sets a test JWT subject for the SQL session.
--
-- Verify after setting:
--
--   select
--     auth.uid(),
--     public.current_user_role(),
--     public.is_active_user();
--
-- Expected:
--   current_user_role = MEMBER
--   is_active_user = true
-- =========================================================

create or replace function pg_temp.m3_set_auth(
  p_user_id uuid
)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    p_user_id::text,
    false
  );

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_user_id,
      'role', 'authenticated'
    )::text,
    false
  );
end;
$$;


-- =========================================================
-- 2. FIXTURE IDS
-- =========================================================
--
-- These deterministic UUIDs are reserved only for this M3
-- verification draft.
--
-- d301 = before deadline
-- d302 = at/past deadline
-- d303 = duplicate/concurrent duplicate
-- d304 = cancel -> rebook
-- d305 = exact capacity -> FULL
-- d306 = concurrent overbooking
-- d307 = wait-on-lock across deadline
-- =========================================================


-- =========================================================
-- 3. CLEAN PREVIOUS TEST FIXTURES
-- =========================================================

delete from public.bookings
where schedule_id in (
  '00000000-0000-4000-8000-00000000d301',
  '00000000-0000-4000-8000-00000000d302',
  '00000000-0000-4000-8000-00000000d303',
  '00000000-0000-4000-8000-00000000d304',
  '00000000-0000-4000-8000-00000000d305',
  '00000000-0000-4000-8000-00000000d306',
  '00000000-0000-4000-8000-00000000d307'
);

delete from public.tour_schedules
where id in (
  '00000000-0000-4000-8000-00000000d301',
  '00000000-0000-4000-8000-00000000d302',
  '00000000-0000-4000-8000-00000000d303',
  '00000000-0000-4000-8000-00000000d304',
  '00000000-0000-4000-8000-00000000d305',
  '00000000-0000-4000-8000-00000000d306',
  '00000000-0000-4000-8000-00000000d307'
);


-- =========================================================
-- 4. CREATE STANDARD FIXTURES
-- =========================================================

insert into public.tour_schedules (
  id,
  route_id,
  tour_date,
  start_time,
  end_time,
  max_participants,
  status
)
select
  fixture.id,
  cfg.route_id,
  fixture.tour_date,
  fixture.start_time,
  fixture.end_time,
  fixture.max_participants,
  'OPEN'
from m3_verify_config cfg
cross join lateral (
  values
    (
      '00000000-0000-4000-8000-00000000d301'::uuid,
      ((clock_timestamp() at time zone 'Asia/Bangkok')::date + 1),
      time '12:00:00',
      time '13:00:00',
      5
    ),
    (
      '00000000-0000-4000-8000-00000000d303'::uuid,
      ((clock_timestamp() at time zone 'Asia/Bangkok')::date + 1),
      time '13:00:00',
      time '14:00:00',
      5
    ),
    (
      '00000000-0000-4000-8000-00000000d304'::uuid,
      ((clock_timestamp() at time zone 'Asia/Bangkok')::date + 1),
      time '14:00:00',
      time '15:00:00',
      3
    ),
    (
      '00000000-0000-4000-8000-00000000d305'::uuid,
      ((clock_timestamp() at time zone 'Asia/Bangkok')::date + 1),
      time '15:00:00',
      time '16:00:00',
      2
    ),
    (
      '00000000-0000-4000-8000-00000000d306'::uuid,
      ((clock_timestamp() at time zone 'Asia/Bangkok')::date + 1),
      time '16:00:00',
      time '17:00:00',
      1
    )
) as fixture(
  id,
  tour_date,
  start_time,
  end_time,
  max_participants
);


-- =========================================================
-- TEST A
-- BEFORE DEADLINE: SHOULD SUCCEED
-- Runtime status: NOT RUN
-- =========================================================

begin;

select pg_temp.m3_set_auth(member_a)
from m3_verify_config;

select
  auth.uid(),
  public.current_user_role(),
  public.is_active_user();

select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d301',
  1,
  'M3_VERIFY_BEFORE_DEADLINE'
);

select *
from public.get_schedule_capacity(
  '00000000-0000-4000-8000-00000000d301'
);

rollback;

-- Expected:
-- - book_tour_safe returns a UUID.
-- - status remains OPEN.
-- - booked_participants = 1.
-- - remaining_seats = 4.


-- =========================================================
-- TEST B
-- AT / AFTER START TIME: SHOULD REJECT INVALID_STATE
-- Runtime status: NOT RUN
-- =========================================================
--
-- This creates a schedule whose start time is the database
-- current Bangkok second. By the time the RPC checks its
-- deadline, clock_timestamp() is equal to or later than it.
--
-- The predicate under test is:
--
--   schedule_start <= clock_timestamp()
--
-- =========================================================

delete from public.bookings
where schedule_id =
  '00000000-0000-4000-8000-00000000d302';

delete from public.tour_schedules
where id =
  '00000000-0000-4000-8000-00000000d302';

insert into public.tour_schedules (
  id,
  route_id,
  tour_date,
  start_time,
  end_time,
  max_participants,
  status
)
select
  '00000000-0000-4000-8000-00000000d302',
  route_id,
  (clock_timestamp() at time zone 'Asia/Bangkok')::date,
  date_trunc(
    'second',
    clock_timestamp() at time zone 'Asia/Bangkok'
  )::time,
  (
    (clock_timestamp() at time zone 'Asia/Bangkok')
    + interval '1 hour'
  )::time(0),
  5,
  'OPEN'
from m3_verify_config;

select pg_temp.m3_set_auth(member_a)
from m3_verify_config;

-- EXPECTED ERROR:
-- INVALID_STATE
select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d302',
  1,
  'M3_VERIFY_DEADLINE'
);


-- =========================================================
-- TEST C
-- NORMAL DUPLICATE: SECOND CONFIRMED MUST FAIL
-- Runtime status: NOT RUN
-- =========================================================

select pg_temp.m3_set_auth(member_a)
from m3_verify_config;

select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d303',
  1,
  'M3_VERIFY_DUPLICATE_FIRST'
);

-- EXPECTED ERROR:
-- DUPLICATE_BOOKING
select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d303',
  1,
  'M3_VERIFY_DUPLICATE_SECOND'
);

select
  user_id,
  schedule_id,
  status,
  count(*) as confirmed_rows
from public.bookings
where schedule_id =
  '00000000-0000-4000-8000-00000000d303'
  and status = 'CONFIRMED'
group by user_id, schedule_id, status;

-- Expected confirmed_rows for member A = 1.

-- Isolate the later concurrent-duplicate test.
-- Only deterministic verification data is removed here.
delete from public.bookings
where schedule_id =
  '00000000-0000-4000-8000-00000000d303';


-- =========================================================
-- TEST D
-- CANCEL -> CAPACITY RESTORED -> REBOOK
-- Runtime status: NOT RUN
-- =========================================================

begin;

select pg_temp.m3_set_auth(member_a)
from m3_verify_config;

create temporary table m3_cancel_booking_id
on commit drop
as
select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d304',
  2,
  'M3_VERIFY_CANCEL_REBOOK'
) as booking_id;

select *
from public.get_schedule_capacity(
  '00000000-0000-4000-8000-00000000d304'
);

select public.cancel_booking_safe(booking_id)
from m3_cancel_booking_id;

select *
from public.get_schedule_capacity(
  '00000000-0000-4000-8000-00000000d304'
);

select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d304',
  1,
  'M3_VERIFY_REBOOK_AFTER_CANCEL'
);

select *
from public.get_schedule_capacity(
  '00000000-0000-4000-8000-00000000d304'
);

rollback;

-- Expected:
-- - First booking succeeds.
-- - Cancellation changes the booking to CANCELLED.
-- - Capacity is restored.
-- - CANCELLED does not trigger DUPLICATE_BOOKING.
-- - Rebooking succeeds because deadline is still future.


-- =========================================================
-- TEST E
-- EXACT CAPACITY -> SCHEDULE FULL
-- Runtime status: NOT RUN
-- =========================================================

begin;

select pg_temp.m3_set_auth(member_a)
from m3_verify_config;

select public.book_tour_safe(
  '00000000-0000-4000-8000-00000000d305',
  2,
  'M3_VERIFY_EXACT_FULL'
);

select
  id,
  status,
  max_participants
from public.tour_schedules
where id =
  '00000000-0000-4000-8000-00000000d305';

select *
from public.get_schedule_capacity(
  '00000000-0000-4000-8000-00000000d305'
);

rollback;

-- Expected:
-- - booking succeeds.
-- - schedule status becomes FULL.
-- - remaining_seats = 0.
-- - no overbooking occurs.


-- =========================================================
-- TEST F
-- CONCURRENT DUPLICATE
-- TWO SQL SESSIONS REQUIRED
-- Runtime status: NOT RUN
-- =========================================================
--
-- Both sessions must use the SAME MEMBER A.
--
-- Session A:
--
--   select set_config(
--     'request.jwt.claim.sub',
--     '<MEMBER_A_UUID>',
--     false
--   );
--
--   select set_config(
--     'request.jwt.claims',
--     jsonb_build_object(
--       'sub', '<MEMBER_A_UUID>',
--       'role', 'authenticated'
--     )::text,
--     false
--   );
--
--   begin;
--
--   select id
--   from public.tour_schedules
--   where id =
--     '00000000-0000-4000-8000-00000000d303'
--   for update;
--
--   select public.book_tour_safe(
--     '00000000-0000-4000-8000-00000000d303',
--     1,
--     'M3_CONCURRENT_DUP_A'
--   );
--
--   -- DO NOT COMMIT YET.
--
--
-- Session B:
--
--   set the same MEMBER A auth claims, then:
--
--   select public.book_tour_safe(
--     '00000000-0000-4000-8000-00000000d303',
--     1,
--     'M3_CONCURRENT_DUP_B'
--   );
--
-- Session B should wait on the schedule row lock.
--
-- Then Session A:
--
--   commit;
--
-- Expected:
-- - Session A succeeds.
-- - Session B resumes and gets DUPLICATE_BOOKING.
-- - only one CONFIRMED booking exists for MEMBER A/schedule.


-- =========================================================
-- TEST G
-- CONCURRENT OVERBOOKING PROTECTION
-- TWO SQL SESSIONS REQUIRED
-- Runtime status: NOT RUN
-- =========================================================
--
-- Fixture d306 has max_participants = 1.
-- Session A uses MEMBER A.
-- Session B uses a DIFFERENT MEMBER B.
--
-- Session A:
--
--   set MEMBER A auth claims.
--
--   begin;
--
--   select id
--   from public.tour_schedules
--   where id =
--     '00000000-0000-4000-8000-00000000d306'
--   for update;
--
--   select public.book_tour_safe(
--     '00000000-0000-4000-8000-00000000d306',
--     1,
--     'M3_OVERBOOK_A'
--   );
--
--   -- KEEP TRANSACTION OPEN.
--
--
-- Session B:
--
--   set MEMBER B auth claims.
--
--   select public.book_tour_safe(
--     '00000000-0000-4000-8000-00000000d306',
--     1,
--     'M3_OVERBOOK_B'
--   );
--
-- Session B should wait.
--
-- Then Session A:
--
--   commit;
--
-- Expected:
-- - Session A succeeds.
-- - schedule becomes FULL.
-- - Session B receives CAPACITY_FULL.
-- - confirmed participant total remains exactly 1.


-- =========================================================
-- TEST H
-- WAIT ON ROW LOCK UNTIL DEADLINE PASSES
-- TWO SQL SESSIONS REQUIRED
-- Runtime status: NOT RUN
-- =========================================================
--
-- Purpose:
-- Prove 0021 uses clock_timestamp() AFTER obtaining the lock,
-- rather than transaction-start now().
--
-- First prepare a schedule roughly 60 seconds in the future.
-- Run this setup and COMMIT before opening the two test sessions.
-- =========================================================

delete from public.bookings
where schedule_id =
  '00000000-0000-4000-8000-00000000d307';

delete from public.tour_schedules
where id =
  '00000000-0000-4000-8000-00000000d307';

insert into public.tour_schedules (
  id,
  route_id,
  tour_date,
  start_time,
  end_time,
  max_participants,
  status
)
select
  '00000000-0000-4000-8000-00000000d307',
  cfg.route_id,
  target.start_at::date,
  target.start_at::time,
  (target.start_at + interval '1 hour')::time,
  5,
  'OPEN'
from m3_verify_config cfg
cross join lateral (
  select
    (
      clock_timestamp()
      at time zone 'Asia/Bangkok'
      + interval '60 seconds'
    ) as start_at
) target;

-- Session A, before deadline:
--
--   begin;
--
--   select id
--   from public.tour_schedules
--   where id =
--     '00000000-0000-4000-8000-00000000d307'
--   for update;
--
--   -- Keep this transaction open until AFTER start_time.
--
--
-- Session B, also started BEFORE the deadline:
--
--   set MEMBER A auth claims.
--
--   select public.book_tour_safe(
--     '00000000-0000-4000-8000-00000000d307',
--     1,
--     'M3_LOCK_CROSS_DEADLINE'
--   );
--
-- Session B must block on Session A's row lock.
--
-- AFTER d307 start_time has passed:
--
-- Session A:
--
--   commit;
--
-- Expected:
-- - Session B resumes.
-- - RPC re-checks clock_timestamp() after lock acquisition.
-- - Session B receives INVALID_STATE.
-- - no CONFIRMED booking is created.


-- =========================================================
-- TEST I
-- LEGACY DUPLICATE REPORT ONLY
-- DO NOT MODIFY OLD DATA
-- Runtime status: safe read-only query
-- =========================================================

select
  user_id,
  schedule_id,
  count(*) as confirmed_booking_count,
  sum(participant_count) as confirmed_participants,
  array_agg(id order by created_at, id) as booking_ids
from public.bookings
where status = 'CONFIRMED'
group by user_id, schedule_id
having count(*) > 1
order by confirmed_booking_count desc;

-- Requirement:
-- Report legacy duplicates separately.
-- Do NOT delete, cancel, merge, or rewrite them automatically.


-- =========================================================
-- TEST J
-- SERVICE CONTRACT
-- =========================================================
--
-- Runtime DB status: NOT RUN
--
-- Client contract remains:
--
--   {
--     success,
--     data,
--     error
--   }
--
-- createBooking maps:
-- - AUTH_REQUIRED
-- - NOT_FOUND
-- - CAPACITY_FULL
-- - FORBIDDEN
-- - DUPLICATE_BOOKING
-- - INVALID_STATE
-- - VALIDATION_ERROR
-- - DATABASE_ERROR
--
-- Static verification is performed by lint/build/diff-check.
-- UI tests must still be recorded separately if executed.


-- =========================================================
-- FINAL CLEANUP
-- Run after TEST database verification.
-- =========================================================

delete from public.bookings
where schedule_id in (
  '00000000-0000-4000-8000-00000000d301',
  '00000000-0000-4000-8000-00000000d302',
  '00000000-0000-4000-8000-00000000d303',
  '00000000-0000-4000-8000-00000000d304',
  '00000000-0000-4000-8000-00000000d305',
  '00000000-0000-4000-8000-00000000d306',
  '00000000-0000-4000-8000-00000000d307'
);

delete from public.tour_schedules
where id in (
  '00000000-0000-4000-8000-00000000d301',
  '00000000-0000-4000-8000-00000000d302',
  '00000000-0000-4000-8000-00000000d303',
  '00000000-0000-4000-8000-00000000d304',
  '00000000-0000-4000-8000-00000000d305',
  '00000000-0000-4000-8000-00000000d306',
  '00000000-0000-4000-8000-00000000d307'
);

-- =========================================================
-- M2 ADDITIONAL VERIFICATION
-- Runtime status: NOT RUN
-- Shared Supabase project: coordinate test window first.
-- =========================================================

-- TEST K — AUTHORIZATION REJECTION
-- Active MEMBER success is covered by TEST A.
--
-- Repeat book_tour_safe() with test users whose effective roles are:
--   GUIDE
--   ADMIN
--   SUPER_ADMIN
--   inactive MEMBER
--
-- Expected for every case:
--   FORBIDDEN
--
-- Runtime status: NOT RUN


-- TEST L — EXACT DEADLINE BOUNDARY
--
-- This case must be recorded separately from "already started".
-- Prepare an OPEN schedule whose stored:
--
--   tour_date + start_time
--
-- equals the database Bangkok wall-clock boundary being tested.
--
-- Invoke book_tour_safe() at that boundary.
--
-- Expected:
--   INVALID_STATE
--
-- Predicate being verified:
--
--   (tour_date + start_time)
--     <= (
--       clock_timestamp()
--       at time zone 'Asia/Bangkok'
--     )
--
-- Runtime status: NOT RUN


-- TEST M — CLEARLY AFTER DEADLINE
--
-- Prepare an OPEN schedule whose start time is already in the past.
--
-- Expected:
--   INVALID_STATE
--
-- This evidence must be reported separately from TEST L.
--
-- Runtime status: NOT RUN

-- =========================================================
-- TEST N — FULL -> CANCEL -> RESTORE -> REBOOK WHILE ELIGIBLE
-- =========================================================
--
-- Setup:
-- 1. OPEN future schedule
-- 2. max_participants = 1
-- 3. active MEMBER books participant_count = 1
--
-- Expected after booking:
--   schedule status = FULL
--   remaining_seats = 0
--
-- Cancel the CONFIRMED booking through cancel_booking_safe().
--
-- Expected after cancellation:
--   booking status = CANCELLED
--   capacity is restored
--   schedule returns to OPEN when existing cancellation rules permit
--
-- Rebook before tour_date + start_time.
--
-- Expected:
--   booking succeeds
--   CANCELLED does not trigger DUPLICATE_BOOKING
--   schedule becomes FULL again
--
-- Runtime status: NOT RUN


-- =========================================================
-- TEST O — FULL -> CANCEL -> RESTORE -> REBOOK AFTER DEADLINE
-- =========================================================
--
-- Setup the same FULL -> cancellation flow.
--
-- Confirm capacity is restored first.
-- Then test when database Bangkok time has reached/passed:
--
--   tour_date + start_time
--
-- Attempt to rebook.
--
-- Expected:
--   INVALID_STATE
--
-- Important:
-- cancellation restoring capacity does NOT override D4 expiry.
--
-- Runtime status: NOT RUN
