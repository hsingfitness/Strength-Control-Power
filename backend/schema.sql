-- Run this in the Supabase SQL Editor if you'd rather create the schema
-- explicitly than let the backend auto-create it on first startup.

create extension if not exists "uuid-ossp";

create table if not exists users (
    id uuid primary key default uuid_generate_v4(),
    name varchar(120) not null,
    email varchar(255) unique not null,
    password_hash varchar(255) not null,
    role varchar(20) not null default 'user', -- 'user' | 'operator' | 'super_admin'
    permissions jsonb not null default '{}'::jsonb, -- e.g. {"manage_products": true}, ignored for super_admin
    created_at timestamp default now()
);

create index if not exists idx_users_email on users (email);

-- After your first signup, make that account a super admin by running:
--   update users set role = 'super_admin' where email = 'you@example.com';
-- There's no signup flow that grants this role — it's intentionally
-- bootstrap-only so a random signup can't grant itself admin access.

create table if not exists products (
    id varchar(80) primary key, -- human-readable slug, e.g. 'omega-3-fish-oil'
    name varchar(200) not null,
    description varchar(500) not null default '',
    price numeric(10, 2) not null,
    category varchar(40) not null default 'supplements',
    icon varchar(10) not null default '💊',
    badges jsonb not null default '[]'::jsonb,
    stripe_payment_link varchar(500),
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

create table if not exists orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references users(id),
    items jsonb not null,
    amount_total numeric(10, 2) not null,
    currency varchar(10) default 'usd',
    stripe_session_id varchar(255) unique,
    status varchar(20) default 'pending',
    created_at timestamp default now()
);

create index if not exists idx_orders_user_id on orders (user_id);

alter table orders enable row level security;

create table if not exists reports (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references users(id),
    input jsonb not null,
    output jsonb not null,
    created_at timestamp default now()
);

create index if not exists idx_reports_user_id on reports (user_id);

alter table reports enable row level security;

-- The backend connects with the Postgres role directly (not through
-- Supabase's client libraries), so Row Level Security is not required for
-- this table to function — but it's good practice to enable it and lock
-- it down if you ever plan to query this table from the browser directly.
alter table users enable row level security;

create index if not exists idx_products_active on products (is_active);

alter table products enable row level security;

-- ---------------------------------------------------------------------
-- Migrating an EXISTING database (one that already has a users table
-- from before roles/permissions existed)
-- ---------------------------------------------------------------------
-- Base.metadata.create_all() (used by the backend on startup) only
-- creates tables that don't exist yet — it will NOT add new columns to
-- a table that's already there. If you deployed this backend before,
-- run this once by hand in the Supabase SQL editor:

alter table users add column if not exists role varchar(20) not null default 'user';
alter table users add column if not exists permissions jsonb not null default '{}'::jsonb;
