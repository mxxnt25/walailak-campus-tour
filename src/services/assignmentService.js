import { supabase } from "../lib/supabase";

import { formatResponse } from "./m4/response";

export const assignGuide = async ({ scheduleId, guideId }) => {
  if (!scheduleId || !guideId) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "scheduleId and guideId are required",
    });
  }

  const { data, error } = await supabase.rpc("assign_guide", {
    p_schedule_id: scheduleId,
    p_guide_id: guideId,
  });

  return formatResponse(data, error);
};

export const listMyGuideAssignments = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return formatResponse(null, {
      code: "AUTH_REQUIRED",
      message: "User is not authenticated",
    });
  }

  const userId = authData.user.id;

  const { data, error } = await supabase
    .from("guide_assignments")
    .select(
      `
      *,
      tour_schedules (
        tour_date,
        start_time,
        end_time,
        status,
        max_participants,
        routes (name)
      )
    `,
    )
    .eq("guide_id", userId)
    .order("assigned_at", { ascending: false });

  return formatResponse(data, error);
};

export const updateMyAssignmentStatus = async (assignmentId, status) => {
  if (!assignmentId) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "assignmentId is required",
    });
  }

  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "status must be ACCEPTED or DECLINED",
    });
  }

  const { data, error } = await supabase.rpc("update_my_assignment_status", {
    p_assignment_id: assignmentId,
    p_status: status,
  });

  return formatResponse(data, error);
};

export const getMyTourManifest = async (scheduleId) => {
  if (!scheduleId) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "scheduleId is required",
    });
  }

  const { data, error } = await supabase.rpc("get_my_tour_manifest", {
    p_schedule_id: scheduleId,
  });

  return formatResponse(data, error);
};

export const updateTourAttendance = async (bookingId, status) => {
  if (!bookingId) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "bookingId is required",
    });
  }

  if (!["NOT_CHECKED_IN", "CHECKED_IN", "NO_SHOW"].includes(status)) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "Invalid attendance status",
    });
  }

  const { data, error } = await supabase.rpc("update_tour_attendance", {
    p_booking_id: bookingId,
    p_status: status,
  });

  return formatResponse(data, error);
};
