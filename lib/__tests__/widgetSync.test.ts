import { buildWidgetPayload } from '../widgetSync'

describe('buildWidgetPayload', () => {
  it('builds fitness payload', () => {
    const p = buildWidgetPayload('fitness', { steps: 8432, caloriesBurned: 412, activeMinutes: 38 })
    expect(p.type).toBe('fitness')
    expect(p.data.steps).toBe(8432)
  })

  it('builds nutrition payload', () => {
    const p = buildWidgetPayload('nutrition', { caloriesConsumed: 1400, caloriesGoal: 2000, waterMl: 1200, waterGoalMl: 2000 })
    expect(p.type).toBe('nutrition')
    expect(p.data.caloriesConsumed).toBe(1400)
  })

  it('includes updatedAt timestamp', () => {
    const p = buildWidgetPayload('fitness', { steps: 0, caloriesBurned: 0, activeMinutes: 0 })
    expect(typeof p.updatedAt).toBe('string')
  })
})
