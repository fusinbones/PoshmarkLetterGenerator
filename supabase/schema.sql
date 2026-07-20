-- Run this in Supabase Dashboard → SQL Editor for project wvbcvnzclkvykhkpgkyh

create table if not exists public.users (
  id serial primary key,
  username text not null unique,
  password text not null
);

create table if not exists public.usage_tracking (
  id serial primary key,
  ip_address text not null,
  usage_count integer not null default 0,
  last_reset_date text not null
);

create unique index if not exists usage_tracking_ip_address_unique
  on public.usage_tracking (ip_address);

alter table public.users enable row level security;
alter table public.usage_tracking enable row level security;

-- No anon/authenticated policies: only the server (service role) accesses these tables.
