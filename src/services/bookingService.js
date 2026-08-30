import { supabase } from "../lib/supabase";

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

export async function createBooking({
  scheduleId,
  participantCount,
  specialRequest = null,
}) {
  // M3 implementation
}

export async function listMyBookings() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูรายการจอง");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return failure("DATABASE_ERROR", "ไม่สามารถโหลดรายการจองได้");
  }

  return success(data ?? []);
}

export async function getBookingDetail(bookingId) {
  if (!bookingId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสการจอง");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูรายละเอียดการจอง");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนยกเลิกการจอง");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookingError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบรายการจองได้");
  }

  if (!booking) {
    return failure("NOT_FOUND", "ไม่พบรายการจอง");
  }

  if (booking.status !== "CONFIRMED") {
    return failure(
      "VALIDATION_ERROR",
      "สามารถยกเลิกได้เฉพาะรายการจองที่มีสถานะ CONFIRMED",
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .eq("status", "CONFIRMED")
    .select()
    .maybeSingle();

  if (error) {
    return failure("DATABASE_ERROR", "ไม่สามารถยกเลิกการจองได้");
  }

  if (!data) {
    return failure("NOT_FOUND", "ไม่พบรายการจองที่สามารถยกเลิกได้");
  }

  return success(data);
}

export async function getBookedParticipantCount(scheduleId) {
  if (!scheduleId) {
    return failure("VALIDATION_ERROR", "ไม่พบรหัสรอบนำเที่ยว");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("participant_count")
    .eq("schedule_id", scheduleId)
    .eq("status", "CONFIRMED");

  if (error) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบจำนวนผู้จองได้");
  }

  const total = (data ?? []).reduce(
    (sum, booking) => sum + booking.participant_count,
    0,
  );

  return success(total);
}
