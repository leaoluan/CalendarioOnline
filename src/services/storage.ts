import { supabase, isLocalMode } from '../lib/supabase';
import { CalendarEvent, CategoryDefinition, NotificationItem } from '../types/calendar';

const LOCAL_STORAGE_KEYS = {
  EVENTS_PREFIX: 'chronos_events_',
  CATEGORIES_PREFIX: 'chronos_categories_',
  NOTIFICATIONS_PREFIX: 'chronos_notifications_',
  TOKENS_PREFIX: 'chronos_tokens_',
};

// Initial sample events for new users/local mode
function getSampleEvents(userId: string): CalendarEvent[] {
  const now = new Date();
  const todayStr = (hours: number, mins: number) => {
    const d = new Date(now);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };
  const tomorrowStr = (hours: number, mins: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'demo-event-1',
      title: 'Planejamento e Metas Semanais',
      description: 'Revisão estratégica de prioridades e entregas da semana no Chronos.',
      start: todayStr(9, 30),
      end: todayStr(10, 45),
      isAllDay: false,
      location: 'Google Meet',
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
      category: 'work',
      color: '#3b82f6',
      reminderMinutes: [15],
      isGoogleSynced: false,
      recurring: 'weekly',
      syncStatus: 'synced',
      userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'demo-event-2',
      title: 'Treino Funcional & Corrida',
      description: 'Sessão aeróbica e condicionamento físico.',
      start: todayStr(18, 0),
      end: todayStr(19, 0),
      isAllDay: false,
      location: 'Parque / Academia',
      category: 'fitness',
      color: '#f97316',
      reminderMinutes: [30],
      isGoogleSynced: false,
      recurring: 'none',
      syncStatus: 'synced',
      userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'demo-event-3',
      title: 'Reunião de Alinhamento com Equipe',
      description: 'Alinhamento geral de projetos e sprint review.',
      start: tomorrowStr(14, 0),
      end: tomorrowStr(15, 0),
      isAllDay: false,
      location: 'Sala 04 / Presencial',
      category: 'meeting',
      color: '#8b5cf6',
      reminderMinutes: [10],
      isGoogleSynced: false,
      recurring: 'none',
      syncStatus: 'synced',
      userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

// Convert DB event row to CalendarEvent
function rowToEvent(row: any): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    start: row.start_time,
    end: row.end_time,
    isAllDay: row.is_all_day,
    location: row.location || undefined,
    hangoutLink: row.hangout_link || undefined,
    category: row.category,
    color: row.color,
    reminderMinutes: row.reminder_minutes || [15],
    isGoogleSynced: row.is_google_synced,
    googleEventId: row.google_event_id || undefined,
    recurring: row.recurring || 'none',
    syncStatus: row.sync_status || 'synced',
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert CalendarEvent to DB insert/update payload
function eventToRow(event: CalendarEvent) {
  return {
    title: event.title,
    description: event.description || '',
    start_time: event.start,
    end_time: event.end,
    is_all_day: event.isAllDay,
    location: event.location || '',
    hangout_link: event.hangoutLink || null,
    category: event.category,
    color: event.color,
    reminder_minutes: event.reminderMinutes,
    is_google_synced: event.isGoogleSynced,
    google_event_id: event.googleEventId || null,
    recurring: event.recurring || 'none',
    sync_status: event.syncStatus || 'synced',
  };
}

// === Events ===
export async function loadUserEvents(userId: string): Promise<CalendarEvent[]> {
  const localKey = `${LOCAL_STORAGE_KEYS.EVENTS_PREFIX}${userId}`;

  if (isLocalMode) {
    const raw = localStorage.getItem(localKey);
    if (!raw) {
      const sample = getSampleEvents(userId);
      localStorage.setItem(localKey, JSON.stringify(sample));
      return sample;
    }
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) {
      console.warn('Supabase load events warning, falling back to local storage:', error.message);
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : [];
    }
    const events = (data || []).map(rowToEvent);
    localStorage.setItem(localKey, JSON.stringify(events));
    return events;
  } catch (err) {
    console.warn('Supabase network error, loading local events:', err);
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveUserEvent(userId: string, event: CalendarEvent): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.EVENTS_PREFIX}${userId}`;

  // Always update local cache
  try {
    const raw = localStorage.getItem(localKey);
    let events: CalendarEvent[] = raw ? JSON.parse(raw) : [];
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
    } else {
      events.push(event);
    }
    localStorage.setItem(localKey, JSON.stringify(events));
  } catch (e) {
    console.error('Local save event error:', e);
  }

  if (isLocalMode) return;

  try {
    const row = { ...eventToRow(event), user_id: userId, id: event.id };
    const { error } = await supabase.from('events').upsert(row);
    if (error) {
      console.warn('Supabase upsert event warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase offline, saved event to local cache:', err);
  }
}

export async function deleteUserEvent(eventId: string): Promise<void> {
  // Update local storage across all user keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEYS.EVENTS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const events: CalendarEvent[] = JSON.parse(raw);
          const filtered = events.filter(e => e.id !== eventId);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch (e) {
    console.error('Local delete event error:', e);
  }

  if (isLocalMode) return;

  try {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
      console.warn('Supabase delete event warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase offline delete error:', err);
  }
}

// === Categories ===
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'work', name: 'Work', color: '#3b82f6', isDefault: true },
  { id: 'personal', name: 'Personal', color: '#10b981', isDefault: true },
  { id: 'fitness', name: 'Fitness', color: '#f97316', isDefault: true },
  { id: 'meeting', name: 'Meeting', color: '#8b5cf6', isDefault: true },
  { id: 'health', name: 'Health', color: '#06b6d4', isDefault: true },
  { id: 'urgent', name: 'Urgent', color: '#ef4444', isDefault: true },
  { id: 'study', name: 'Study & Learning', color: '#ec4899', isDefault: false },
  { id: 'finance', name: 'Finance', color: '#eab308', isDefault: false },
];

export async function loadUserCategories(userId: string): Promise<CategoryDefinition[]> {
  const localKey = `${LOCAL_STORAGE_KEYS.CATEGORIES_PREFIX}${userId}`;

  if (isLocalMode) {
    const raw = localStorage.getItem(localKey);
    if (!raw) {
      localStorage.setItem(localKey, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return DEFAULT_CATEGORIES;
    }
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      const raw = localStorage.getItem(localKey);
      if (raw) return JSON.parse(raw);
      await saveUserCategories(userId, DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }

    const categories = data.map((c: any) => ({
      id: c.name.toLowerCase().replace(/\s+/g, '-'),
      name: c.name,
      color: c.color,
      icon: c.icon || undefined,
      isDefault: c.is_default,
    }));
    localStorage.setItem(localKey, JSON.stringify(categories));
    return categories;
  } catch (err) {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  }
}

export async function saveUserCategories(userId: string, categories: CategoryDefinition[]): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.CATEGORIES_PREFIX}${userId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(categories));
  } catch (e) {
    console.error('Local save categories error:', e);
  }

  if (isLocalMode) return;

  try {
    await supabase.from('categories').delete().eq('user_id', userId);
    const rows = categories.map(c => ({
      user_id: userId,
      name: c.name,
      color: c.color,
      icon: c.icon || null,
      is_default: c.isDefault || false,
    }));
    await supabase.from('categories').insert(rows);
  } catch (err) {
    console.warn('Supabase categories save error:', err);
  }
}

export async function saveUserCategory(userId: string, category: CategoryDefinition): Promise<void> {
  const existing = await loadUserCategories(userId);
  const idx = existing.findIndex(c => c.id === category.id || c.name.toLowerCase() === category.name.toLowerCase());
  let updated: CategoryDefinition[];
  if (idx >= 0) {
    updated = [...existing];
    updated[idx] = category;
  } else {
    updated = [...existing, category];
  }
  await saveUserCategories(userId, updated);
}

export async function deleteUserCategory(userId: string, categoryId: string): Promise<void> {
  const existing = await loadUserCategories(userId);
  const updated = existing.filter(c => c.id !== categoryId && c.name.toLowerCase().replace(/\s+/g, '-') !== categoryId);
  await saveUserCategories(userId, updated);
}

// === Notifications ===
export async function loadNotifications(userId: string): Promise<NotificationItem[]> {
  const localKey = `${LOCAL_STORAGE_KEYS.NOTIFICATIONS_PREFIX}${userId}`;

  if (isLocalMode) {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : [];
    }

    const items = data.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: n.created_at,
      type: n.type,
      read: n.read,
      eventId: n.event_id || undefined,
    }));
    localStorage.setItem(localKey, JSON.stringify(items));
    return items;
  } catch (err) {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveNotification(userId: string, notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.NOTIFICATIONS_PREFIX}${userId}`;
  const newItem: NotificationItem = {
    ...notification,
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  try {
    const raw = localStorage.getItem(localKey);
    const list: NotificationItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(newItem);
    if (list.length > 50) list.pop();
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.error('Local save notification error:', e);
  }

  if (isLocalMode) return;

  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      event_id: notification.eventId || null,
    });
  } catch (err) {
    console.warn('Supabase notification save error:', err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.NOTIFICATIONS_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: NotificationItem[] = JSON.parse(raw);
      list.forEach(n => { n.read = true; });
      localStorage.setItem(localKey, JSON.stringify(list));
    }
  } catch (e) {
    console.error(e);
  }

  if (isLocalMode) return;

  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  } catch (e) {
    console.warn(e);
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.NOTIFICATIONS_PREFIX}${userId}`;
  localStorage.removeItem(localKey);

  if (isLocalMode) return;

  try {
    await supabase.from('notifications').delete().eq('user_id', userId);
  } catch (e) {
    console.warn(e);
  }
}

// === Google Token Storage (per user) ===
export async function loadGoogleToken(userId: string): Promise<{ accessToken: string; refreshToken: string | null; email: string | null } | null> {
  const localKey = `${LOCAL_STORAGE_KEYS.TOKENS_PREFIX}${userId}`;

  if (isLocalMode) {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : null;
  }

  try {
    const { data, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : null;
    }
    const token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      email: data.email,
    };
    localStorage.setItem(localKey, JSON.stringify(token));
    return token;
  } catch (err) {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveGoogleToken(userId: string, accessToken: string, refreshToken: string | null, email: string | null): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.TOKENS_PREFIX}${userId}`;
  const token = { accessToken, refreshToken, email };
  try {
    localStorage.setItem(localKey, JSON.stringify(token));
  } catch (e) {
    console.error(e);
  }

  if (isLocalMode) return;

  try {
    await supabase.from('google_tokens').upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      email,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase save google token error:', err);
  }
}

