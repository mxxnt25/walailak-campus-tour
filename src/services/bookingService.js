import { supabase } from "../lib/supabase";

let myBookingSnapshot = null;
let bookingSnapshotGeneration = 0;
const pendingBookingLists = new Map();
const BOOKING_SNAPSHOT_MS = 20_000;

export function getCachedMyBookings(userId) {
  return userId &&
    myBookingSnapshot?.userId === userId &&
    Date.now() < myBookingSnapshot.expiresAt
    ? myBookingSnapshot.data
    : null;
}

export function clearMyBookingsCache() {
  bookingSnapshotGeneration += 1;
  myBookingSnapshot = null;
  pendingBookingLists.clear();
}

function success(data) {
  return {
    success: true,
    data,
    error: null,
  };
}

function failure(code, message) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
  };
}
export function isScheduleExpired(schedule, now = new Date()) {
  if (!schedule?.tour_date || !schedule?.start_time) {
    return false;
  }

  const nowParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const currentDateTime =
    `${nowParts.year}-${nowParts.month}-${nowParts.day}` +
    `T${nowParts.hour}:${nowParts.minute}:${nowParts.second}`;

  const normalizedStartTime =
    schedule.start_time.length === 5
      ? `${schedule.start_time}:00`
      : schedule.start_time.slice(0, 8);

  const scheduleDateTime = `${schedule.tour_date}T${normalizedStartTime}`;

  return scheduleDateTime <= currentDateTime;
}

export async function createBooking({
  scheduleId,
  participantCount,
  specialRequest = null,
}) {
  if (!scheduleId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสรอบนำเที่ยว");
  }

  const count = Number(participantCount);

  if (!Number.isInteger(count) || count < 1) {
    return failure(
      "VALIDATION_ERROR",
      "จำนวนผู้เข้าร่วมต้องเป็นจำนวนเต็มอย่างน้อย 1 คน",
    );
  }

  const normalizedSpecialRequest =
    typeof specialRequest === "string" && specialRequest.trim()
      ? specialRequest.trim()
      : null;

  const { data, error } = await supabase.rpc("book_tour_safe", {
    p_schedule_id: scheduleId,
    p_participant_count: count,
    p_special_request: normalizedSpecialRequest,
  });

  if (error) {
    const message = error.message || "";

    if (message.includes("AUTH_REQUIRED")) {
      return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนทำการจอง");
    }

    if (message.includes("NOT_FOUND")) {
      return failure("NOT_FOUND", "ไม่พบรอบนำเที่ยวที่ต้องการจอง");
    }

    if (
      message.includes("CAPACITY_FULL") ||
      message.includes("CAPACITY_EXCEEDED")
    ) {
      return failure(
        "CAPACITY_FULL",
        "จำนวนผู้เข้าร่วมเกินจำนวนที่ว่างในรอบนี้",
      );
    }

    if (message.includes("FORBIDDEN")) {
      return failure("FORBIDDEN", "บัญชีนี้ไม่มีสิทธิ์จองรอบนำเที่ยว");
    }

    if (message.includes("DUPLICATE_BOOKING")) {
      return failure(
        "DUPLICATE_BOOKING",
        "คุณมีรายการจองที่ยืนยันแล้วสำหรับรอบนี้อยู่แล้ว",
      );
    }

    if (
      message.includes("INVALID_STATE") ||
      message.includes("SCHEDULE_NOT_OPEN")
    ) {
      return failure(
        "INVALID_STATE",
        "รอบนำเที่ยวนี้ไม่อยู่ในสถานะที่สามารถจองได้",
      );
    }

    if (message.includes("VALIDATION_ERROR")) {
      return failure("VALIDATION_ERROR", "ข้อมูลการจองไม่ถูกต้อง");
    }

    return failure("DATABASE_ERROR", "ไม่สามารถสร้างการจองได้");
  }

  clearMyBookingsCache();
  return success({
    bookingId: data,
    status: "CONFIRMED",
  });
}

export async function listMyBookings() {
  const requestGeneration = bookingSnapshotGeneration;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูรายการจอง");
  }

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  // StrictMode can run the mount effect twice in development. Share only
  // the database read for the same verified user; never mix users or cache
  // a request that predates a booking mutation or sign-out.
  const pending = pendingBookingLists.get(user.id);
  if (pending) return pending;

  const read = (async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        tour_schedules (
          id,
          tour_date,
          start_time,
          end_time,
          max_participants,
          status,
          routes (
            id,
            name
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return failure("DATABASE_ERROR", "ไม่สามารถโหลดรายการจองได้");
    }

    if (requestGeneration === bookingSnapshotGeneration) {
      myBookingSnapshot = {
        userId: user.id,
        data: data ?? [],
        expiresAt: Date.now() + BOOKING_SNAPSHOT_MS,
      };
    }
    return success(data ?? []);
  })();
  pendingBookingLists.set(user.id, read);
  try {
    return await read;
  } finally {
    if (pendingBookingLists.get(user.id) === read)
      pendingBookingLists.delete(user.id);
  }
}

