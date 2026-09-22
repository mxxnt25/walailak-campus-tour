// Isolated PostgreSQL/WASM verification; does not connect to a hosted database.
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
-- Test-only stub: baseline 0016 grants this M1 RPC, but ZIP has no definition.
CREATE FUNCTION public.change_user_role(uuid,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_STUB_NOT_IMPLEMENTED'; END $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;`);
const migrationDir = new URL('../../supabase/migrations/', import.meta.url);
for (const file of (await readdir(migrationDir)).filter(n => n.endsWith('.sql') && !n.startsWith('0020_')).sort()) {
  let sql = await readFile(new URL(file, migrationDir), 'utf8');
  // PGlite ships gen_random_uuid in core; pgcrypto extension isn't packaged here.
  sql = sql.replace(/^\uFEFF/, '').replace(/create extension if not exists pgcrypto;/i, '');
  try { await db.exec(sql); console.log('APPLIED', file); } catch (e) { console.error('MIGRATION FAILED', file, e.message); throw e; }
}
await db.exec('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;');
const admin = '00000000-0000-0000-0000-000000000001', guide = '00000000-0000-0000-0000-000000000002', otherGuide = '00000000-0000-0000-0000-000000000003', member = '00000000-0000-0000-0000-000000000004';
for (const [id, role] of [[admin,'ADMIN'], [guide,'GUIDE'], [otherGuide,'GUIDE'], [member,'MEMBER']]) {
  await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [id, role+'@test.invalid']);
}
// Fixture setup only, before simulating authenticated clients.
await db.exec('ALTER TABLE profiles DISABLE TRIGGER trg_protect_profile_privileges;');
for (const [id, role] of [[admin,'ADMIN'],[guide,'GUIDE'],[otherGuide,'GUIDE']]) await db.query('UPDATE profiles SET role=$1 WHERE id=$2',[role,id]);
await db.exec('ALTER TABLE profiles ENABLE TRIGGER trg_protect_profile_privileges;');
async function actor(id) { await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]); await db.exec('SET ROLE authenticated'); }
let count = 0;
async function pass(label, fn) { await fn(); count++; console.log('PASS', label); }
async function denied(sql, params, expected) { try { await db.query(sql,params); assert.fail('Expected denial: '+expected); } catch (e) { assert.match(e.message, expected); } }
await actor(admin);
const route = (await db.query("INSERT INTO routes(name) VALUES ('M4 test route') RETURNING id")).rows[0].id;
async function schedule(start='10:00', end='11:00', days=5, capacity=10) { return (await db.query("INSERT INTO tour_schedules(route_id,tour_date,start_time,end_time,max_participants) VALUES($1,(clock_timestamp() AT TIME ZONE 'Asia/Bangkok')::date+$2::integer,$3,$4,$5) RETURNING id", [route,days,start,end,capacity])).rows[0].id; }
const one = await schedule();
await pass('future schedule persisted', async () => assert.ok(one));
await pass('past creation denied', () => denied("INSERT INTO tour_schedules(route_id,tour_date,start_time,end_time,max_participants) VALUES($1,current_date-1,'10:00','11:00',1)",[route],/SCHEDULE_PAST/));
await pass('equal/reversed/missing end denied', async () => { for (const end of ['10:00','09:00',null]) await denied("INSERT INTO tour_schedules(route_id,tour_date,start_time,end_time,max_participants) VALUES($1,current_date+5,'10:00',$2,1)",[route,end],/TIME_ORDER/); });
await pass('capacity zero denied', () => denied("INSERT INTO tour_schedules(route_id,tour_date,start_time,end_time,max_participants) VALUES($1,current_date+5,'10:00','11:00',0)",[route],/CAPACITY_INVALID/));
await pass('assign active guide', async () => { await db.query('SELECT assign_guide($1,$2)',[one,guide]); });
const two = await schedule('10:30','11:30');
await pass('overlap assignment denied', () => denied('SELECT assign_guide($1,$2)',[two,guide],/GUIDE_OVERLAP/));
const adjacent = await schedule('11:00','12:00');
await pass('adjacent intervals allowed under proposed no-buffer policy', async () => { await db.query('SELECT assign_guide($1,$2)',[adjacent,guide]); });
await pass('reschedule into overlap denied', () => denied("UPDATE tour_schedules SET start_time='10:30' WHERE id=$1",[adjacent],/GUIDE_OVERLAP/));
const cancelled = await schedule('14:00','15:00'); await db.query("UPDATE tour_schedules SET status='CANCELLED' WHERE id=$1",[cancelled]);
await pass('cancelled assignment denied', () => denied('SELECT assign_guide($1,$2)',[cancelled,guide],/INVALID_STATE/));
const assignment = (await db.query('SELECT id FROM guide_assignments WHERE schedule_id=$1',[one])).rows[0].id;
await actor(otherGuide);
await pass('wrong guide cannot accept', () => denied("SELECT update_my_assignment_status($1,'ACCEPTED')",[assignment],/FORBIDDEN/));
await actor(guide);
await pass('own accept persists', async () => { await db.query("SELECT update_my_assignment_status($1,'ACCEPTED')",[assignment]); assert.equal((await db.query('SELECT status FROM guide_assignments WHERE id=$1',[assignment])).rows[0].status,'ACCEPTED'); });
const adjacentAssignment = (await db.query('SELECT id FROM guide_assignments WHERE schedule_id=$1',[adjacent])).rows[0].id;
await pass('own decline persists', async () => { await db.query("SELECT update_my_assignment_status($1,'DECLINED')",[adjacentAssignment]); assert.equal((await db.query('SELECT status FROM guide_assignments WHERE id=$1',[adjacentAssignment])).rows[0].status,'DECLINED'); });
await pass('null assignment status denied', () => denied('SELECT update_my_assignment_status($1,NULL)',[adjacentAssignment],/VALIDATION_ERROR/));
await actor(member);
let booking;
await pass('booking capacity happy path preserved', async () => { booking = (await db.query('SELECT book_tour_safe($1,2,NULL) AS id',[one])).rows[0].id; assert.ok(booking); });
await pass('overbooking denied', () => denied('SELECT book_tour_safe($1,99,NULL)',[one],/CAPACITY_FULL/));
await actor(guide);
await pass('manifest and attendance persist', async () => { assert.equal((await db.query('SELECT * FROM get_my_tour_manifest($1)',[one])).rows.length,1); await db.query("SELECT update_tour_attendance($1,'CHECKED_IN')",[booking]); assert.equal((await db.query('SELECT * FROM get_my_tour_manifest($1)',[one])).rows[0].attendance_status,'CHECKED_IN'); });
await actor(otherGuide);
await pass('wrong guide manifest and attendance denied', async () => { await denied('SELECT * FROM get_my_tour_manifest($1)',[one],/FORBIDDEN/); await denied("SELECT update_tour_attendance($1,'CHECKED_IN')",[booking],/FORBIDDEN/); });
await actor(member);
await pass('member cannot assign or replace stops', async () => { await denied('SELECT assign_guide($1,$2)',[two,guide],/FORBIDDEN/); await denied("SELECT * FROM m4_replace_route_stops($1,'[]')",[route],/FORBIDDEN/); });
await pass('cancellation capacity preserved', async () => { await db.query('SELECT cancel_booking_safe($1)',[booking]); assert.equal((await db.query('SELECT * FROM get_schedule_capacity($1)',[one])).rows[0].remaining_seats,10); });
await actor(admin);
const stops = [{name:'B',latitude:8,longitude:99},{name:'A',latitude:9,longitude:100}];
await pass('ordered atomic stop replacement', async () => { const r = await db.query('SELECT * FROM m4_replace_route_stops($1,$2::jsonb)',[route,JSON.stringify(stops)]); assert.deepEqual(r.rows.map(x=>[x.name,x.stop_order]),[['B',1],['A',2]]); });
await pass('invalid stop does not erase original list', async () => { await denied('SELECT * FROM m4_replace_route_stops($1,$2::jsonb)',[route,JSON.stringify([{name:'bad',latitude:100,longitude:0}])],/VALIDATION_ERROR/); assert.deepEqual((await db.query('SELECT name FROM route_stops WHERE route_id=$1 ORDER BY stop_order',[route])).rows.map(x=>x.name),['B','A']); });
// Inject a failure AFTER deletion to prove transactional rollback, not just pre-validation.
await db.exec('RESET ROLE');
await db.exec("CREATE FUNCTION test_stop_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='force-failure' THEN RAISE EXCEPTION 'TEST_INSERT_FAILURE'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_stop_failure BEFORE INSERT ON route_stops FOR EACH ROW EXECUTE FUNCTION test_stop_failure();");
await actor(admin);
await pass('insert failure rolls back deleted stops', async () => { await denied('SELECT * FROM m4_replace_route_stops($1,$2::jsonb)',[route,JSON.stringify([{name:'force-failure',latitude:0,longitude:0}])],/TEST_INSERT_FAILURE/); assert.equal((await db.query('SELECT count(*)::integer AS n FROM route_stops WHERE route_id=$1',[route])).rows[0].n,2); });
// Legacy data may predate this migration; seed it with only the new validator disabled.
await db.exec('RESET ROLE; ALTER TABLE tour_schedules DISABLE TRIGGER m4_validate_schedule;');
const expired = await schedule('10:00','11:00',-1);
await db.exec('ALTER TABLE tour_schedules ENABLE TRIGGER m4_validate_schedule;');
await actor(member);
await pass('legacy expired OPEN booking denied', () => denied('SELECT book_tour_safe($1,1,NULL)',[expired],/SCHEDULE_EXPIRED/));
await actor(admin);
await pass('expired guide assignment denied', () => denied('SELECT assign_guide($1,$2)',[expired,guide],/SCHEDULE_EXPIRED/));
// Additional regression cases: direct RLS, capacity FULL, completion state propagation.
await actor(member);
await pass('direct member schedule insert RLS denied', () => denied("INSERT INTO tour_schedules(route_id,tour_date,start_time,end_time,max_participants) VALUES($1,current_date+5,'15:00','16:00',1)",[route],/row-level security/));
await actor(admin);
const full = await schedule('16:00','17:00',6,1);
await actor(member);
const fullBooking = (await db.query('SELECT book_tour_safe($1,1,NULL) AS id',[full])).rows[0].id;
await pass('last seat marks FULL', async () => assert.equal((await db.query('SELECT * FROM get_schedule_capacity($1)',[full])).rows[0].status,'FULL'));
await pass('cancelling FULL reopens capacity', async () => { await db.query('SELECT cancel_booking_safe($1)',[fullBooking]); const c=(await db.query('SELECT * FROM get_schedule_capacity($1)',[full])).rows[0]; assert.equal(c.status,'OPEN'); assert.equal(c.remaining_seats,1); });
await actor(admin);
const done = await schedule('12:00','13:00',7);
await db.query('SELECT assign_guide($1,$2)',[done,guide]);
const doneAssignment=(await db.query('SELECT id FROM guide_assignments WHERE schedule_id=$1',[done])).rows[0].id;
await actor(guide); await db.query("SELECT update_my_assignment_status($1,'ACCEPTED')",[doneAssignment]);
await actor(member);
await db.query('SELECT book_tour_safe($1,1,NULL)',[done]);
const cancelledBooking=(await db.query('SELECT book_tour_safe($1,1,NULL) AS id',[done])).rows[0].id;
await db.query('SELECT cancel_booking_safe($1)',[cancelledBooking]);
await db.exec('RESET ROLE; ALTER TABLE tour_schedules DISABLE TRIGGER m4_validate_schedule;');
await db.query("UPDATE tour_schedules SET tour_date=current_date-1 WHERE id=$1",[done]);
await db.exec('ALTER TABLE tour_schedules ENABLE TRIGGER m4_validate_schedule;');
await actor(guide);
await pass('existing completion lifecycle preserved on past fixture', async () => {
 await db.query('SELECT complete_tour($1)',[done]);
 assert.equal((await db.query('SELECT status FROM tour_schedules WHERE id=$1',[done])).rows[0].status,'COMPLETED');
 assert.equal((await db.query('SELECT status FROM guide_assignments WHERE id=$1',[doneAssignment])).rows[0].status,'COMPLETED');
 assert.equal((await db.query('SELECT * FROM get_my_tour_manifest($1)',[done])).rows[0].booking_status,'COMPLETED');
});
await actor(member);
await pass('completion preserves cancelled bookings', async () => assert.equal((await db.query('SELECT status FROM bookings WHERE id=$1',[cancelledBooking])).rows[0].status,'CANCELLED'));
await actor(admin);
await pass('completed schedule assignment denied', () => denied('SELECT assign_guide($1,$2)',[done,otherGuide],/INVALID_STATE/));
await pass('empty stop list explicitly clears stops', async () => { const r=await db.query("SELECT * FROM m4_replace_route_stops($1,'[]')",[route]); assert.equal(r.rows.length,0); });
await actor(guide);
await pass('accepted guide cannot complete future tour', () => denied('SELECT complete_tour($1)',[one],/TOUR_NOT_ENDED/));
await actor(admin);
await pass('admin cannot complete future tour', () => denied('SELECT complete_tour($1)',[one],/TOUR_NOT_ENDED/));
await pass('direct admin status update cannot bypass end-time guard', () => denied("UPDATE tour_schedules SET status='COMPLETED' WHERE id=$1",[one],/TOUR_NOT_ENDED/));
await pass('early completion leaves schedule and assignment unchanged', async () => {
 assert.equal((await db.query('SELECT status FROM tour_schedules WHERE id=$1',[one])).rows[0].status,'OPEN');
 assert.equal((await db.query('SELECT status FROM guide_assignments WHERE id=$1',[assignment])).rows[0].status,'ACCEPTED');
});
await db.exec('RESET ROLE');
await pass('SQL exact end boundary uses Bangkok time', async () => {
 const r=await db.query("SELECT m4_completion_due('2026-09-22','10:00','11:00','2026-09-22 03:59:59.999+00') AS before, m4_completion_due('2026-09-22','10:00','11:00','2026-09-22 04:00:00+00') AS exact, m4_completion_due('2026-09-22','10:00','11:00','2026-09-22 04:00:00.001+00') AS after");
 assert.deepEqual(r.rows[0],{before:false,exact:true,after:true});
});
await pass('SQL missing and reversed end cannot qualify', async () => {
 const r=await db.query("SELECT m4_completion_due('2026-09-22','10:00',NULL,now()) AS missing, m4_completion_due('2026-09-22','10:00','09:00',now()) AS reversed"); assert.deepEqual(r.rows[0],{missing:false,reversed:false});
});
await pass('completion migration idempotent reapply', async () => { await db.exec(await readFile(new URL('0019_m4_completion_after_end.sql',migrationDir),'utf8')); });
await pass('idempotent migration reapply', async () => { await db.exec('RESET ROLE'); await db.exec(await readFile(new URL('0018_m4_schedule_route_safety.sql',migrationDir),'utf8')); });
console.log(`HISTORICAL MIGRATION CHECKS: ${count} PASS (through 0019; superseded timing rule).`);
await db.exec('RESET ROLE');
await db.exec(await readFile(new URL('0020_m4_restore_immediate_completion.sql',migrationDir),'utf8'));
await actor(otherGuide);
await pass('0020 wrong guide still denied', () => denied('SELECT complete_tour($1)',[one],/FORBIDDEN/));
await actor(member);
await pass('0020 member still denied', () => denied('SELECT complete_tour($1)',[one],/FORBIDDEN/));
await actor(guide);
await pass('0020 accepted guide completes future tour immediately', async () => {
 await db.query('SELECT complete_tour($1)',[one]);
 assert.equal((await db.query('SELECT status FROM tour_schedules WHERE id=$1',[one])).rows[0].status,'COMPLETED');
 assert.equal((await db.query('SELECT status FROM guide_assignments WHERE schedule_id=$1',[one])).rows[0].status,'COMPLETED');
});
await actor(admin);
await pass('0020 admin completes future tour immediately', async () => { await db.query('SELECT complete_tour($1)',[two]); });
await pass('0020 already-completed tour still denied', () => denied('SELECT complete_tour($1)',[two],/INVALID_STATE/));
await pass('0020 cancelled tour still denied', () => denied('SELECT complete_tour($1)',[cancelled],/INVALID_STATE/));
await pass('0020 reapply safe', async () => { await db.exec('RESET ROLE'); await db.exec(await readFile(new URL('0020_m4_restore_immediate_completion.sql',migrationDir),'utf8')); });
console.log(`TOTAL ${count} PASS: 39 historical checks + 7 current immediate-completion checks. Multi-session concurrency not asserted.`);
await db.close();
