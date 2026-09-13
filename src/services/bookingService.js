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
      return failure(
        "FORBIDDEN",
        "บัญชีนี้ไม่มีสิทธิ์จองรอบนำเที่ยว",
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
      return failure(
        "VALIDATION_ERROR",
        "ข้อมูลการจองไม่ถูกต้อง",
      );
    }

    return failure("DATABASE_ERROR", "ไม่สามารถสร้างการจองได้");
  }

  return success({
    bookingId: data,
    status: "CONFIRMED",
  });
}

export async function listMyBookings() {
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

  const { data, error } = await supabase
    .from("bookings")
    .select(`
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
    `)
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

  if (!user) {
    return failure("AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูรายละเอียดการจอง");
  }

  if (userError) {
    return failure("DATABASE_ERROR", "ไม่สามารถตรวจสอบผู้ใช้งานได้");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(`
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
    `)
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

  return success(data);
}

export async function getBookedParticipantCount(scheduleId) {
  const capacityResult = await getScheduleCapacity(scheduleId);

  if (!capacityResult.success) {
    return capacityResult;
  }

  return success(
    capacityResult.data.bookedParticipants,
  );
}


export async function getScheduleCapacity(scheduleId) {
  if (!scheduleId) {
    return failure(
      "VALIDATION_ERROR",
      "ไม่พบรหัสรอบนำเที่ยว",
    );
  }

  const { data, error } = await supabase.rpc(
    "get_schedule_capacity",
    {
      p_schedule_id: scheduleId,
    },
  );

  if (error) {
    const message = error.message || "";

    if (message.includes("NOT_FOUND")) {
      return failure(
        "NOT_FOUND",
        "ไม่พบรอบนำเที่ยว",
      );
    }

    return failure(
      "DATABASE_ERROR",
      "ไม่สามารถตรวจสอบจำนวนที่นั่งคงเหลือได้",
    );
  }

  const capacity = Array.isArray(data)
    ? data[0]
    : data;

  if (!capacity) {
    return failure(
      "NOT_FOUND",
      "ไม่พบข้อมูลความจุของรอบนำเที่ยว",
    );
  }

  return success({
    scheduleId: capacity.schedule_id,
    maxParticipants: capacity.max_participants,
    bookedParticipants: capacity.booked_participants,
    remainingSeats: capacity.remaining_seats,
    status: capacity.status,
  });
}