export async function getMyConfirmedBookingForSchedule(scheduleId) {
  if (!scheduleId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสรอบนำเที่ยว");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนตรวจสอบรายการจอง");
  }

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      participant_count,
      created_at
    `,
    )
    .eq("user_id", user.id)
    .eq("schedule_id", scheduleId)
    .eq("status", "CONFIRMED")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบรายการจองเดิมได้");
  }

  return success(data ?? null);
}

export async function getBookingDetail(bookingId) {
  if (!bookingId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสการจอง");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูรายละเอียดการจอง");
  }

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      tour_schedules (
        id,
        tour_date,
        start_time,
        end_time,
        max_participants,
        status,
        routes (
          id,
          name
        )
      )
    `,
    )
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return failure("DATABASE_ERROR", "ไม่สามารถโหลดรายละเอียดการจองได้");
  }

  if (!data) {
    return failure("NOT_FOUND", "ไม่พบรายการจอง");
  }

  return success(data);
}

export async function cancelMyBooking(bookingId) {
  if (!bookingId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสการจอง");
  }

  const { data, error } = await supabase.rpc("cancel_booking_safe", {
    p_booking_id: bookingId,
  });

  if (error) {
    const message = error.message || "";

    if (message.includes("AUTH_REQUIRED")) {
      return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนยกเลิกการจอง");
    }

    if (message.includes("FORBIDDEN")) {
      return failure("FORBIDDEN", "คุณไม่มีสิทธิ์ยกเลิกรายการจองนี้");
    }

    if (message.includes("NOT_FOUND")) {
      return failure("NOT_FOUND", "ไม่พบรายการจอง");
    }

    if (
      message.includes("INVALID_STATE") ||
      message.includes("VALIDATION_ERROR")
    ) {
      return failure(
        "INVALID_STATE",
        "สามารถยกเลิกได้เฉพาะรายการจองที่มีสถานะ CONFIRMED",
      );
    }

    return failure("DATABASE_ERROR", "ไม่สามารถยกเลิกการจองได้");
  }

  if (!data) {
    return failure("NOT_FOUND", "ไม่พบรายการจองที่สามารถยกเลิกได้");
  }

  clearMyBookingsCache();
  return success(data);
}

export async function getBookedParticipantCount(scheduleId) {
  const capacityResult = await getScheduleCapacity(scheduleId);

  if (!capacityResult.success) {
    return capacityResult;
  }

  return success(capacityResult.data.bookedParticipants);
}

export async function getScheduleCapacity(scheduleId) {
  if (!scheduleId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสรอบนำเที่ยว");
  }

  const { data, error } = await supabase.rpc("get_schedule_capacity", {
    p_schedule_id: scheduleId,
  });

  if (error) {
    const message = error.message || "";

    if (message.includes("NOT_FOUND")) {
      return failure("NOT_FOUND", "ไม่พบรอบนำเที่ยว");
    }

    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบจำนวนที่นั่งคงเหลือได้");
  }

  const capacity = Array.isArray(data) ? data[0] : data;

  if (!capacity) {
    return failure("NOT_FOUND", "ไม่พบข้อมูลความจุของรอบนำเที่ยว");
  }

  return success({
    scheduleId: capacity.schedule_id,
    maxParticipants: capacity.max_participants,
    bookedParticipants: capacity.booked_participants,
    remainingSeats: capacity.remaining_seats,
    status: capacity.status,
  });
}
const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

// Supabase tour_date and end_time are DATE and TIME in Asia/Bangkok.
// Use a fixed UTC+7 offset so a visitor's local timezone or DST cannot
// alter the 12-hour deadline.
function getBangkokScheduleEndMs(schedule) {
  if (
    typeof schedule?.tour_date !== "string" ||
    typeof schedule?.end_time !== "string"
  ) {
    return null;
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schedule.tour_date);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(
    schedule.end_time,
  );
  if (!dateMatch || !timeMatch) return null;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = "0", fraction = ""] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fraction.padEnd(3, "0").slice(0, 3) || "0");

  const localAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  const check = new Date(localAsUtc);
  if (
    !Number.isFinite(localAsUtc) ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  return localAsUtc - BANGKOK_UTC_OFFSET_MS;
}

export function isBookingCompletedAfter12Hours(schedule, now = new Date()) {
  const endMs = getBangkokScheduleEndMs(schedule);
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  return (
    endMs !== null &&
    Number.isFinite(nowMs) &&
    nowMs >= endMs + TWELVE_HOURS_MS
  );
}

// Display status only: keep booking.status unchanged in Supabase.
// Review permission must still depend on the real COMPLETED status.
export function getBookingDisplayStatus(booking, now = new Date()) {
  if (!booking) return null;

  if (
    booking.status === "CONFIRMED" &&
    isBookingCompletedAfter12Hours(booking.tour_schedules, now)
  ) {
    return "COMPLETED";
  }

  return booking.status;
}