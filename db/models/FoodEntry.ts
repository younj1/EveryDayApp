import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class FoodEntry extends Model {
  static table = 'food_entries'

  @field('meal_type') mealType!: string
  @field('food_name') foodName!: string
  @field('calories') calories!: number
  @field('protein') protein!: number
  @field('carbs') carbs!: number
  @field('fat') fat!: number
  @field('date') date!: number
  @field('source') source!: string
}
