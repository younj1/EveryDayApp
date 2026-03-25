// Basic smoke test — verifies the supabase client can be imported and has expected shape
import { supabase } from '../supabase'

describe('supabase client', () => {
  it('exports a supabase client instance', () => {
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
    expect(typeof supabase.auth.signInWithPassword).toBe('function')
  })
})
