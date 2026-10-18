import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { AgendaView } from './components/AgendaView';
import { Horizon24h } from './components/Horizon24h';
import { AdminPanel } from './components/AdminPanel';
import { EventModal } from './components/EventModal';
import { WidgetDrawer } from './components/WidgetDrawer';
import { TwoFactorModal } from './components/TwoFactorModal';
import { NotificationsCenter } from './components/NotificationsCenter';
import { SystemUpdateModal } from './components/SystemUpdateModal';
import { GeminiInsightsModal } from './components/GeminiInsightsModal';
import { SettingsModal } from './components/SettingsModal';
import { FloatingMiniWidget } from './components/FloatingMiniWidget';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { GestureDetector } from './components/GestureDetector';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { SupabaseSetupScreen } from './components/SupabaseSetupScreen';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabaseConfigError, type Profile } from './lib/supabase';

import {
  CalendarEvent,
  UserProfile,
  UserPreferences,
  NotificationItem,
  SystemUpdateInfo,
  CategoryDefinition
} from './types/calendar';
import {
  loadUserEvents,
  saveUserEvent,
  deleteUserEvent,
  loadUserCategories,
  saveUserCategories,
  saveUserCategory,
  deleteUserCategory,
  loadNotifications,
  saveNotification,
  markAllNotificationsRead,
  clearAllNotifications,
  loadGoogleToken,
  saveGoogleToken,
  deleteGoogleToken,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken
} from './services/firebaseAuth';
import {
  fetchGoogleCalendarEvents,
  insertGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getOfflineMutations,
  queueOfflineMutation,
  processOfflineQueue
} from './services/googleCalendar';
import { sounds } from './services/soundEffects';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { CloudOff, Loader2 } from 'lucide-react';

const DEFAULT_PREFS: UserPreferences = {
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
    doubleTap: 'quick_create',
  },
};

function profileToUserProfile(profile: Profile): UserProfile {
  const prefs = profile.preferences || ({} as any);
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar || '',
    role: profile.role,
    isGoogleConnected: false,
    googleEmail: undefined,
    twoFactorEnabled: profile.two_factor_enabled,
    twoFactorSecret: profile.two_factor_secret || undefined,
    backupCodes: [],
    preferences: {
      theme: prefs.theme || 'dark',
      glassOpacity: prefs.glassOpacity ?? 75,
      gesturesEnabled: prefs.gesturesEnabled ?? true,
      swipeSensitivity: prefs.swipeSensitivity ?? 80,
      autoSyncInterval: prefs.autoSyncInterval ?? 5,
      soundAlerts: prefs.soundAlerts ?? true,
      defaultView: prefs.defaultView || 'month',
      customGestures: prefs.customGestures || DEFAULT_PREFS.customGestures,
    },
  };
}

