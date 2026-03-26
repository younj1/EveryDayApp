create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique(sender_id, recipient_id)
);
alter table public.friend_requests enable row level security;
create policy "Users can see their own requests" on public.friend_requests for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send friend requests" on public.friend_requests for insert with check (auth.uid() = sender_id);
create policy "Recipient can update status" on public.friend_requests for update using (auth.uid() = recipient_id);

create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);
alter table public.friends enable row level security;
create policy "Users can see their own friendships" on public.friends for select using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create table public.partner_posts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
alter table public.partner_posts enable row level security;
create policy "Sender and recipient can see posts" on public.partner_posts for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send posts" on public.partner_posts for insert with check (auth.uid() = sender_id);
create policy "Recipient can mark seen" on public.partner_posts for update using (auth.uid() = recipient_id);

alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists push_token text;
create index if not exists profiles_username_idx on public.profiles(username);
