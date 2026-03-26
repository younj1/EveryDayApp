import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class PeriodLog extends Model {
  static table = 'period_logs'

  @field('cycle_entry_id') cycleEntryId!: string
  @field('date') date!: string
  @field('flow') flow!: string | null
  @field('symptoms') symptoms!: string | null  // JSON array string
  @field('mood') mood!: string | null
  @field('temperature') temperature!: number | null
  @field('discharge') discharge!: string | null
  @field('notes') notes!: string | null
  @field('created_at') createdAt!: number
}
