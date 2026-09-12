import { supabase } from '../lib/supabase'

export async function listAuditLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', {
      ascending: false,
    })

  if (error) throw error

  return data
}