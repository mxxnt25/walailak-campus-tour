# M3 Booking Verification / Recovery Note

## Scope

This note covers M3 Final Fix work for:

- D1 / BOOK-03 Option A
- D4 derived expiry
- `0020_m3_booking_temporal_guard.sql`
- `0021_m3_booking_duplicate_temporal_guard.sql`
- Booking UI duplicate handling
- Role-aware RouteDetail booking CTA
- Live expiry behavior

## Current runtime status

Database/RPC verification: **NOT RUN**

Do not report the SQL token check, ESLint, build, or `git diff --check`
as database runtime evidence.

The following static checks have been run on the M3 branch:

- targeted ESLint: PASS
- Vite production build: PASS
- `git diff --check`: PASS
- SQL suspicious-token/static checks: PASS

Integration/deployment/Final QA status is not implied by those results.

## Expected policy

### BOOK-03

One MEMBER may have at most one `CONFIRMED` booking for one schedule.

`participant_count` is the group size.

`CANCELLED` does not block a new booking when the schedule is still
otherwise bookable.

Historical duplicate bookings are preserved. They must not be
automatically deleted, cancelled, merged, or rewritten.

Historical rows continue to participate in the existing capacity
accounting rules.

### D4

Expiry is derived from:

`tour_date + start_time`

compared with database wall-clock time in:

`Asia/Bangkok`

No cron, automatic CLOSED transition, or new lifecycle enum is added.

`0021` intentionally checks `clock_timestamp()` only after obtaining the
schedule row lock so a request that waits across the deadline cannot book.

## Migration ordering

Expected M3 sequence:

1. `0020_m3_booking_temporal_guard.sql`
2. `0021_m3_booking_duplicate_temporal_guard.sql`

Do not edit either historical migration after it has been accepted into
integration.

Before integration, migration numbering must still be checked against the
latest remote branches.

## Rollback / recovery principle

Use forward recovery.

Do not delete or rewrite an already-applied historical migration.

If `0021` must be backed out after deployment, create a new migration that
`CREATE OR REPLACE`s `public.book_tour_safe` with the last accepted function
definition.

If only the UI/service change must be backed out after integration, use a
normal Git revert commit. Do not rewrite shared integration history.

## Data recovery

`0020` and `0021` redefine the booking RPC. They are not intended to
rewrite existing booking rows.

BOOK-03 enforcement applies to new booking attempts.

If legacy duplicate `CONFIRMED` bookings are found:

1. report them,
2. preserve them,
3. preserve their contribution to capacity,
4. do not automatically delete/cancel/merge them.

The read-only report is included in:

`docs/m3-verification/M3-BOOKING-VERIFICATION.sql`

## Verification fixture cleanup

The verification draft uses schedule UUIDs ending in:

- `d301`
- `d302`
- `d303`
- `d304`
- `d305`
- `d306`
- `d307`

Only in a team-approved TEST database, cleanup order is:

1. delete verification bookings for those schedule IDs,
2. delete verification schedules for those IDs.

The cleanup SQL is included at the end of the verification file.

## Required runtime evidence before Final QA

Record the real result of each case:

| Case | Required result | Current status |
| --- | --- | --- |
| Before start time | booking succeeds when other rules pass | NOT RUN |
| At/start boundary | `INVALID_STATE` | NOT RUN |
| After start time | `INVALID_STATE` | NOT RUN |
| Wait on row lock across deadline | `INVALID_STATE` after lock release | NOT RUN |
| Normal duplicate | second request gets `DUPLICATE_BOOKING` | NOT RUN |
| Concurrent duplicate | only one CONFIRMED booking is created | NOT RUN |
| Cancel then rebook | capacity restores and rebook succeeds if still eligible | NOT RUN |
| Exact capacity | booking succeeds and schedule becomes FULL | NOT RUN |
| Concurrent overbooking | second incompatible request gets `CAPACITY_FULL` | NOT RUN |
| Active MEMBER authorization | allowed | NOT RUN |
| Non-MEMBER/inactive authorization | rejected | NOT RUN |
| Client service contract | `{ success, data, error }` preserved | static review only |

## Integration note

M3 must not cherry-pick or merge M1/M5/M6 branches independently.

Review components owned by M6 remain an integration dependency and are not
implemented by M3 in this work.

## M2 Additional Verification Cases

| Case | Expected result | Status |
| --- | --- | --- |
| GUIDE booking | `FORBIDDEN` | NOT RUN |
| ADMIN booking | `FORBIDDEN` | NOT RUN |
| SUPER_ADMIN booking | `FORBIDDEN` | NOT RUN |
| Inactive MEMBER booking | `FORBIDDEN` | NOT RUN |
| Exact deadline boundary | `INVALID_STATE` | NOT RUN |
| Clearly after deadline | `INVALID_STATE` | NOT RUN |
| FULL -> cancel | capacity restored | NOT RUN |
| FULL -> cancel -> rebook while eligible | succeeds | NOT RUN |
| FULL -> cancel -> rebook after deadline | `INVALID_STATE` | NOT RUN |

DB/RPC runtime verification remains **NOT RUN** because the team uses one shared Supabase project.
M3 must coordinate approved test data and a test window before executing verification SQL that changes shared data.

## Guest Login Return Verification

RouteDetail now passes `state.from.pathname` to Login.
Expected flow: Guest -> RouteDetail -> Login -> successful login -> original RouteDetail.
Manual runtime result: PASS — Guest -> RouteDetail -> Login -> successful login -> original RouteDetail.
