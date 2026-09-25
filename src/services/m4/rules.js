// M4 adapter: replace presentation helpers with M6 exports at integration.
export function scheduleInstant(date, time) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    !/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(time || "")
  )
    return NaN;
  const instant = Date.parse(`${date}T${time}+07:00`);
  if (
    !Number.isFinite(instant) ||
    new Date(instant + 7 * 3600000).toISOString().slice(0, 10) !== date
  )
    return NaN;
  return instant;
}
export function validateSchedule(form, now = Date.now()) {
  const errors = {};
  const start = scheduleInstant(form.tour_date, form.start_time);
  const end = scheduleInstant(form.tour_date, form.end_time);
  if (!form.route_id) errors.route_id = "กรุณาเลือกเส้นทาง";
  if (!Number.isFinite(start))
    errors.tour_date = "กรุณาระบุวันที่และเวลาเริ่มให้ถูกต้อง";
  else if (start <= now)
    errors.tour_date = "วันและเวลาเริ่มต้องอยู่ในอนาคต (เวลาไทย)";
  if (!Number.isFinite(end) || end <= start)
    errors.end_time = "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มในวันเดียวกัน";
  const capacity = Number(form.max_participants);
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647)
    errors.max_participants =
      "จำนวนผู้เข้าร่วมต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 2,147,483,647";
  return errors;
}
export function isUpcoming(schedule, now = Date.now()) {
  return scheduleInstant(schedule?.tour_date, schedule?.start_time) > now;
}
export function canAssign(schedule, now = Date.now()) {
  return (
    ["OPEN", "FULL", "CLOSED"].includes(schedule?.status) &&
    isUpcoming(schedule, now) &&
    scheduleInstant(schedule.tour_date, schedule.end_time) >
      scheduleInstant(schedule.tour_date, schedule.start_time)
  );
}
// This is a presentation guard. The database RPC enforces the same window.
export function attendanceAvailability(schedule, now = Date.now()) {
  const start = scheduleInstant(schedule?.tour_date, schedule?.start_time);
  const end = scheduleInstant(schedule?.tour_date, schedule?.end_time);
  const blocked = (message) => ({
    canCheckIn: false,
    canNoShow: false,
    message,
  });

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return blocked("ข้อมูลเวลาของรอบนำเที่ยวไม่ถูกต้อง กรุณาติดต่อผู้ดูแล");
  }
  if (!["OPEN", "FULL", "CLOSED"].includes(schedule?.status)) {
    return blocked("รอบนี้ปิดการเช็กชื่อแล้ว");
  }
  if (now > end) {
    return blocked("เลยเวลาสิ้นสุดทัวร์แล้ว หากต้องแก้ไขย้อนหลังให้ติดต่อผู้ดูแล");
  }
  if (now < start - 60 * 60_000) {
    return blocked("เปิดให้เช็กอินได้ตั้งแต่ 60 นาทีก่อนเริ่มทัวร์");
  }
  if (now < start + 15 * 60_000) {
    return {
      canCheckIn: true,
      canNoShow: false,
      message: "สามารถเช็กอินได้แล้ว ส่วนการระบุว่าไม่มาทำได้หลังเริ่มทัวร์ 15 นาที",
    };
  }
  return { canCheckIn: true, canNoShow: true, message: "" };
}

export function thaiToday(now = Date.now()) {
  return new Date(now + 7 * 3600000).toISOString().slice(0, 10);
}
export function formatDate(date) {
  const instant = scheduleInstant(date, "12:00");
  return Number.isFinite(instant)
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "Asia/Bangkok",
      }).format(instant)
    : "ไม่ระบุวันที่";
}
export function formatTime(time) {
  return time?.slice(0, 5) || "ไม่ระบุเวลา";
}
export function statusLabel(status) {
  return (
    {
      OPEN: "เปิดรับจอง",
      FULL: "เต็มแล้ว",
      CLOSED: "ปิดรับจอง",
      CANCELLED: "ยกเลิก",
      COMPLETED: "เสร็จสิ้น",
      ASSIGNED: "รอตอบรับ",
      ACCEPTED: "รับงานแล้ว",
      DECLINED: "ปฏิเสธงาน",
      ACTIVE: "เปิดใช้งาน",
      INACTIVE: "ปิดใช้งาน",
      NOT_CHECKED_IN: "ยังไม่เช็กชื่อ",
      CHECKED_IN: "มาแล้ว",
      NO_SHOW: "ไม่มา",
    }[status] || "ไม่ทราบสถานะ"
  );
}
export function validateStop(stop) {
  if (typeof stop?.name !== "string" || !stop.name.trim())
    return "กรุณากรอกชื่อจุดแวะ";
  for (const [key, limit, label] of [
    ["latitude", 90, "ละติจูด"],
    ["longitude", 180, "ลองจิจูด"],
  ]) {
    if (
      stop[key] == null ||
      String(stop[key]).trim() === "" ||
      !Number.isFinite(Number(stop[key])) ||
      Math.abs(Number(stop[key])) > limit
    )
      return `${label}ต้องเป็นตัวเลขระหว่าง -${limit} ถึง ${limit}`;
  }
  if (stop.image_url?.trim()) {
    try {
      if (!["https:", "http:"].includes(new URL(stop.image_url).protocol))
        return "URL รูปภาพต้องขึ้นต้นด้วย https:// หรือ http://";
    } catch {
      return "กรุณาระบุ URL รูปภาพให้ถูกต้อง";
    }
  }
  return "";
}

export function canComplete(schedule) {
  return ['OPEN', 'FULL', 'CLOSED'].includes(schedule?.status);
}
