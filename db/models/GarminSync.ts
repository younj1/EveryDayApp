import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class GarminSync extends Model {
  static table = 'garmin_syncs'

  @field('date') date!: number
  @field('steps') steps!: number | null
  @field('heart_rate') heartRate!: number | null
  @field('calories_burned') caloriesBurned!: number | null
  @field('active_minutes') activeMinutes!: number | null
  @field('sleep_hours') sleepHours!: number | null
  @field('sleep_score') sleepScore!: number | null
  @field('stress') stress!: number | null
  @field('hrv') hrv!: number | null
  @field('spo2') spo2!: number | null
  @field('body_battery') bodyBattery!: number | null
  @field('raw_json') rawJson!: string | null
}
