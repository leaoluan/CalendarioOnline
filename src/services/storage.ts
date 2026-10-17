import { supabase } from '../lib/supabase';
import { CalendarEvent, CategoryDefinition, NotificationItem } from '../types/calendar';

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
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error loading events:', error);
    return [];
  }
  return (data || []).map(rowToEvent);
}

export async function saveUserEvent(userId: string, event: CalendarEvent): Promise<void> {
  const row = { ...eventToRow(event), user_id: userId, id: event.id };
  const { error } = await supabase
    .from('events')
    .upsert(row);

  if (error) {
    console.error('Error saving event:', error);
    throw error;
  }
}

export async function deleteUserEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
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
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading categories:', error);
    return DEFAULT_CATEGORIES;
  }

  if (!data || data.length === 0) {
    // Seed default categories for new users
    await saveUserCategories(userId, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }

  return data.map((c: any) => ({
    id: c.name.toLowerCase().replace(/\s+/g, '-'),
    name: c.name,
    color: c.color,
    icon: c.icon || undefined,
    isDefault: c.is_default,
  }));
}

export async function saveUserCategories(userId: string, categories: CategoryDefinition[]): Promise<void> {
  // Delete existing and re-insert (simple approach for category management)
  await supabase.from('categories').delete().eq('user_id', userId);

  const rows = categories.map(c => ({
    user_id: userId,
    name: c.name,
    color: c.color,
    icon: c.icon || null,
    is_default: c.isDefault || false,
  }));

  const { error } = await supabase.from('categories').insert(rows);
  if (error) {
    console.error('Error saving categories:', error);
  }
}

export async function saveUserCategory(userId: string, category: CategoryDefinition): Promise<void> {
  const row = {
    user_id: userId,
    name: category.name,
    color: category.color,
    icon: category.icon || null,
    is_default: category.isDefault || false,
  };

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', category.name)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('categories')
      .update({ color: category.color, icon: category.icon || null, is_default: category.isDefault || false })
      .eq('id', existing.id);
  } else {
    await supabase.from('categories').insert(row);
  }
}

export async function deleteUserCategory(userId: string, categoryId: string): Promise<void> {
  // categoryId is the name-based slug, so we need to find by name
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);

  if (data) {
    const target = data.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === categoryId);
    if (target) {
      await supabase.from('categories').delete().eq('id', target.id);
    }
  }
}

// === Notifications ===
export async function loadNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error loading notifications:', error);
    return [];
  }

  return (data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: n.created_at,
    type: n.type,
    read: n.read,
    eventId: n.event_id || undefined,
  }));
}

export async function saveNotification(userId: string, notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    event_id: notification.eventId || null,
  });

  if (error) {
    console.error('Error saving notification:', error);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function clearAllNotifications(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);
}

// === Google Token Storage (per user) ===
export async function loadGoogleToken(userId: string): Promise<{ accessToken: string; refreshToken: string | null; email: string | null } | null> {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.email,
  };
}

export async function saveGoogleToken(userId: string, accessToken: string, refreshToken: string | null, email: string | null): Promise<void> {
  const { error } = await supabase
    .from('google_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      email,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving google token:', error);
  }
}

export async function deleteGoogleToken(userId: string): Promise<void> {
  await supabase.from('google_tokens').delete().eq('user_id', userId);
}

// === Utility functions (kept from original) ===
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
