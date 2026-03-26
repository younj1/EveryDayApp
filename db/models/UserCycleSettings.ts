import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class UserCycleSettings extends Model {
  static table = 'user_cycle_settings'

  @field('average_cycle_length') averageCycleLength!: number
  @field('average_period_length') averagePeriodLength!: number
  @field('temperature_unit') temperatureUnit!: string
  @field('notifications_enabled') notificationsEnabled!: boolean
  @field('symptom_reminder_time') symptomReminderTime!: string | null
}
