import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://configuration-missing.invalid',
  supabaseAnonKey || 'configuration-missing',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatar: string;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  preferences: {
    theme: 'dark' | 'light' | 'oled' | 'system';
    glassOpacity: number;
    gesturesEnabled: boolean;
    swipeSensitivity: number;
    autoSyncInterval: number;
    soundAlerts: boolean;
    defaultView: 'month' | 'week' | 'day' | 'agenda' | 'horizon24h';
    customGestures: {
      swipeLeft: string;
      swipeRight: string;
      swipeDown: string;
      doubleTap: string;
    };
  };
  created_at: string;
};

export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string | null;
  hangout_link: string | null;
  category: string;
  color: string;
  reminder_minutes: number[];
  is_google_synced: boolean;
  google_event_id: string | null;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';
  sync_status: 'synced' | 'pending' | 'offline_queued';
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  event_id: string | null;
  created_at: string;
};

export type GoogleTokenRow = {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  email: string | null;
  updated_at: string;
};
