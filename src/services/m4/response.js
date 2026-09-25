const messages = {
  TOUR_NOT_ENDED: "ยังไม่ถึงเวลาสิ้นสุดทัวร์ กรุณารอแล้วลองอีกครั้ง",
  AUTH_REQUIRED: "กรุณาเข้าสู่ระบบอีกครั้ง",
  FORBIDDEN: "คุณไม่มีสิทธิ์ดำเนินการนี้",
  NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ กรุณาโหลดข้อมูลใหม่",
  VALIDATION_ERROR: "กรุณาตรวจสอบข้อมูลให้ครบถ้วนและถูกต้อง",
  INVALID_STATE: "สถานะปัจจุบันไม่อนุญาตให้ดำเนินการนี้ กรุณาโหลดข้อมูลใหม่",
  SCHEDULE_PAST: "วันและเวลาเริ่มต้องอยู่ในอนาคต (เวลาไทย)",
  TIME_ORDER: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม",
  SCHEDULE_EXPIRED: "รอบนี้ผ่านเวลาเริ่มแล้ว ไม่สามารถจองหรือรับงานได้",
  GUIDE_OVERLAP: "ไกด์มีงานอื่นในช่วงเวลานี้ กรุณาเลือกไกด์หรือเวลาอื่น",
  ROUTE_INACTIVE: "เส้นทางนี้ไม่ได้เปิดใช้งาน",
  CAPACITY_INVALID: "จำนวนที่รับต้องเป็นจำนวนเต็มบวกและไม่น้อยกว่ายอดจอง",
  23503: "ข้อมูลนี้มีประวัติใช้งานอยู่ จึงลบไม่ได้ กรุณาปิดใช้งานแทน",
  23505: "ข้อมูลซ้ำกับรายการที่มีอยู่ กรุณาโหลดข้อมูลใหม่",
  "40P01": "มีการแก้ไขพร้อมกัน กรุณาลองอีกครั้ง",
};
export function safeMessage(error) {
  return (
    messages[error?.message] ||
    messages[error?.code] ||
    "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง"
  );
}
export function formatResponse(data, error) {
  return error
    ? {
        success: false,
        data: null,
        error: {
          code: error.code || error.message || "DATABASE_ERROR",
          message: safeMessage(error),
        },
      }
    : { success: true, data, error: null };
}
export async function request(operation) {
  try {
    const { data, error } = await operation();
    return formatResponse(data, error);
  } catch {
    return formatResponse(null, { code: "NETWORK_ERROR" });
  }
}
