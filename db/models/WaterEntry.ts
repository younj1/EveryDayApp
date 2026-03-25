import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class WaterEntry extends Model {
  static table = 'water_entries'

  @field('amount_ml') amountMl!: number
  @field('date') date!: number
}
