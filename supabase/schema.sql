-- ============================================
-- Hustle Barber — Supabase схема
-- ============================================
-- Минимална схема за MVP booking системата.
-- Изпълни този файл в Supabase SQL Editor.
-- ============================================

-- 1. Бизнес (бръснарница)
create table business (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null
);

-- 2. Услуги
create table services (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references business(id),
  name text not null,
  duration_minutes integer not null
);

-- 3. Работно време
create table working_hours (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references business(id),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);

-- 4. Резервации
create table bookings (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references business(id),
  service_id uuid not null references services(id),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status text not null default 'pending'
);
