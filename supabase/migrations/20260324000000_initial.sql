-- Users profile
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Plaid tokens
create table if not exists plaid_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  access_token text not null,
  item_id text,
  created_at timestamptz default now(),
  unique(user_id)
);

-- Garmin tokens
create table if not exists garmin_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  unique(user_id)
);

-- Garmin sync data
create table if not exists garmin_syncs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  steps int,
  heart_rate int,
  calories_burned int,
  active_minutes int,
  sleep_hours numeric,
  sleep_score int,
  stress int,
  hrv int,
  spo2 int,
  body_battery int,
  raw_json jsonb,
  unique(user_id, date)
);

-- Transactions
create table if not exists transactions (
  id text primary key,
  user_id uuid references auth.users not null,
  plaid_transaction_id text unique,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  merchant text,
  date timestamptz,
  source text check (source in ('plaid', 'manual', 'receipt')),
  receipt_image_url text,
  notes text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table plaid_tokens enable row level security;
alter table garmin_tokens enable row level security;
alter table garmin_syncs enable row level security;
alter table transactions enable row level security;

-- RLS policies: users can only access their own data
create policy "Own profile" on profiles for all using (auth.uid() = id);
create policy "Own plaid tokens" on plaid_tokens for all using (auth.uid() = user_id);
create policy "Own garmin tokens" on garmin_tokens for all using (auth.uid() = user_id);
create policy "Own garmin syncs" on garmin_syncs for all using (auth.uid() = user_id);
create policy "Own transactions" on transactions for all using (auth.uid() = user_id);
