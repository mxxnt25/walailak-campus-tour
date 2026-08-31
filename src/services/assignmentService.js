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

export const assignGuide = async ({ scheduleId, guideId }) => {
  if (!scheduleId || !guideId) {
    return formatResponse(null, { code: 'VALIDATION_ERROR', message: 'scheduleId and guideId are required' });
  }

  const { data, error } = await supabase
    .from('guide_assignments')
    .upsert(
      { 
        schedule_id: scheduleId, 
        guide_id: guideId,
        status: 'ASSIGNED',
        assigned_at: new Date().toISOString()
      },
      { onConflict: 'schedule_id' }
    )
    .select()
    .single();

  return formatResponse(data, error);
};

export const listMyGuideAssignments = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return formatResponse(null, { code: 'AUTH_REQUIRED', message: 'User is not authenticated' });
  }

  const userId = authData.user.id;

  const { data, error } = await supabase
    .from('guide_assignments')
    .select(`
      *,
      tour_schedules (
        tour_date,
        start_time,
        end_time,
        status,
        max_participants,
        routes (name)
      )
    `)
    .eq('guide_id', userId)
    .order('assigned_at', { ascending: false });

  return formatResponse(data, error);
};