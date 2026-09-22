import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
process.env.VITE_SUPABASE_URL='https://m4-test.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='test-public-key';
const { createServer } = await import('vite');
const server = await createServer({ server: {host:'127.0.0.1',port:5173,strictPort:true} });
await server.listen();
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process', '--disable-gpu'] } : {}) });
const page = await browser.newPage();
const testFont = process.env.M4_TEST_FONT ? (await readFile(process.env.M4_TEST_FONT)).toString('base64') : null;
async function visit(url) {
 await page.goto(url);
 if (testFont) {
  await page.addStyleTag({ content: `@font-face {font-family: M4Thai; src: url(data:font/woff2;base64,${testFont}) format('woff2');} body, button, input, select, textarea {font-family: M4Thai, sans-serif !important;}` });
  await page.evaluate(() => document.fonts.ready);
 }
}
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', async d => { errors.push('Unexpected native dialog: '+d.message()); await d.dismiss(); });
const routeId='00000000-0000-0000-0000-000000000011';
let calls=0;
let completions=0;
let stopFailure = false;
const routes = [{id:routeId,name:'เส้นทางชมมหาวิทยาลัย',status:'ACTIVE',duration_minutes:60}];
const schedules = [{id:'schedule',tour_date:'2099-01-01',start_time:'10:00:00',end_time:'11:00:00',max_participants:20,status:'OPEN',routes:routes[0],guide_assignments:[]}];
await page.route('https://m4-test.invalid/**', async request => {
 const url = new URL(request.request().url()); const method = request.request().method();
 const respond = (body, status=200) => request.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
 if (method === 'OPTIONS') return request.fulfill({ status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,PATCH,OPTIONS'} });
 if (url.pathname.endsWith('/tour_schedules')) {
   if (method === 'POST') { calls++; return respond({...schedules[0],...request.request().postDataJSON()[0]}); }
   return respond(url.searchParams.has("id") ? schedules[0] : schedules);
 }
 if (url.pathname.endsWith('/complete_tour')) { completions++; schedules[0].status='COMPLETED'; return respond(schedules[0]); }
 if (url.pathname.endsWith('/profiles')) return respond([{id:'guide',full_name:'ไกด์ทดสอบ',role:'GUIDE',account_status:'ACTIVE'}]);
 if (url.pathname.endsWith('/routes')) return respond(url.searchParams.has('id') && method==='GET' ? routes[0] : routes);
 if (url.pathname.endsWith('/route_stops')) return respond([{id:'stop',name:'จุดแวะเดิม',latitude:8,longitude:99,stop_order:1}]);
 if (url.pathname.endsWith('/m4_replace_route_stops')) return stopFailure ? respond({code:'P0001',message:'secret_table_internal_failure'},400) : respond([]);
 return respond([]);
});
await mkdir('docs/m4/screenshots', {recursive:true});
for (const width of [390,768,1366]) {
 await page.setViewportSize({width,height:900});
 await visit('http://127.0.0.1:5173/tests/m4/browser/index.html');
 await page.getByRole('button',{name:'+ สร้างรอบนำเที่ยว'}).waitFor();
 await page.getByRole('button',{name:'+ สร้างรอบนำเที่ยว'}).click();
 await page.locator('#m4-route').selectOption(routeId);
 await page.getByLabel('วันที่ (เวลาไทย) *').fill('2020-01-01');
 await page.getByLabel('เวลาเริ่ม *',{exact:true}).fill('10:00');
 await page.getByLabel('เวลาสิ้นสุด *').fill('11:00');
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await page.getByText('วันและเวลาเริ่มต้องอยู่ในอนาคต (เวลาไทย)',{exact:true}).waitFor();
 assert.equal(calls,0);
 const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
 assert.equal(overflow,false, 'Page must not overflow horizontally');
 await page.screenshot({path:`docs/m4/screenshots/schedule-validation-${width}.png`,fullPage:true});
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('dialog').count(),0);
 console.log(`PASS schedule past validation, no write, modal escape, ${width}px no page overflow`);
}
await page.getByRole('button',{name:'+ สร้างรอบนำเที่ยว'}).click();
await page.locator('#m4-route').selectOption(routeId);
await page.getByLabel('วันที่ (เวลาไทย) *').fill('2099-01-01');
await page.getByLabel('เวลาเริ่ม *',{exact:true}).fill('10:00');
await page.getByLabel('เวลาสิ้นสุด *').fill('09:00');
await page.getByRole('button',{name:'บันทึก',exact:true}).click();
await page.getByText('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มในวันเดียวกัน',{exact:true}).waitFor();
assert.equal(calls,0);
await page.getByLabel('เวลาสิ้นสุด *').fill('11:00');
await page.getByRole('button',{name:'บันทึก',exact:true}).click();
await page.getByRole('status').filter({hasText:'สร้างรอบนำเที่ยวเรียบร้อยแล้ว'}).waitFor();
assert.equal(calls,1);
console.log('PASS reversed time denied; valid future schedule submitted once');
await visit(`http://127.0.0.1:5173/tests/m4/browser/index.html?screen=/routes/${routeId}`);
await page.getByLabel('ชื่อจุดแวะ',{exact:true}).fill('จุดแวะใหม่');
await page.getByLabel('Latitude',{exact:true}).fill('91');
await page.getByLabel('Longitude',{exact:true}).fill('99');
await page.getByRole('button',{name:'+ เพิ่มจุดแวะ'}).click();
await page.getByText('ละติจูดต้องเป็นตัวเลขระหว่าง -90 ถึง 90',{exact:true}).waitFor();
await page.getByRole('button',{name:'ยกเลิกข้อมูลจุดแวะที่กำลังกรอก'}).click();
stopFailure = true;
await page.getByRole('button',{name:'บันทึกจุดแวะทั้งหมด',exact:true}).click();
await page.getByRole('button',{name:'ยืนยัน',exact:true}).click();
await page.getByRole('dialog').getByRole('alert').filter({hasText:'ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง'}).waitFor();
assert.ok(!(await page.locator('body').innerText()).includes('secret_table'));
await page.screenshot({path:'docs/m4/screenshots/route-save-error.png',fullPage:true});
console.log('PASS invalid coordinate blocked; atomic RPC failure shown without raw error or lost draft');
await page.clock.install({time:new Date('2099-01-01T03:59:59Z')});
await page.clock.pauseAt(new Date('2099-01-01T03:59:59Z'));
await visit('http://127.0.0.1:5173/tests/m4/browser/index.html?screen=/guide/tours/schedule');
await page.clock.runFor(1);
const completeButton=page.getByRole('button',{name:'จบการนำเที่ยว',exact:true});
await completeButton.waitFor();
assert.equal(completions,0);
assert.equal(await completeButton.isEnabled(),true);
await completeButton.click();
await page.getByRole('dialog').getByRole('button',{name:'ยืนยัน',exact:true}).click();
await page.getByRole('status').filter({hasText:'จบการนำเที่ยวเรียบร้อยแล้ว'}).waitFor();
assert.equal(completions,1);
assert.equal(await completeButton.isDisabled(),true);
console.log('PASS immediate completion before end; confirmation persists completion; completed button disabled');
assert.deepEqual(errors,[]);
await browser.close();
await server.close();
