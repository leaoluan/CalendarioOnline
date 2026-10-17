import { CalendarEvent, UserProfile, NotificationItem, CategoryDefinition } from '../types/calendar';

const STORAGE_KEYS = {
  USERS: 'chronos_users_list',
  ACTIVE_USER_ID: 'chronos_active_user_id',
  EVENTS_PREFIX: 'chronos_events_',
  CATEGORIES_PREFIX: 'chronos_categories_',
  NOTIFICATIONS: 'chronos_notifications',
  SYSTEM_THEME: 'chronos_theme'
};

const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-1',
    name: 'Luan Leão',
    email: 'luanleao12@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'ADMIN',
    isGoogleConnected: true,
    googleEmail: 'luanleao12@gmail.com',
    twoFactorEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    backupCodes: ['CHRONOS-8921', 'CHRONOS-4412', 'CHRONOS-9903', 'CHRONOS-1175'],
    preferences: {
      theme: 'dark',
      glassOpacity: 75,
      gesturesEnabled: true,
      swipeSensitivity: 80,
      autoSyncInterval: 5,
      soundAlerts: true,
      defaultView: 'month',
      customGestures: {
        swipeLeft: 'next_period',
        swipeRight: 'prev_period',
        swipeDown: 'sync_now',
        doubleTap: 'quick_create'
      }
    }
  },
  {
    id: 'user-2',
    name: 'Trabalho & Projetos',
    email: 'trabalho@empresa.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'EDITOR',
    isGoogleConnected: false,
    twoFactorEnabled: true,
    twoFactorSecret: 'HXDMVJECJJWSRZ3U',
    backupCodes: ['CHRONOS-7714', 'CHRONOS-3319'],
    preferences: {
      theme: 'oled',
      glassOpacity: 85,
      gesturesEnabled: true,
      swipeSensitivity: 90,
      autoSyncInterval: 10,
      soundAlerts: true,
      defaultView: 'week',
      customGestures: {
        swipeLeft: 'next_period',
        swipeRight: 'prev_period',
        swipeDown: 'sync_now',
        doubleTap: 'quick_create'
      }
    }
  },
  {
    id: 'user-3',
    name: 'Família & Lazer',
    email: 'familia@casa.org',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'VIEWER',
    isGoogleConnected: false,
    twoFactorEnabled: false,
    preferences: {
      theme: 'dark',
      glassOpacity: 65,
      gesturesEnabled: true,
      swipeSensitivity: 80,
      autoSyncInterval: 15,
      soundAlerts: false,
      defaultView: 'horizon24h',
      customGestures: {
        swipeLeft: 'next_period',
        swipeRight: 'prev_period',
        swipeDown: 'sync_now',
        doubleTap: 'quick_create'
      }
    }
  }
];

export function getInitialUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  saveUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

export function saveUsers(users: UserProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
}

export function getActiveUserId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
    if (id) return id;
  } catch {}
  return DEFAULT_USERS[0].id;
}

export function setActiveUserId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
  } catch {}
}

