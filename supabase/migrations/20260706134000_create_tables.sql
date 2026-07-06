-- profiles
create table if not exists profiles (
  id uuid references auth.users primary key,
  body_scan_status text default 'not_started' check (body_scan_status in ('not_started', 'uploaded', 'processing', 'complete', 'failed')),
  lora_url text,
  lora_trained_at timestamptz,
  created_at timestamptz default now()
);

-- garments
create table if not exists garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  image_url text not null,
  segmented_url text,
  brand text,
  nickname text,
  type text not null check (type in ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory')),
  color text,
  fabric text,
  created_at timestamptz default now()
);

-- outfits
create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  garment_ids uuid[] not null,
  rendered_url text,
  pose text default 'front' check (pose in ('front', 'back')),
  created_at timestamptz default now()
);

-- render_cache
create table if not exists render_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  image_url text not null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 days'
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- trigger for new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- enable RLS
alter table profiles enable row level security;
alter table garments enable row level security;
alter table outfits enable row level security;
alter table render_cache enable row level security;

-- RLS policies
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can view own garments"
  on garments for select
  using (auth.uid() = user_id);

create policy "Users can insert own garments"
  on garments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own garments"
  on garments for update
  using (auth.uid() = user_id);

create policy "Users can delete own garments"
  on garments for delete
  using (auth.uid() = user_id);

create policy "Users can view own outfits"
  on outfits for select
  using (auth.uid() = user_id);

create policy "Users can insert own outfits"
  on outfits for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own outfits"
  on outfits for delete
  using (auth.uid() = user_id);

create policy "Anyone can read render_cache"
  on render_cache for select
  to authenticated
  using (true);
