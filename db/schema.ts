import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'type', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'merchant', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },
        { name: 'source', type: 'string' },
        { name: 'receipt_image_url', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'impulse_buys',
      columns: [
        { name: 'item_name', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'wait_days', type: 'number' },
        { name: 'remind_at', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'food_entries',
      columns: [
        { name: 'meal_type', type: 'string' },
        { name: 'food_name', type: 'string' },
        { name: 'calories', type: 'number' },
        { name: 'protein', type: 'number' },
        { name: 'carbs', type: 'number' },
        { name: 'fat', type: 'number' },
        { name: 'date', type: 'number' },
        { name: 'source', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'water_entries',
      columns: [
        { name: 'amount_ml', type: 'number' },
        { name: 'date', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'garmin_syncs',
      columns: [
        { name: 'date', type: 'number' },
        { name: 'steps', type: 'number', isOptional: true },
        { name: 'heart_rate', type: 'number', isOptional: true },
        { name: 'calories_burned', type: 'number', isOptional: true },
        { name: 'active_minutes', type: 'number', isOptional: true },
        { name: 'sleep_hours', type: 'number', isOptional: true },
        { name: 'sleep_score', type: 'number', isOptional: true },
        { name: 'stress', type: 'number', isOptional: true },
        { name: 'hrv', type: 'number', isOptional: true },
        { name: 'spo2', type: 'number', isOptional: true },
        { name: 'body_battery', type: 'number', isOptional: true },
        { name: 'raw_json', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'habits',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'frequency', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'archived', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'habit_logs',
      columns: [
        { name: 'habit_id', type: 'string', isIndexed: true },
        { name: 'completed_at', type: 'number' },
        { name: 'date', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'mood_logs',
      columns: [
        { name: 'mood', type: 'number' },
        { name: 'emoji', type: 'string', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'journal_entries',
      columns: [
        { name: 'content', type: 'string' },
        { name: 'date', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'completed', type: 'boolean' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
