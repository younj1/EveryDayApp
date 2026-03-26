import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class CycleEntry extends Model {
  static table = 'cycle_entries'

  @field('start_date') startDate!: string
  @field('end_date') endDate!: string | null
  @field('cycle_length') cycleLength!: number | null
  @field('period_length') periodLength!: number | null
  @field('notes') notes!: string | null
  @field('created_at') createdAt!: number
}
