export type EventCategory = string;

export interface CategoryDefinition {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO String
  end: string;   // ISO String
  isAllDay: boolean;
  location?: string;
  hangoutLink?: string; // Google Meet or video conference link
  category: EventCategory;
  color: string;
  reminderMinutes: number[]; // e.g. [0, 15, 60] (minutes prior)
  isGoogleSynced: boolean;
  googleEventId?: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'offline_queued';
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'oled' | 'system';
  glassOpacity: number; // 30 to 100 (%)
  gesturesEnabled: boolean;
  swipeSensitivity: number; // 50 to 150 px
  autoSyncInterval: number; // in minutes (e.g. 5)
  soundAlerts: boolean;
  defaultView: 'month' | 'week' | 'day' | 'agenda' | 'horizon24h';
  customGestures: {
    swipeLeft: string;  // e.g. 'next_period'
    swipeRight: string; // e.g. 'prev_period'
    swipeDown: string;  // e.g. 'sync_now'
    doubleTap: string;  // e.g. 'quick_create'
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  isGoogleConnected: boolean;
  googleEmail?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  preferences: UserPreferences;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: 'SECURITY' | 'SYNC' | 'SYSTEM' | 'AUTH' | 'EVENT';
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  ip: string;
  details: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'reminder' | 'sync' | 'security' | 'system';
  read: boolean;
  eventId?: string;
}

export interface SystemUpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  releaseDate: string;
  releaseNotes: string[];
  lastChecked: string;
}

export interface OfflineMutation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  event: CalendarEvent;
  timestamp: number;
}
