-- Period Tracker tables

create table if not exists cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date,
  cycle_length integer,
  period_length integer,
  notes text,
  created_at timestamptz default now()
);

create table if not exists period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  cycle_entry_id uuid references cycle_entries(id) on delete cascade not null,
  date date not null,
  flow text,
  symptoms jsonb default '[]',
  mood text,
  temperature decimal(4,1),
  discharge text,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists birth_control_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  time text not null,
  message text not null,
  enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists user_cycle_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  average_cycle_length integer default 28,
  average_period_length integer default 5,
  temperature_unit text default 'C',
  notifications_enabled boolean default true,
  symptom_reminder_time text default '21:00',
  updated_at timestamptz default now()
);

-- RLS
alter table cycle_entries enable row level security;
alter table period_logs enable row level security;
alter table birth_control_reminders enable row level security;
alter table user_cycle_settings enable row level security;

create policy "Users can manage own cycle entries" on cycle_entries for all using (auth.uid() = user_id);
create policy "Users can manage own period logs" on period_logs for all using (auth.uid() = user_id);
create policy "Users can manage own birth control reminders" on birth_control_reminders for all using (auth.uid() = user_id);
create policy "Users can manage own cycle settings" on user_cycle_settings for all using (auth.uid() = user_id);