// Generate realistic default events for initial display
export function generateSeedEvents(userId: string): CalendarEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const createIso = (dayOffset: number, hour: number, minute: number = 0) => {
    const dt = new Date(y, m, d + dayOffset, hour, minute, 0);
    return dt.toISOString();
  };

  return [
    {
      id: `ev-seed-1`,
      title: 'Alinhamento Estratégico com Diretoria',
      description: 'Revisão das metas trimestrais e prioridades de engenharia.',
      start: createIso(0, 10, 0),
      end: createIso(0, 11, 0),
      isAllDay: false,
      location: 'Sala Executiva Alpha & Google Meet',
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
      category: 'work',
      color: '#3b82f6',
      reminderMinutes: [15, 30],
      isGoogleSynced: true,
      googleEventId: 'g_seed_1',
      userId,
      syncStatus: 'synced'
    },
    {
      id: `ev-seed-2`,
      title: 'Treino Funcional & Cardio',
      description: 'Exercícios aeróbicos e musculação de alta intensidade.',
      start: createIso(0, 12, 30),
      end: createIso(0, 13, 30),
      isAllDay: false,
      location: 'Academia BodyTech',
      category: 'fitness',
      color: '#f97316',
      reminderMinutes: [30],
      isGoogleSynced: false,
      userId,
      syncStatus: 'synced'
    },
    {
      id: `ev-seed-3`,
      title: 'Review de Código & Arquitetura Cloud',
      description: 'Validação da integração Google Workspace e pipelines de deploy.',
      start: createIso(0, 15, 0),
      end: createIso(0, 16, 30),
      isAllDay: false,
      location: 'Google Meet',
      hangoutLink: 'https://meet.google.com/xyz-uvwx-rst',
      category: 'meeting',
      color: '#8b5cf6',
      reminderMinutes: [10],
      isGoogleSynced: true,
      googleEventId: 'g_seed_3',
      userId,
      syncStatus: 'synced'
    },
    {
      id: `ev-seed-4`,
      title: 'Entrega da Proposta Técnica do Projeto',
      description: 'Deadline fatal para envio do relatório de viabilidade aos clientes.',
      start: createIso(0, 18, 0),
      end: createIso(0, 19, 0),
      isAllDay: false,
      location: 'Portal de Clientes',
      category: 'urgent',
      color: '#ef4444',
      reminderMinutes: [60],
      isGoogleSynced: true,
      googleEventId: 'g_seed_4',
      userId,
      syncStatus: 'synced'
    },
    {
      id: `ev-seed-5`,
      title: 'Jantar em Família & Comemoração',
      description: 'Aniversário de formatura e encontro de fim de semana.',
      start: createIso(1, 20, 0),
      end: createIso(1, 22, 30),
      isAllDay: false,
      location: 'Restaurante Terraço Itália',
      category: 'personal',
      color: '#10b981',
      reminderMinutes: [60],
      isGoogleSynced: false,
      userId,
      syncStatus: 'synced'
    },
    {
      id: `ev-seed-6`,
      title: 'Planejamento Semanal com a Equipe',
      description: 'Sprint planning e alocação de tarefas para os próximos dias.',
      start: createIso(2, 9, 0),
      end: createIso(2, 10, 30),
      isAllDay: false,
      location: 'Google Meet',
      hangoutLink: 'https://meet.google.com/qpr-stuv-wxy',
      category: 'work',
      color: '#3b82f6',
      reminderMinutes: [15],
      isGoogleSynced: true,
      googleEventId: 'g_seed_6',
      userId,
      syncStatus: 'synced'
    }
  ];
}

export function loadUserEvents(userId: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.EVENTS_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  const seeds = generateSeedEvents(userId);
  saveUserEvents(userId, seeds);
  return seeds;
}

export function saveUserEvents(userId: string, events: CalendarEvent[]) {
  try {
    localStorage.setItem(`${STORAGE_KEYS.EVENTS_PREFIX}${userId}`, JSON.stringify(events));
  } catch (e) {
    console.error(e);
  }
}

export function getNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeds: NotificationItem[] = [
    {
      id: 'notif-1',
      title: 'Google Calendar Sincronizado',
      message: 'Todos os seus eventos da conta Google estão atualizados.',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      type: 'sync',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Horizonte 24 Horas Ativo',
      message: 'Você tem 4 eventos programados para hoje.',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      type: 'reminder',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Segurança 2FA',
      message: 'Autenticação em duas etapas ativa com chave TOTP protegida.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      type: 'security',
      read: true
    }
  ];
  saveNotifications(seeds);
  return seeds;
}

export function saveNotifications(notifications: NotificationItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch {}
}

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

export function loadUserCategories(userId: string): CategoryDefinition[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.CATEGORIES_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading categories:', e);
  }
  saveUserCategories(userId, DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

export function saveUserCategories(userId: string, categories: CategoryDefinition[]) {
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.CATEGORIES_PREFIX}${userId}`,
      JSON.stringify(categories)
    );
  } catch (e) {
    console.error('Error saving categories:', e);
  }
}

/**
 * Resolves the display color for an event, prioritizing the event's direct color,
 * then looking up the category's assigned color, and finally defaulting to blue.
 */
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

/**
 * Resolves the human-readable category name for an event.
 */
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

/**
 * Checks whether an event matches a global search query across title, description, or location.
 */
export function matchesEventSearch(event: CalendarEvent, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const titleMatch = (event.title || '').toLowerCase().includes(q);
  const descMatch = (event.description || '').toLowerCase().includes(q);
  const locMatch = (event.location || '').toLowerCase().includes(q);
  const catMatch = (event.category || '').toLowerCase().includes(q);
  return titleMatch || descMatch || locMatch || catMatch;
}


