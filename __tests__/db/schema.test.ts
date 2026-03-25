import { schema } from '@/db/schema'

describe('database schema', () => {
  it('has all required tables', () => {
    const tableNames = Object.keys(schema.tables)
    expect(tableNames).toContain('transactions')
    expect(tableNames).toContain('impulse_buys')
    expect(tableNames).toContain('food_entries')
    expect(tableNames).toContain('water_entries')
    expect(tableNames).toContain('garmin_syncs')
    expect(tableNames).toContain('habits')
    expect(tableNames).toContain('habit_logs')
    expect(tableNames).toContain('mood_logs')
    expect(tableNames).toContain('journal_entries')
    expect(tableNames).toContain('tasks')
  })
})
