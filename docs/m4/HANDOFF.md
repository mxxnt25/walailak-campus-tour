# M4 handoff — implementation ready for review, not final sign-off

Date: 2026-09-22
Working branch name: `fix/final-m4-schedule-guide-route-admin` (local only; no remote branch pushed).
Input: supplied `walailak-campus-tour-fix-integration-final.zip`.
Remote `fix/integration-final` verified at `63363e73a4540c47a95500c7c6ac2612b06a8f16` using git ls-remote and fetch.
Input source matches fetched tree; ZIP represents `test-clone` as an empty directory while Git has a gitlink. No changes to it.
Migrations `0018` and `0019` absent from the previously fetched baseline. The D3-turn remote refresh returned HTTP 502, so current remote numbering could not be reverified. Recheck shared integration branch before merge, because other members may reserve it.

## Changes

- SCHED-01/02: frontend and PostgreSQL reject past/exact-start schedules, missing/reversed/equal end times and invalid capacity. Bangkok timezone is explicit.
- SCHED-03: public schedule service filters rounds at/past start, even OPEN; additive booking insert trigger rejects expired/invalid rounds without replacing M3 booking RPC or changing stored OPEN status. Admin can still see expired records, marked unavailable.
- GUIDE-01: assignment/accept and schedule time edits check conflicts. A shared transaction advisory lock serializes relevant RPCs and time edits. Existing assignment-per-schedule uniqueness, authorization, audit and response types remain.
- GUIDE-02: accepting/assigning requires valid future OPEN/FULL/CLOSED round and active guide. Decline preserves the existing own-ASSIGNED rule; NULL status rejected explicitly.
- Route CRUD: retained name/duration/status validation; coordinate and image URL checks; editable stop draft; reorder/remove; prevents saving while a stop draft is unfinished; failed stop loading blocks overwrite.
- Stops replaced in one admin-only PostgreSQL RPC transaction with parent route lock. Invalid inputs or insertion failure leave original rows intact. RPC returns the same list concept through `{success,data,error}`.
- Custom modal/confirm and inline feedback replace native alert/confirm in owned flows. Browser `<dialog>` supports focus containment/Escape/focus restoration. Async actions disabled during save. Thai date/status adapter shared only inside M4; existing common design tokens/buttons reused.
- Admin shows all schedule statuses and handles both array/object assignment relation shapes. Tour detail loads schedule metadata and disables controls in invalid lifecycle states, with immediate completion restored by 0020 per the latest user instruction.
- Error messages in changed services are sanitized. No raw database messages displayed in owned screens.

## Files changed

Existing files:
- `src/pages/admin/Schedules.jsx`
- `src/pages/admin/AdminRoutes.jsx`
- `src/pages/admin/RouteCreate.jsx`
- `src/pages/admin/RouteEdit.jsx`
- `src/pages/guide/Dashboard.jsx`
- `src/pages/guide/TourDetail.jsx`
- `src/services/scheduleService.js`
- `src/services/assignmentService.js`
- `src/services/routeService.js`

New code:
- `src/components/m4/Feedback.jsx`, `Field.jsx`
- `src/services/m4/rules.js`, `response.js`
- `supabase/migrations/0018_m4_schedule_route_safety.sql`
- `supabase/migrations/0019_m4_completion_after_end.sql` (historical)
- `supabase/migrations/0020_m4_restore_immediate_completion.sql` (current update)
- M4 tests and handoff documents

No changes to App.jsx, RoleGuard, auth/profile files, public RouteDetail, CampusMap, package.json/package-lock.json, shared common components, or historical migrations 0001–0017.

## Database objects / authorization

New trigger functions: m4_schedule_edit_lock, m4_validate_schedule, m4_guard_booking_time, m4_guard_assignment.
New RPC: m4_replace_route_stops(uuid,jsonb), authenticated execution only; independently checks auth.uid and is_admin.
Replaced RPC definitions: assign_guide, update_my_assignment_status (preserve baseline body and insert lock/null guard); complete_tour via 0020 (same authorization/lifecycle/audit as baseline; no time guard). The helper and trigger introduced by 0019 are removed by 0020.
Trigger functions are revoked from public/anon/authenticated. All new/replaced definer functions set search_path public,pg_temp. Existing RLS unchanged.
No destructive cleanup or historical record migration.

