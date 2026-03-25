import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class ImpulseBuy extends Model {
  static table = 'impulse_buys'

  @field('item_name') itemName!: string
  @field('price') price!: number
  @field('wait_days') waitDays!: number
  @field('remind_at') remindAt!: number
  @field('status') status!: string
  @readonly @date('created_at') createdAt!: Date
}
