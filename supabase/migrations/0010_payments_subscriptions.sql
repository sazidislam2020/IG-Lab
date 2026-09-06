-- Ignite Lab — Payments & Subscriptions
-- Run this in Supabase SQL Editor
--
-- Level 0 of every course is FREE.
-- After level 0, students need an active subscription plan to continue.

-- ---------------------------------------------------------------------
-- 1. user_subscriptions — tracks which plan a user has and when it expires
-- ---------------------------------------------------------------------
create table user_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  plan_name      text not null,              -- matches site_pricing_plans.name: 'Explorer', 'Builder', 'Engineer', etc.
  status         text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  started_at     timestamptz not null default now(),
  expires_at     timestamptz,                -- null = lifetime (e.g. free Explorer plan)
  created_at     timestamptz not null default now()
);

alter table user_subscriptions enable row level security;

-- Users can view their own subscriptions
create policy "Users can view own subscriptions"
  on user_subscriptions for select
  using (auth.uid() = user_id);

-- System can insert subscriptions (via function)
create policy "System can insert subscriptions"
  on user_subscriptions for insert
  with check (auth.uid() IS NOT NULL);

-- Admins can manage subscriptions
create policy "Admins can manage subscriptions"
  on user_subscriptions for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

create index user_subscriptions_user_id_idx on user_subscriptions(user_id);
create index user_subscriptions_status_idx on user_subscriptions(status);

-- ---------------------------------------------------------------------
-- 2. payments — records every payment transaction
-- ---------------------------------------------------------------------
create table payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  subscription_id   uuid references user_subscriptions(id) on delete set null,
  plan_name         text not null,
  amount            numeric(10,2) not null,     -- e.g. 500.00
  currency          text not null default 'BDT',
  payment_method    text not null default 'demo', -- 'demo', 'bkash', 'nagad', 'card', 'sslcommerz'
  transaction_id    text,                         -- demo: 'DEMO-TXN-{uuid}'
  status            text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

alter table payments enable row level security;

-- Users can view their own payments
create policy "Users can view own payments"
  on payments for select
  using (auth.uid() = user_id);

-- System can insert payments
create policy "System can insert payments"
  on payments for insert
  with check (auth.uid() IS NOT NULL);

-- Admins can view all payments
create policy "Admins can view all payments"
  on payments for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

-- Admins can manage payments
create policy "Admins can manage payments"
  on payments for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

create index payments_user_id_idx on payments(user_id);

-- ---------------------------------------------------------------------
-- 3. Auto-assign free Explorer plan to new users
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.user_subscriptions (user_id, plan_name, status, expires_at)
  values (new.id, 'Explorer', 'active', null);  -- null expires = lifetime
  return new;
end;
$$ language plpgsql security definer;

-- Attach to the existing trigger (fires when auth.users row is created)
-- We need a new trigger since the first one only handles profiles
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();
