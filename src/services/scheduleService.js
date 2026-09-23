import { supabase } from "../lib/supabase";

import { formatResponse, request } from "./m4/response";
import { validateSchedule, isUpcoming, thaiToday } from "./m4/rules";

export const listOpenSchedules = async (routeId = null) => {
  let query = supabase
    .from("tour_schedules")
    .select(
      `
      *,
      routes(name, duration_minutes),
      guide_assignments(guide_id, status)
    `,
    )
    .eq("status", "OPEN")
    .order("tour_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (routeId) {
    query = query.eq("route_id", routeId);
  }

  const { data, error } = await query;
  return formatResponse(data, error);
};

export const listPublicSchedules = async (routeId = null) => {
  let query = supabase
    .from("tour_schedules")
    .select("*, routes(name, duration_minutes)")
    .in("status", ["OPEN", "FULL"])
    .gte("tour_date", thaiToday())
    .order("tour_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (routeId) {
    query = query.eq("route_id", routeId);
  }

  const { data, error } = await query;
  return formatResponse(
    data?.filter((schedule) => isUpcoming(schedule)),
    error,
  );
};

export const getScheduleDetail = async (scheduleId) => {
  if (!scheduleId)
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "scheduleId is required",
    });

  const { data, error } = await supabase
    .from("tour_schedules")
    .select("*, routes(name, description), guide_assignments(guide_id, status)")
    .eq("id", scheduleId)
    .single();

  return formatResponse(data, error);
};

export const getGuideNameForSchedule = async (scheduleId) => {
  if (!scheduleId) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "scheduleId is required",
    });
  }

  const { data, error } = await supabase.rpc("get_guide_name_for_schedule", {
    target_schedule_id: scheduleId,
  });

  return formatResponse(data, error);
};

export const createSchedule = async (payload) => {
  const errors = validateSchedule(payload || {});
  if (Object.keys(errors).length)
    return {
      success: false,
      data: null,
      error: { code: "VALIDATION_ERROR", message: Object.values(errors)[0] },
    };
  return request(() =>
    supabase
      .from("tour_schedules")
      .insert([
        {
          route_id: payload.route_id,
          tour_date: payload.tour_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          max_participants: Number(payload.max_participants),
          status: "OPEN",
        },
      ])
      .select()
      .single(),
  );
};

export const listAdminSchedules = async () =>
  request(() =>
    supabase
      .from("tour_schedules")
      .select(
        "*, routes(name, duration_minutes), guide_assignments(guide_id, status)",
      )
      .order("tour_date", { ascending: false })
      .order("start_time"),
  );

export const updateSchedule = async (scheduleId, patch) => {
  if (!scheduleId)
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "scheduleId is required",
    });

  const { data, error } = await supabase
    .from("tour_schedules")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", scheduleId)
    .select()
    .single();

  return formatResponse(data, error);
};

export const completeTour = async (scheduleId) => {
  if (!scheduleId) {
    return formatResponse(null, {
      code: "VALIDATION_ERROR",
      message: "scheduleId is required",
    });
  }

  const { data, error } = await supabase.rpc("complete_tour", {
    p_schedule_id: scheduleId,
  });

  return formatResponse(data, error);
};