## Tests and evidence

| Test | Result | Evidence / limitations |
|---|---|---|
| Production build | PASS | build-results.txt; existing large-bundle warning remains |
| ESLint owned files | PASS | lint-owned-results.txt; exit 0 |
| Full ESLint | FAIL outside M4 | lint-full-results.txt: 5 errors in useAuth, AdminUsers, Profile, AdminAuditLogs, AdminReviews; baseline had 12 errors + 1 warning |
| git diff --check | PASS | diff-check-results.txt |
| JS rules | 13 PASS | rules-tests-results.txt; dates, Bangkok boundaries, invalid capacity/end, coordinates, safe errors |
| Isolated PostgreSQL/WASM | 46 PASS | database-tests-results.txt; actual SQL/functions/triggers/RLS on local fixtures, not hosted Supabase |
| Browser smoke with mocked HTTP | PASS | browser-tests-results.txt; 390/768/1366px, validation, no invalid writes, modal Escape, successful submit, sanitized stop-save failure |
| Visual check | PASS for captured screens | screenshots/; Thai font supplied only to test browser because runner lacks Thai fonts |
| Live Supabase E2E / Auth / multi-session concurrency | NOT RUN | no hosted project credentials; must run before release |
| Immediate completion (latest policy) | PASS in isolated SQL/JS/browser | 0020 supersedes 0019 timing requirement; accepted guide/admin can complete future rounds, while role/lifecycle denials remain |

SQL test coverage: future/past creation, end/capacity boundaries, overlap/reassignment/reschedule, invalid states, wrong-guide denial, own accept/decline persistence, manifest/attendance, RLS denial, capacity FULL/overbooking/cancel restore, atomic stop rollback, old OPEN expiry, prior completion lifecycle (past fixture), cancelled bookings preserved, migration reapply.

Local DB harness supplies auth.uid and auth.users stand-ins, grants mirroring API roles, strips UTF-8 BOM during execution and omits unavailable pgcrypto extension (gen_random_uuid exists in core).
**Baseline issue:** 0016 references change_user_role(uuid,text), but no definition exists in supplied migrations. Harness supplies a test-only function that always throws; this RPC is never used in M4 tests. Therefore these results do not certify a fresh, unmodified Supabase installation of the whole repository. M1/integration owner must supply or verify its real definition. Historical migration files were not edited.

## Decisions / integration dependencies

1. LATEST USER DECISION: immediate completion like the original workflow. Migration 0020 removes the completion-time trigger/helper introduced by 0019 and restores baseline complete_tour with a safe search_path. Existing authentication, guide acceptance requirement, admin rights, OPEN/FULL/CLOSED state, atomic lifecycle and audit behavior remain. Historical 0013/0018/0019 unchanged. Apply 0020 if 0019 is already installed.
2. User-confirmed overlap boundary is `[start,end)` with no travel buffer, for ASSIGNED and ACCEPTED, excluding CANCELLED/COMPLETED rounds. Adjacent tours allowed. User approved adjacent tours with no buffer. Legacy missing end time conservatively occupies through midnight in conflict checks.
3. Expired availability derives at service/trigger time; stored status not rewritten. Exact start is unbookable. UI clocks are advisory; database time is authoritative. M3 must consume SCHEDULE_EXPIRED/TIME_ORDER safely and disable stale/direct booking-page CTAs too; that page is outside M4 ownership.
4. New schedule dates/times must be future; status-only capacity/completion/cancel updates on historic rows stay compatible. Terminal CANCELLED/COMPLETED schedules cannot be reopened through direct status update. Confirm this lifecycle restriction with integration owner.
5. M5: replace `src/components/m4/Feedback.jsx` adapter with approved global feedback API. No global Toast/Confirm files were created or changed by M4.
6. M6: replace presentation helpers in `src/services/m4/rules.js` with approved status/date exports. Business validation remains M4. No shared tokens/formatter files were changed.
7. Existing malformed records are reported by VERIFY.sql, not deleted/fixed automatically. New validation doesn't rewrite historical data.
8. Stops use full-list replacement and new IDs as in prior behavior; atomicity fixed. Concurrent admins serialize writes, but last complete save still wins (no optimistic version editor added).
9. Native concurrency tests still required for advisory lock behavior across sessions, simultaneous assignments/accepts, time edits and completion. A deadlock victim must retry; errors are sanitized.
10. Full project lint blockers remain with M1/M6 as listed; no scope expansion performed.

