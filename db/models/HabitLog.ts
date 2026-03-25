import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class HabitLog extends Model {
  static table = 'habit_logs'

  @field('habit_id') habitId!: string
  @field('completed_at') completedAt!: number
  @field('date') date!: number
}
