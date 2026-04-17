-- ============================================================
-- AASTMT Room Booking System — Complete Schema
-- Run this in the Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ── 1. ENUM TYPES (idempotent) ──────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'BRANCH_MANAGER', 'EMPLOYEE', 'SECRETARY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE room_type AS ENUM ('LECTURE', 'MULTI_PURPOSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ADMIN_APPROVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_type AS ENUM ('FIXED', 'EXCEPTIONAL', 'MULTI_PURPOSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. TABLES ───────────────────────────────────────────────

-- Users (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id         VARCHAR(50) UNIQUE NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    role                user_role   NOT NULL DEFAULT 'EMPLOYEE',
    can_view_availability BOOLEAN   DEFAULT FALSE,
    is_approved         BOOLEAN     DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- Add is_approved if upgrading from old schema
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    type       room_type   NOT NULL,
    is_active  BOOLEAN     DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Slots
CREATE TABLE IF NOT EXISTS public.time_slots (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time TIME    NOT NULL,
    end_time   TIME    NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            REFERENCES public.users(id) ON DELETE CASCADE,
    room_id             UUID            REFERENCES public.rooms(id) ON DELETE CASCADE,
    booking_date        DATE            NOT NULL,
    start_slot_id       UUID            REFERENCES public.time_slots(id),
    end_slot_id         UUID            REFERENCES public.time_slots(id),
    status              booking_status  DEFAULT 'PENDING',
    type                booking_type    NOT NULL,
    -- Multi-purpose fields (nullable for lecture bookings)
    purpose             TEXT,
    manager_name        VARCHAR(255),
    manager_title       VARCHAR(255),
    manager_mobile      VARCHAR(20),
    req_mic_qty         INTEGER         DEFAULT 0,
    req_laptop          BOOLEAN         DEFAULT FALSE,
    req_video_conf      BOOLEAN         DEFAULT FALSE,
    -- Admin/rejection notes
    rejection_reason    TEXT,
    suggested_alternative TEXT,
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- Delegations
CREATE TABLE IF NOT EXISTS public.delegations (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_user_id     UUID    REFERENCES public.users(id) ON DELETE CASCADE,
    substitute_user_id  UUID    REFERENCES public.users(id) ON DELETE CASCADE,
    start_date          DATE    NOT NULL,
    end_date            DATE    NOT NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. INDEXES ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bookings_date        ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user        ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room        ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_delegations_sub      ON public.delegations(substitute_user_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id    ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_approved       ON public.users(is_approved);

-- ── 4. HELPER FUNCTION (avoids RLS recursion) ───────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

-- ── 5. TRIGGER: auto-update updated_at ──────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. ROW LEVEL SECURITY ───────────────────────────────────

ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Public read active rooms"        ON public.rooms;
DROP POLICY IF EXISTS "Admins manage rooms"             ON public.rooms;
DROP POLICY IF EXISTS "Public read active slots"        ON public.time_slots;
DROP POLICY IF EXISTS "Admins manage time slots"        ON public.time_slots;
DROP POLICY IF EXISTS "Users read own profile"          ON public.users;
DROP POLICY IF EXISTS "Admins read all users"           ON public.users;
DROP POLICY IF EXISTS "Admins update users"             ON public.users;
DROP POLICY IF EXISTS "Insert own profile"              ON public.users;
DROP POLICY IF EXISTS "Users read own bookings"         ON public.bookings;
DROP POLICY IF EXISTS "Users insert own bookings"       ON public.bookings;
DROP POLICY IF EXISTS "Admins manage bookings"          ON public.bookings;
DROP POLICY IF EXISTS "Users read own delegations"      ON public.delegations;
DROP POLICY IF EXISTS "Admins manage delegations"       ON public.delegations;

-- ROOMS
CREATE POLICY "Public read active rooms"
  ON public.rooms FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins manage rooms"
  ON public.rooms FOR ALL
  USING (get_my_role() IN ('ADMIN', 'BRANCH_MANAGER'));

-- TIME SLOTS
CREATE POLICY "Public read active slots"
  ON public.time_slots FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins manage time slots"
  ON public.time_slots FOR ALL
  USING (get_my_role() IN ('ADMIN', 'BRANCH_MANAGER'));

-- USERS
CREATE POLICY "Users read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins read all users"
  ON public.users FOR SELECT
  USING (get_my_role() IN ('ADMIN', 'BRANCH_MANAGER'));

CREATE POLICY "Admins update users"
  ON public.users FOR UPDATE
  USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "Admins delete users"
  ON public.users FOR DELETE
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "Insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- BOOKINGS
CREATE POLICY "Users read own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage bookings"
  ON public.bookings FOR ALL
  USING (get_my_role() IN ('ADMIN', 'BRANCH_MANAGER'));

-- DELEGATIONS
CREATE POLICY "Users read own delegations"
  ON public.delegations FOR SELECT
  USING (auth.uid() = primary_user_id OR auth.uid() = substitute_user_id);

CREATE POLICY "Admins manage delegations"
  ON public.delegations FOR ALL
  USING (get_my_role() = 'ADMIN');

-- ── 7. SEED DATA ────────────────────────────────────────────

-- Rooms (insert only if table is empty)
INSERT INTO public.rooms (name, type, is_active)
SELECT name, type::room_type, is_active
FROM (VALUES
  ('Lecture Hall A',      'LECTURE',       TRUE),
  ('Lecture Hall B',      'LECTURE',       TRUE),
  ('Section Room 101',    'LECTURE',       TRUE),
  ('Section Room 102',    'LECTURE',       TRUE),
  ('Section Room 201',    'LECTURE',       TRUE),
  ('Main Conference Hall','MULTI_PURPOSE', TRUE),
  ('Seminar Room 1',      'MULTI_PURPOSE', TRUE),
  ('Seminar Room 2',      'MULTI_PURPOSE', TRUE)
) AS v(name, type, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.rooms LIMIT 1);

-- Time slots (insert only if table is empty)
INSERT INTO public.time_slots (start_time, end_time, is_active)
SELECT start_time::time, end_time::time, is_active
FROM (VALUES
  ('08:00:00', '09:30:00', TRUE),
  ('09:30:00', '11:00:00', TRUE),
  ('11:00:00', '12:30:00', TRUE),
  ('12:30:00', '14:00:00', TRUE),
  ('14:00:00', '15:30:00', TRUE),
  ('15:30:00', '17:00:00', TRUE),
  ('17:00:00', '18:30:00', TRUE)
) AS v(start_time, end_time, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.time_slots LIMIT 1);

-- ============================================================
-- ADMIN SETUP INSTRUCTIONS
-- ============================================================
-- Step 1: In Supabase Dashboard → Authentication → Users → "Add user"
--         Email:    admin@aastmt.edu   (Employee ID: "admin")
--         Password: (choose a strong password)
--         !! IMPORTANT: Set "Auto Confirm User" = ON  !!
--
-- Step 2: Copy the UUID of the newly created auth user, then run:
--
--   INSERT INTO public.users (id, employee_id, full_name, role, is_approved, can_view_availability)
--   VALUES (
--     'PASTE_AUTH_USER_UUID_HERE',
--     'ADMIN',
--     'System Administrator',
--     'ADMIN',
--     TRUE,
--     TRUE
--   );
--
-- Step 3: Login at /login with Employee ID "admin" and your chosen password.
--
-- For BRANCH_MANAGER, repeat with a different employee_id and role = 'BRANCH_MANAGER'.
-- For auto-confirm to work without email verification, go to:
--   Supabase → Authentication → Settings → disable "Enable email confirmations"
-- ============================================================