export async function deleteGoogleToken(userId: string): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEYS.TOKENS_PREFIX}${userId}`;
  localStorage.removeItem(localKey);

  if (isLocalMode) return;

  try {
    await supabase.from('google_tokens').delete().eq('user_id', userId);
  } catch (e) {
    console.warn(e);
  }
}

// === Utility functions ===
export function resolveEventColor(
  event: CalendarEvent,
  categories?: CategoryDefinition[]
): string {
  if (event.color && event.color.startsWith('#')) {
    return event.color;
  }
  if (categories && event.category) {
    const matched = categories.find(
      (c) =>
        c.id.toLowerCase() === event.category.toLowerCase() ||
        c.name.toLowerCase() === event.category.toLowerCase()
    );
    if (matched?.color) return matched.color;
  }
  const defaultMatch = DEFAULT_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === (event.category || '').toLowerCase() ||
      c.name.toLowerCase() === (event.category || '').toLowerCase()
  );
  if (defaultMatch?.color) return defaultMatch.color;
  return '#3b82f6';
}

export function getCategoryName(
  categoryId: string | undefined,
  categories?: CategoryDefinition[]
): string {
  if (!categoryId) return 'Geral';
  if (categories) {
    const match = categories.find(
      (c) =>
        c.id.toLowerCase() === categoryId.toLowerCase() ||
        c.name.toLowerCase() === categoryId.toLowerCase()
    );
    if (match) return match.name;
  }
  const defaultMatch = DEFAULT_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === categoryId.toLowerCase() ||
      c.name.toLowerCase() === categoryId.toLowerCase()
  );
  if (defaultMatch) return defaultMatch.name;
  return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

export function matchesEventSearch(event: CalendarEvent, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const titleMatch = (event.title || '').toLowerCase().includes(q);
  const descMatch = (event.description || '').toLowerCase().includes(q);
  const locMatch = (event.location || '').toLowerCase().includes(q);
  const catMatch = (event.category || '').toLowerCase().includes(q);
  return titleMatch || descMatch || locMatch || catMatch;
}

export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
