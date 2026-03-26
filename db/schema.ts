import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 2,
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
    tableSchema({
      name: 'cycle_entries',
      columns: [
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string', isOptional: true },
        { name: 'cycle_length', type: 'number', isOptional: true },
        { name: 'period_length', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'period_logs',
      columns: [
        { name: 'cycle_entry_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string' },
        { name: 'flow', type: 'string', isOptional: true },
        { name: 'symptoms', type: 'string', isOptional: true },
        { name: 'mood', type: 'string', isOptional: true },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'discharge', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'birth_control_reminders',
      columns: [
        { name: 'label', type: 'string' },
        { name: 'time', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'enabled', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'user_cycle_settings',
      columns: [
        { name: 'average_cycle_length', type: 'number' },
        { name: 'average_period_length', type: 'number' },
        { name: 'temperature_unit', type: 'string' },
        { name: 'notifications_enabled', type: 'boolean' },
        { name: 'symptom_reminder_time', type: 'string', isOptional: true },
      ],
    }),
  ],
})
