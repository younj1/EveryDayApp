import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Transaction extends Model {
  static table = 'transactions'

  @field('type') type!: string
  @field('amount') amount!: number
  @field('category') category!: string
  @field('merchant') merchant!: string | null
  @date('date') date!: Date
  @field('source') source!: string
  @field('receipt_image_url') receiptImageUrl!: string | null
  @field('notes') notes!: string | null
}
