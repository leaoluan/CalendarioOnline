import { createClient } from '@supabase/supabase-js';

// Read from build-time environment variables or browser localStorage configuration
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const envAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('chronos_supabase_url') || '' : '';
const localAnonKey = typeof window !== 'undefined' ? localStorage.getItem('chronos_supabase_anon_key') || '' : '';

export const activeSupabaseUrl = envUrl || localUrl;
export const activeSupabaseAnonKey = envAnonKey || localAnonKey;

const isPlaceholder = (url: string, key: string) => {
  if (!url || !key) return true;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true;
  if (url.includes('seu-projeto-id') || url.includes('placeholder')) return true;
  if (key.includes('seu_token_publico') || key.includes('placeholder')) return true;
  return false;
};

// If no valid cloud DB keys are present (or if using template placeholders), the app runs directly and reliably with local storage
export const isLocalMode = isPlaceholder(activeSupabaseUrl, activeSupabaseAnonKey) || (typeof window !== 'undefined' && localStorage.getItem('chronos_local_mode') === 'true');

// No config error ever blocks public users
export const supabaseConfigError = false;

// Helper to save Supabase keys in browser storage
export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chronos_supabase_url', url.trim());
    localStorage.setItem('chronos_supabase_anon_key', anonKey.trim());
    localStorage.removeItem('chronos_local_mode');
    window.location.reload();
  }
}

// Helper to enable local standalone demo mode
export function enableLocalMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chronos_local_mode', 'true');
    window.location.reload();
  }
}

// Helper to clear custom keys and reset
export function resetSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('chronos_supabase_url');
    localStorage.removeItem('chronos_supabase_anon_key');
    localStorage.removeItem('chronos_local_mode');
    window.location.reload();
  }
}

// Create Supabase client safely
const validUrl = activeSupabaseUrl.startsWith('http')
  ? activeSupabaseUrl
  : 'https://placeholder-project.supabase.co';

export const supabase = createClient(
  validUrl,
  activeSupabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

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
