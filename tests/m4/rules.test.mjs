import test from 'node:test';
import assert from 'node:assert/strict';
import { canComplete, validateSchedule, scheduleInstant, isUpcoming, thaiToday, canAssign, validateStop } from '../../src/services/m4/rules.js';
import { safeMessage } from '../../src/services/m4/response.js';
const now = Date.parse('2026-09-22T03:00:00Z');
const valid = { route_id: 'route', tour_date: '2026-09-22', start_time: '11:00', end_time: '12:00', max_participants: '1' };
test('future schedule and minimum capacity', () => assert.deepEqual(validateSchedule(valid, now), {}));
test('past and exact-start are rejected in Bangkok time', () => { for (const time of ['09:59', '10:00']) assert.ok(validateSchedule({ ...valid, start_time: time }, now).tour_date); });
test('equal, reversed and missing end rejected', () => { for (const end_time of ['11:00', '10:00', '']) assert.ok(validateSchedule({ ...valid, end_time }, now).end_time); });
test('capacity requires bounded positive integer', () => { for (const max_participants of ['', 0, -1, 1.5, 'abc', 2147483648]) assert.ok(validateSchedule({ ...valid, max_participants }, now).max_participants); });
test('invalid date does not silently normalize', () => assert.ok(Number.isNaN(scheduleInstant('2026-02-30', '10:00'))));
test('Thai midnight independent of machine timezone', () => assert.equal(thaiToday(Date.parse('2026-09-22T18:00Z')), '2026-09-23'));
test('expired OPEN is unavailable', () => assert.equal(isUpcoming({ ...valid, start_time: '09:00', status: 'OPEN' }, now), false));
test('assignment rejects terminal and invalid schedules', () => { for (const status of ['CANCELLED','COMPLETED']) assert.equal(canAssign({ ...valid, status }, now), false); assert.equal(canAssign({ ...valid, status: 'FULL' }, now), true); });
test('blank coordinate is not treated as zero; real zero allowed', () => { const s = { name: 'Stop', latitude: 0, longitude: 0 }; assert.equal(validateStop(s), ''); for (const latitude of ['', null, ' ', 91]) assert.ok(validateStop({ ...s, latitude })); });
test('unsafe image URLs rejected', () => assert.ok(validateStop({ name: 'Stop', latitude: 8, longitude: 99, image_url: 'javascript:alert(1)' })));
test('unknown backend errors never leak details', () => assert.equal(safeMessage({ message: 'secret_database_table failed' }), 'ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง'));

test('completion available immediately for valid lifecycle states', () => {
 for(const status of ['OPEN','FULL','CLOSED']) assert.equal(canComplete({...valid,tour_date:'2099-01-01',status}),true);
});
test('completion still rejects terminal or missing states', () => {
 for(const status of ['COMPLETED','CANCELLED',null]) assert.equal(canComplete({...valid,status}),false);
});
