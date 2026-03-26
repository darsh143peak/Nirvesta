create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  age integer check (age >= 18 and age <= 120),
  email text,
  risk_attitude text,
  investing_experience text,
  primary_goal text,
  time_horizon_years integer,
  monthly_investable_surplus numeric,
  emergency_fund_months integer,
  email_notifications boolean default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    age,
    email,
    risk_attitude,
    investing_experience,
    primary_goal,
    time_horizon_years,
    monthly_investable_surplus,
    emergency_fund_months,
    email_notifications
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'age', '')::integer,
    new.email,
    new.raw_user_meta_data ->> 'risk_attitude',
    new.raw_user_meta_data ->> 'investing_experience',
    new.raw_user_meta_data ->> 'primary_goal',
    nullif(new.raw_user_meta_data ->> 'time_horizon_years', '')::integer,
    nullif(new.raw_user_meta_data ->> 'monthly_investable_surplus', '')::numeric,
    nullif(new.raw_user_meta_data ->> 'emergency_fund_months', '')::integer,
    coalesce((new.raw_user_meta_data ->> 'email_notifications')::boolean, true)
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    age = excluded.age,
    email = excluded.email,
    risk_attitude = excluded.risk_attitude,
    investing_experience = excluded.investing_experience,
    primary_goal = excluded.primary_goal,
    time_horizon_years = excluded.time_horizon_years,
    monthly_investable_surplus = excluded.monthly_investable_surplus,
    emergency_fund_months = excluded.emergency_fund_months,
    email_notifications = excluded.email_notifications,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_profile_updated_at();

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
