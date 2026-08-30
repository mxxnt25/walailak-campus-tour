import { supabase } from '../lib/supabase';

const formatResponse = (data, error) => {
  if (error) {
    console.error('Supabase Error:', error);
    return { 
      success: false, 
      data: null, 
      error: { code: error.code || 'DATABASE_ERROR', message: error.message } 
    };
  }
  return { success: true, data, error: null };
};

export const listOpenSchedules = async (routeId = null) => {
  let query = supabase
    .from('tour_schedules')
    .select('*, routes(name, duration_minutes)')
    .eq('status', 'OPEN')
    .order('tour_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (routeId) {
    query = query.eq('route_id', routeId);
  }

  const { data, error } = await query;
  return formatResponse(data, error);
};

export const getScheduleDetail = async (scheduleId) => {
  if (!scheduleId) return formatResponse(null, { code: 'VALIDATION_ERROR', message: 'scheduleId is required' });

  const { data, error } = await supabase
    .from('tour_schedules')
    .select('*, routes(name, description), guide_assignments(guide_id, status)')
    .eq('id', scheduleId)
    .single();

  return formatResponse(data, error);
};

export const createSchedule = async (payload) => {
  const { data, error } = await supabase
    .from('tour_schedules')
    .insert([
      {
        route_id: payload.route_id,
        tour_date: payload.tour_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        max_participants: payload.max_participants,
        status: 'OPEN'
      }
    ])
    .select()
    .single();

  return formatResponse(data, error);
};

export const updateSchedule = async (scheduleId, patch) => {
  if (!scheduleId) return formatResponse(null, { code: 'VALIDATION_ERROR', message: 'scheduleId is required' });

  const { data, error } = await supabase
    .from('tour_schedules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .select()
    .single();

  return formatResponse(data, error);
};