function ChronosApp() {
  const { session, profile, loading, signOut, updateProfile } = useAuth();
  const isOnline = useOnlineStatus();

  const activeUser: UserProfile = profile ? profileToUserProfile(profile) : {
    id: '', name: '', email: '', avatar: '', role: 'VIEWER',
    isGoogleConnected: false, twoFactorEnabled: false, preferences: DEFAULT_PREFS,
  };

  // Calendar events for active user
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // View state
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda' | 'horizon24h' | 'admin'>(
    activeUser.preferences.defaultView || 'month'
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // Google Calendar integration
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  // Notifications
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // System updates
  const [systemUpdateInfo, setSystemUpdateInfo] = useState<SystemUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [presetStart, setPresetStart] = useState<string | undefined>(undefined);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isFloatingWidgetActive, setIsFloatingWidgetActive] = useState(false);
  const [isGeminiInsightsOpen, setIsGeminiInsightsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // 2FA
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState<'setup' | 'challenge'>('setup');

  // Theme & Transparency
  const [theme, setTheme] = useState<'dark' | 'light' | 'oled' | 'system'>(
    activeUser.preferences.theme || 'dark'
  );
  const [transparency, setTransparency] = useState<number>(
    activeUser.preferences.glassOpacity ?? 75
  );

  // Load data when profile changes
  useEffect(() => {
    if (!profile) return;

    const userId = profile.id;
    setTheme(profile.preferences?.theme || 'dark');
    setTransparency(profile.preferences?.glassOpacity ?? 75);
    setCurrentView(profile.preferences?.defaultView || 'month');

    (async () => {
      const [evs, cats, notifs] = await Promise.all([
        loadUserEvents(userId),
        loadUserCategories(userId),
        loadNotifications(userId),
      ]);
      setEvents(evs);
      setCategories(cats);
      setNotifications(notifs);

      // Load Google token for this user
      const token = await loadGoogleToken(userId);
      if (token?.accessToken) {
        setGoogleConnected(true);
        setAccessToken(token.accessToken);
      } else {
        setGoogleConnected(false);
        setAccessToken(null);
      }
    })();
  }, [profile?.id]);

  // Firebase Auth init (wrapped in try/catch to prevent crashes)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = initAuth(
        (_user, token) => {
          setAccessToken(token);
          setGoogleConnected(true);
        },
        () => {
          setAccessToken(null);
        }
      );
    } catch (e) {
      console.warn('Firebase auth init skipped:', e);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch system version
  const checkSystemVersion = useCallback(async () => {
    try {
      const res = await fetch('/api/system/version');
      if (res.ok) {
        const data = await res.json();
        setSystemUpdateInfo(data);
      }
    } catch (e) {
      console.warn('System version check offline');
    }
  }, []);

  useEffect(() => {
    checkSystemVersion();
  }, [checkSystemVersion]);

  // Helper to append a notification (saves to Supabase + local state)
  const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...item,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
    if (profile) {
      saveNotification(profile.id, item);
    }
  }, [profile]);

  // Google Calendar sync
  const syncWithGoogleCalendar = useCallback(async () => {
    if (!isOnline) {
      addNotification({
        title: 'Modo Offline Ativo',
        message: 'Você está desconectado. Alterações serão enfileiradas e sincronizadas ao reconectar.',
        type: 'sync'
      });
      return;
    }

    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
      if (token) setAccessToken(token);
    }

    if (!token) return;

    setIsSyncing(true);
    try {
      const queueResult = await processOfflineQueue(token);
      setOfflineQueueCount(getOfflineMutations().length);

      const gEvents = await fetchGoogleCalendarEvents(token);
      if (gEvents && gEvents.length > 0) {
        setEvents((prev) => {
          const localOnly = prev.filter((e) => !e.googleEventId);
          return [...gEvents, ...localOnly];
        });
      }

      setLastSyncTime(new Date());
      sounds.playSyncSuccess();

      addNotification({
        title: 'Google Calendar Sincronizado',
        message: `Sincronização concluída com sucesso (${gEvents?.length || 0} eventos).`,
        type: 'sync'
      });
    } catch (err: any) {
      console.error('Google Calendar sync failed:', err);
      addNotification({
        title: 'Aviso de Sincronização',
        message: 'Não foi possível contatar o Google Calendar. O cache local está ativo.',
        type: 'sync'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, accessToken, addNotification]);

  // Auto retry when coming back online
  useEffect(() => {
    if (isOnline && offlineQueueCount > 0) {
      syncWithGoogleCalendar();
    }
  }, [isOnline, offlineQueueCount, syncWithGoogleCalendar]);

  // Periodic sync
  useEffect(() => {
    const minutes = activeUser.preferences.autoSyncInterval;
    if (!minutes || minutes <= 0 || !googleConnected) return;

    const interval = setInterval(() => {
      syncWithGoogleCalendar();
    }, minutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [activeUser.preferences.autoSyncInterval, googleConnected, syncWithGoogleCalendar]);

  // Reminder checker
  useEffect(() => {
    if (!profile) return;
    const checkReminders = () => {
      const nowMs = Date.now();
      events.forEach((ev) => {
        const startMs = new Date(ev.start).getTime();
        const diffMinutes = Math.round((startMs - nowMs) / 60000);

        if (ev.reminderMinutes?.includes(diffMinutes)) {
          if (activeUser.preferences.soundAlerts) {
            sounds.playReminderChime();
          }

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`Lembrete: ${ev.title}`, {
              body: `Seu compromisso começa em ${diffMinutes === 0 ? 'agora' : `${diffMinutes} minutos`}.`,
              icon: '/icon.svg'
            });
          }

          addNotification({
            title: `Lembrete: ${ev.title}`,
            message: `Começa em ${diffMinutes === 0 ? 'agora' : `${diffMinutes} minutos`}. Local: ${ev.location || 'Não especificado'}.`,
            type: 'reminder',
            eventId: ev.id
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [events, activeUser.preferences.soundAlerts, profile, addNotification]);

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    sounds.playTactileClick();
    try {
      const result = await googleSignIn();
      if (result && profile) {
        setAccessToken(result.accessToken);
        setGoogleConnected(true);
        // Save token per-user in Supabase
        await saveGoogleToken(profile.id, result.accessToken, null, result.user.email || null);
        sounds.playSyncSuccess();
        addNotification({
          title: 'Google Calendar Conectado',
          message: `Conexão autenticada para ${result.user.email}. Eventos serão sincronizados.`,
          type: 'security'
        });
        setTimeout(syncWithGoogleCalendar, 400);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
    }
  };

  // Disconnect Google
  const handleGoogleDisconnect = async () => {
    if (!profile) return;
    sounds.playTactileClick();
    await logoutGoogle();
    await deleteGoogleToken(profile.id);
    setGoogleConnected(false);
    setAccessToken(null);
    addNotification({
      title: 'Google Calendar Desconectado',
      message: 'A sincronização com Google foi desativada para sua conta.',
      type: 'security'
    });
  };

  // Event Save Handler
  const handleSaveEvent = async (event: CalendarEvent) => {
    const isNew = !events.some((e) => e.id === event.id);

    if (event.isGoogleSynced && googleConnected) {
      if (isOnline && accessToken) {
        try {
          if (isNew) {
            const created = await insertGoogleCalendarEvent(accessToken, event);
            event.googleEventId = created.googleEventId;
            event.syncStatus = 'synced';
          } else if (event.googleEventId) {
            await updateGoogleCalendarEvent(accessToken, event.googleEventId, event);
            event.syncStatus = 'synced';
          }
        } catch (err) {
          console.warn('API call failed, queueing mutation offline:', err);
          queueOfflineMutation({
            id: `mut-${Date.now()}`,
            type: isNew ? 'CREATE' : 'UPDATE',
            event,
            timestamp: Date.now()
          });
          event.syncStatus = 'offline_queued';
          setOfflineQueueCount(getOfflineMutations().length);
        }
      } else {
        queueOfflineMutation({
          id: `mut-${Date.now()}`,
          type: isNew ? 'CREATE' : 'UPDATE',
          event,
          timestamp: Date.now()
        });
        event.syncStatus = 'offline_queued';
        setOfflineQueueCount(getOfflineMutations().length);
      }
    }

    // Save to Supabase
    if (profile) {
      await saveUserEvent(profile.id, event);
    }

    setEvents((prev) => {
      if (isNew) return [event, ...prev];
      return prev.map((e) => (e.id === event.id ? event : e));
    });

    addNotification({
      title: isNew ? 'Novo Evento Criado' : 'Evento Atualizado',
      message: `"${event.title}" agendado para ${new Date(event.start).toLocaleString('pt-BR')}.`,
      type: 'reminder',
      eventId: event.id
    });
  };

  // Event Delete Handler
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (event.isGoogleSynced && event.googleEventId && googleConnected) {
      if (isOnline && accessToken) {
        try {
          await deleteGoogleCalendarEvent(accessToken, event.googleEventId);
        } catch (err) {
          queueOfflineMutation({
            id: `mut-${Date.now()}`,
            type: 'DELETE',
            event,
            timestamp: Date.now()
          });
          setOfflineQueueCount(getOfflineMutations().length);
        }
      } else {
        queueOfflineMutation({
          id: `mut-${Date.now()}`,
          type: 'DELETE',
          event,
          timestamp: Date.now()
        });
        setOfflineQueueCount(getOfflineMutations().length);
      }
    }

    await deleteUserEvent(event.id);
    setEvents((prev) => prev.filter((e) => e.id !== event.id));

    addNotification({
      title: 'Evento Removido',
      message: `"${event.title}" foi excluído da agenda.`,
      type: 'reminder'
    });
  };

  // Category handlers
  const handleSaveCategory = (categoryToSave: CategoryDefinition) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === categoryToSave.id);
      let updated: CategoryDefinition[];
      if (idx >= 0) {
        updated = prev.map((c, i) => (i === idx ? categoryToSave : c));
      } else {
        updated = [...prev, categoryToSave];
      }
      if (profile) saveUserCategories(profile.id, updated);
      return updated;
    });

    addNotification({
      title: 'Categoria Salva',
      message: `Categoria "${categoryToSave.name}" configurada com sucesso.`,
      type: 'system'
    });
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== catId);
      if (profile) saveUserCategories(profile.id, updated);
      return updated;
    });

    addNotification({
      title: 'Categoria Removida',
      message: 'Categoria personalizada removida da lista.',
      type: 'system'
    });
  };

  // OTA update
  const handleApplyUpdate = async () => {
    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSystemUpdateInfo(data.version);
        addNotification({
          title: 'Sistema Atualizado!',
          message: `Chronos foi atualizado com sucesso para v${data.version.current}.`,
          type: 'system'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save preferences
  const handleSavePreferences = (newPrefs: UserPreferences) => {
    setTheme(newPrefs.theme);
    setTransparency(newPrefs.glassOpacity);
    if (profile) {
      updateProfile({ preferences: newPrefs as any });
    }
  };

  // 2FA update
  const handleUpdate2FA = (enabled: boolean) => {
    if (profile) {
      updateProfile({ two_factor_enabled: enabled } as any);
    }
    addNotification({
      title: enabled ? '2FA Ativado com Sucesso' : '2FA Desativado',
      message: enabled
        ? 'Sua conta agora está protegida com autenticação em duas etapas.'
        : 'Aviso de segurança: 2FA foi desativado para esta conta.',
      type: 'security'
    });
  };

  // Gesture handlers
  const handleSwipeLeft = () => {
    if (currentView === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (currentView === 'week') {
      setCurrentDate((d) => new Date(d.getTime() + 7 * 86400000));
    } else if (currentView === 'day') {
      setCurrentDate((d) => new Date(d.getTime() + 86400000));
    }
  };

  const handleSwipeRight = () => {
    if (currentView === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (currentView === 'week') {
      setCurrentDate((d) => new Date(d.getTime() - 7 * 86400000));
    } else if (currentView === 'day') {
      setCurrentDate((d) => new Date(d.getTime() - 86400000));
    }
  };

  const handleSwipeDown = () => {
    syncWithGoogleCalendar();
  };

  const handleDoubleTap = () => {
    setEventToEdit(null);
    setPresetStart(undefined);
    setIsEventModalOpen(true);
  };

  // Theme classes — modern light palette
  const themeClass =
    theme === 'oled'
      ? 'bg-black text-slate-100'
      : theme === 'light'
      ? 'bg-slate-50 text-slate-900'
      : 'bg-slate-950 text-slate-100';

  // Show loading screen
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Carregando Chronos...</span>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!session || !profile) {
    return <LoginScreen />;
  }

  const canEdit = activeUser.role === 'ADMIN' || activeUser.role === 'EDITOR';
  const isAdmin = activeUser.role === 'ADMIN';

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden select-none transition-colors duration-300 font-sans ${themeClass} ${theme === 'light' ? 'theme-light' : ''}`}
    >
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {theme === 'light' ? (
          <>
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-200/40 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px]" />
            <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-200/30 rounded-full blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
            <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
          </>
        )}
      </div>

      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="w-full bg-amber-600/90 text-white text-xs px-4 py-1.5 flex items-center justify-between font-medium z-40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 animate-pulse" />
            <span>
              Modo Offline — Suas alterações serão salvas localmente e sincronizadas ao reconectar.
            </span>
          </div>
          {offlineQueueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-mono">
              {offlineQueueCount} na fila
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <Header
        currentView={currentView}
        setCurrentView={(v) => {
          if (v === 'admin' && !isAdmin) return;
          setCurrentView(v);
        }}
        activeUser={activeUser}
        users={[activeUser]}
        onSwitchUser={() => {}}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncGoogle={syncWithGoogleCalendar}
        lastSyncTime={lastSyncTime}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenGeminiInsights={() => setIsGeminiInsightsOpen(true)}
        onOpenWidgetModal={() => setIsWidgetModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCreateEvent={() => {
          setEventToEdit(null);
          setPresetStart(undefined);
          setIsEventModalOpen(true);
        }}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        hasSystemUpdate={systemUpdateInfo?.hasUpdate ?? false}
        theme={theme}
        setTheme={setTheme}
        googleConnected={googleConnected}
        onGoogleSignIn={handleGoogleSignIn}
        searchQuery={globalSearchQuery}
        setSearchQuery={setGlobalSearchQuery}
        events={events}
        categories={categories}
        onSelectEvent={(ev) => {
          setEventToEdit(ev);
          setIsEventModalOpen(true);
        }}
        onNavigateToDate={(targetDate, targetView) => {
          setCurrentDate(targetDate);
          if (targetView) setCurrentView(targetView);
        }}
      />

      {/* Admin nav button */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-200/50 dark:border-white/5 z-20">
          <button
            onClick={() => setIsUserManagementOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-xs font-semibold transition"
          >
            Gerenciar Usuários
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 text-xs font-medium transition"
          >
            Sair
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 w-full h-full min-h-0 flex flex-col relative z-10 overflow-hidden">
        <GestureDetector
          enabled={activeUser.preferences.gesturesEnabled}
          sensitivity={activeUser.preferences.swipeSensitivity || 75}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSwipeDown={handleSwipeDown}
          onDoubleTap={handleDoubleTap}
        >
          {currentView === 'horizon24h' && (
            <Horizon24h
              events={events}
              onSelectEvent={(ev) => {
                setEventToEdit(ev);
                setIsEventModalOpen(true);
              }}
              onOpenCreateEvent={(time) => {
                setEventToEdit(null);
                setPresetStart(time);
                setIsEventModalOpen(true);
              }}
              onSyncGoogle={syncWithGoogleCalendar}
              isSyncing={isSyncing}
              categories={categories}
              searchQuery={globalSearchQuery}
              onClearSearch={() => setGlobalSearchQuery('')}
            />
          )}

          {currentView === 'month' && (
            <MonthView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              onSelectEvent={(ev) => {
                setEventToEdit(ev);
                setIsEventModalOpen(true);
              }}
              onOpenCreateEvent={(time) => {
                if (!canEdit) return;
                setEventToEdit(null);
                setPresetStart(time);
                setIsEventModalOpen(true);
              }}
              onDayClick={(day) => {
                setCurrentDate(day);
                setCurrentView('day');
              }}
              categories={categories}
              searchQuery={globalSearchQuery}
              onClearSearch={() => setGlobalSearchQuery('')}
            />
          )}

          {currentView === 'week' && (
            <WeekView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              onSelectEvent={(ev) => {
                setEventToEdit(ev);
                setIsEventModalOpen(true);
              }}
              onOpenCreateEvent={(time) => {
                if (!canEdit) return;
                setEventToEdit(null);
                setPresetStart(time);
                setIsEventModalOpen(true);
              }}
              categories={categories}
              searchQuery={globalSearchQuery}
              onClearSearch={() => setGlobalSearchQuery('')}
            />
          )}

          {currentView === 'day' && (
            <DayView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              onSelectEvent={(ev) => {
                setEventToEdit(ev);
                setIsEventModalOpen(true);
              }}
              onOpenCreateEvent={(time) => {
                if (!canEdit) return;
                setEventToEdit(null);
                setPresetStart(time);
                setIsEventModalOpen(true);
              }}
              categories={categories}
              searchQuery={globalSearchQuery}
              onClearSearch={() => setGlobalSearchQuery('')}
            />
          )}

          {currentView === 'agenda' && (
            <AgendaView
              events={events}
              onSelectEvent={(ev) => {
                setEventToEdit(ev);
                setIsEventModalOpen(true);
              }}
              onOpenCreateEvent={(time) => {
                if (!canEdit) return;
                setEventToEdit(null);
                setPresetStart(time);
                setIsEventModalOpen(true);
              }}
              categories={categories}
              searchQuery={globalSearchQuery}
              onSearchQueryChange={setGlobalSearchQuery}
            />
          )}

          {currentView === 'admin' && isAdmin && (
            <AdminPanel
              onClose={() => setCurrentView('month')}
              offlineQueueCount={offlineQueueCount}
            />
          )}
        </GestureDetector>
      </main>

      {/* Floating Mini-Widget */}
      <FloatingMiniWidget
        isOpen={isFloatingWidgetActive}
        onClose={() => setIsFloatingWidgetActive(false)}
        events={events}
        onOpenCreateEvent={() => {
          setEventToEdit(null);
          setPresetStart(undefined);
          setIsEventModalOpen(true);
        }}
        onOpenEvent={(ev) => {
          setEventToEdit(ev);
          setIsEventModalOpen(true);
        }}
        transparency={transparency}
      />

      <PWAInstallBanner />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        presetStart={presetStart}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
        googleConnected={googleConnected}
        userId={activeUser.id}
        categories={categories}
        onAddCategory={handleSaveCategory}
      />

      <WidgetDrawer
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        events={events}
        isFloatingWidgetActive={isFloatingWidgetActive}
        setIsFloatingWidgetActive={setIsFloatingWidgetActive}
        widgetTransparency={transparency}
        setWidgetTransparency={setTransparency}
      />

      <NotificationsCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => {
          sounds.playTactileClick();
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          if (profile) markAllNotificationsRead(profile.id);
        }}
        onClearAll={() => {
          sounds.playTactileClick();
          setNotifications([]);
          if (profile) clearAllNotifications(profile.id);
        }}
        onSelectNotification={(n) => {
          if (n.eventId) {
            const ev = events.find((e) => e.id === n.eventId);
            if (ev) {
              setEventToEdit(ev);
              setIsEventModalOpen(true);
              setIsNotificationsOpen(false);
            }
          }
        }}
      />

      <SystemUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={systemUpdateInfo}
        onCheckUpdates={checkSystemVersion}
        onApplyUpdate={handleApplyUpdate}
      />

      <GeminiInsightsModal
        isOpen={isGeminiInsightsOpen}
        onClose={() => setIsGeminiInsightsOpen(false)}
        events={events}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={activeUser}
        onSavePreferences={handleSavePreferences}
        onOpen2FA={() => {
          setTwoFactorMode('setup');
          setIs2FAModalOpen(true);
        }}
        categories={categories}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <TwoFactorModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        user={activeUser}
        mode={twoFactorMode}
        onSuccess={() => {}}
        onUpdateUser2FA={handleUpdate2FA}
      />

      {isAdmin && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUserRole={activeUser.role}
        />
      )}
    </div>
  );
}

export default function App() {
  if (supabaseConfigError) {
    return <SupabaseSetupScreen />;
  }

  return (
    <AuthProvider>
      <ChronosApp />
    </AuthProvider>
  );
}
