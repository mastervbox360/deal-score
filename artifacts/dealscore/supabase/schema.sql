-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  company_name text,
  phone text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'pro_plus')),
  stripe_customer_id text,
  stripe_subscription_id text,
  brand_colour text,
  accent_colour text,
  logo_url text,
  ai_uses_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deals table
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reference text not null,
  strategy text not null check (strategy in ('BTL','HMO','FLIP','SA','BRRR','R2R','SOCIAL')),
  status text not null default 'analysing' check (status in ('analysing','reviewing','presenting','closed','dead')),
  address text,
  postcode text,
  purchase_price numeric,
  market_value numeric,
  inputs jsonb not null default '{}',
  notes text,
  packs_generated integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Investors table (address book)
create table public.investors (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  email text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deal investors junction table
create table public.deal_investors (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  investor_id uuid references public.investors(id) on delete cascade not null,
  status text not null default 'interested' check (status in ('interested','reviewing','fee_paid','not_interested','pack_released')),
  fee_received_at timestamptz,
  cooling_off_expires_at timestamptz,
  pack_released_at timestamptz,
  fee_amount numeric,
  outcome text check (outcome in ('refunded','transferred','retained')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activity log table
create table public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.investors enable row level security;
alter table public.deal_investors enable row level security;
alter table public.activity_log enable row level security;

-- RLS Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own deals" on public.deals for all using (auth.uid() = user_id);
create policy "Users can view own investors" on public.investors for all using (auth.uid() = user_id);
create policy "Users can view own deal investors" on public.deal_investors for all using (
  exists (select 1 from public.deals where deals.id = deal_investors.deal_id and deals.user_id = auth.uid())
);
create policy "Users can view own activity" on public.activity_log for all using (auth.uid() = user_id);

-- Auto-update updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.deals for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.investors for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.deal_investors for each row execute procedure public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
