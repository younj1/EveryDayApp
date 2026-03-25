import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class JournalEntry extends Model {
  static table = 'journal_entries'

  @field('content') content!: string
  @field('date') date!: number
  @readonly @date('created_at') createdAt!: Date
}
