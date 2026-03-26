import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import { Transaction } from './models/Transaction'
import { ImpulseBuy } from './models/ImpulseBuy'
import { FoodEntry } from './models/FoodEntry'
import { WaterEntry } from './models/WaterEntry'
import { GarminSync } from './models/GarminSync'
import { Habit } from './models/Habit'
import { HabitLog } from './models/HabitLog'
import { MoodLog } from './models/MoodLog'
import { JournalEntry } from './models/JournalEntry'
import { Task } from './models/Task'
import { CycleEntry } from './models/CycleEntry'
import { PeriodLog } from './models/PeriodLog'
import { BirthControlReminder } from './models/BirthControlReminder'
import { UserCycleSettings } from './models/UserCycleSettings'

const adapter = new SQLiteAdapter({
  schema,
  onSetUpError: (error) => {
    console.error('Database setup error:', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [
    Transaction,
    ImpulseBuy,
    FoodEntry,
    WaterEntry,
    GarminSync,
    Habit,
    HabitLog,
    MoodLog,
    JournalEntry,
    Task,
    CycleEntry,
    PeriodLog,
    BirthControlReminder,
    UserCycleSettings,
  ],
})
