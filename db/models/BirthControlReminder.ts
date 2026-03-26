import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class BirthControlReminder extends Model {
  static table = 'birth_control_reminders'

  @field('label') label!: string
  @field('time') time!: string
  @field('message') message!: string
  @field('enabled') enabled!: boolean
  @field('created_at') createdAt!: number
}
