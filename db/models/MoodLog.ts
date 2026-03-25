import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class MoodLog extends Model {
  static table = 'mood_logs'

  @field('mood') mood!: number
  @field('emoji') emoji!: string | null
  @field('note') note!: string | null
  @field('date') date!: number
}
