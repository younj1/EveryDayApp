import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Task extends Model {
  static table = 'tasks'

  @field('title') title!: string
  @field('completed') completed!: boolean
  @field('due_date') dueDate!: number | null
  @readonly @date('created_at') createdAt!: Date
}
