-- Run this in the Supabase SQL Editor if you'd rather create the schema
-- explicitly than let the backend auto-create it on first startup.

create extension if not exists "uuid-ossp";

create table if not exists users (
    id uuid primary key default uuid_generate_v4(),
    name varchar(120) not null,
    email varchar(255) unique not null,
    password_hash varchar(255) not null,
    created_at timestamp default now()
);

create index if not exists idx_users_email on users (email);

-- The backend connects with the Postgres role directly (not through
-- Supabase's client libraries), so Row Level Security is not required for
-- this table to function — but it's good practice to enable it and lock
-- it down if you ever plan to query this table from the browser directly.
alter table users enable row level security;
