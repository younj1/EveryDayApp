import { supabase } from '@/lib/supabase'

export async function syncToCloud(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // WatermelonDB sync will be wired here when Supabase sync endpoint is ready
  // For now, this is a placeholder that confirms auth is working
}
