/*
# Chronos Calendar — Multi-user schema with auth, profiles, events, categories, and Google tokens

## Purpose
Replaces the old localStorage-based user system with a proper Supabase-backed multi-user system.
Supports email/password login, admin-managed user creation with access levels (ADMIN/EDITOR/VIEWER),
per-user calendar events, custom categories, and per-user Google Calendar OAuth tokens.

## Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per auth user
- `name` (text) — display name
- `email` (text) — email (mirrors auth.users)
- `role` (text: 'ADMIN' | 'EDITOR' | 'VIEWER') — access level
- `avatar` (text) — avatar URL
- `two_factor_enabled` (boolean, default false)
- `two_factor_secret` (text, nullable)
- `preferences` (jsonb) — theme, glassOpacity, etc.
- `created_at` (timestamptz)

### events
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references profiles)
- `title`, `description`, `start_time`, `end_time`, `is_all_day`, `location`, `hangout_link`
- `category`, `color`, `reminder_minutes`, `is_google_synced`, `google_event_id`
- `recurring`, `sync_status`, `created_at`, `updated_at`

### categories
- id, user_id, name, color, icon, is_default, created_at

### google_tokens
- id, user_id (unique), access_token, refresh_token, expires_at, email, updated_at

### notifications
- id, user_id, title, message, type, read, event_id, created_at

## Security
All tables RLS-enabled, authenticated-only, owner-scoped via auth.uid() = user_id.
Admins can SELECT all profiles for user management.

## Notes
1. user_id defaults to auth.uid() so frontend inserts work without passing user_id.
2. Profile auto-created via trigger on auth.users insert.
3. `end` is reserved in PostgreSQL, so the events table uses `end_time` instead.
*/

-- === profiles table ===
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER')),
  avatar text DEFAULT '',
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  preferences jsonb DEFAULT '{"theme":"dark","glassOpacity":75,"gesturesEnabled":true,"swipeSensitivity":80,"autoSyncInterval":5,"soundAlerts":true,"defaultView":"month","customGestures":{"swipeLeft":"next_period","swipeRight":"prev_period","swipeDown":"sync_now","doubleTap":"quick_create"}}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_or_all_for_admin" ON profiles;
CREATE POLICY "select_own_or_all_for_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- === events table ===
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  location text DEFAULT '',
  hangout_link text,
  category text DEFAULT 'work',
  color text DEFAULT '#3b82f6',
  reminder_minutes int4[] DEFAULT '{15}',
  is_google_synced boolean DEFAULT false,
  google_event_id text,
  recurring text DEFAULT 'none' CHECK (recurring IN ('none', 'daily', 'weekly', 'monthly')),
  sync_status text DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'offline_queued')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_events" ON events;
CREATE POLICY "select_own_events" ON events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_events" ON events;
CREATE POLICY "insert_own_events" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_events" ON events;
CREATE POLICY "update_own_events" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_events" ON events;
CREATE POLICY "delete_own_events" ON events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);

-- === categories table ===
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  icon text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === google_tokens table ===
CREATE TABLE IF NOT EXISTS google_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  email text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_google_token" ON google_tokens;
CREATE POLICY "select_own_google_token" ON google_tokens FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_google_token" ON google_tokens;
CREATE POLICY "insert_own_google_token" ON google_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_google_token" ON google_tokens;
CREATE POLICY "update_own_google_token" ON google_tokens FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_google_token" ON google_tokens;
CREATE POLICY "delete_own_google_token" ON google_tokens FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === notifications table ===
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text DEFAULT '',
  type text DEFAULT 'system',
  read boolean DEFAULT false,
  event_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === Auto-create profile on signup ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