## Reproduce checks

From project root:

```sh
npm ci
npm run build
npx eslint src/pages/admin/Schedules.jsx src/pages/admin/AdminRoutes.jsx src/pages/admin/RouteCreate.jsx src/pages/admin/RouteEdit.jsx src/pages/guide/Dashboard.jsx src/pages/guide/TourDetail.jsx src/services/scheduleService.js src/services/assignmentService.js src/services/routeService.js src/services/m4 src/components/m4
node --test tests/m4/rules.test.mjs
```

Optional isolated DB/browser harnesses require test-only tools, not production dependencies:

```sh
npm install --no-save --package-lock=false @electric-sql/pglite playwright
npx playwright install chromium
node tests/m4/database.test.mjs
node tests/m4/browser.test.mjs
```

Run npm ci afterward to restore the exact locked dependency tree. Test harness starts its own Vite server on 127.0.0.1:5173 with dummy public config; no real Supabase needed. Linux containers without Thai fonts can set M4_TEST_FONT to a local Thai WOFF2. PGLITE_MODULE/PLAYWRIGHT_MODULE/CHROMIUM_PATH optionally point to external test-tool installs.

## M2 live test checklist

Use fresh dedicated test data and record actual outcomes; do not mark these passed from mocked browser evidence.
- All five roles; denied direct DML and wrong-guide RPC calls.
- Bangkok same-day past / exactly-started / future dates, end<=start, invalid/missing end.
- Same guide overlapping assignments from two independent sessions; only one succeeds; adjacent policy as frozen.
- Accept/Decline reload persistence, invalid/cancelled/expired accepting, different guide denied.
- Manifest/attendance, immediate completion state propagation and terminal-state denial; CANCELLED bookings unchanged.
- Capacity last seat / simultaneous last-seat bookings / cancellation and expired OPEN direct booking URL.
- Route create/edit/delete, delete with history, invalid lat/lng/image URL, empty stop list, editing/reordering reload persistence, simulated backend save failure retaining original stops.
- Mobile/tablet/desktop and keyboard, actual M5/M6 adapters, no raw errors.

## Recovery

Revert frontend to previous compatible version first. For 0019-only recovery use docs/m4/ROLLBACK-0019.sql (removes completion timing protection). For full recovery run that first, then review and run docs/m4/ROLLBACK.sql on the test environment if needed; it removes new protections and restores baseline assignment RPCs. No business data is deleted by rollback. For production, prefer a reviewed forward fix and coordinate migration history with the integration owner.

## Latest immediate-completion update installation

If 0019 is installed, apply only 0020_m4_restore_immediate_completion.sql. Otherwise apply 0018, 0019, 0020 in order. Check shared migration numbering first. Do not edit migration history. For recovery to the previous after-end policy, integration owner should restore the 0019 objects in a new reviewed migration, together with its matching frontend.

Verification: SQL suite first checks 39 cases through historical 0019, then applies 0020 and checks 7 current-policy cases (wrong guide/member denied, accepted guide and admin can complete future rounds, completed/cancelled denied, idempotent reapply). The old timing checks are migration-history checks, not the current policy. Browser checks immediate completion before scheduled end and disables the button after completion. JS rules check the valid/terminal states without consulting time.
