import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Habit extends Model {
  static table = 'habits'

  @field('name') name!: string
  @field('icon') icon!: string | null
  @field('frequency') frequency!: string
  @readonly @date('created_at') createdAt!: Date
  @field('archived') archived!: boolean
}
