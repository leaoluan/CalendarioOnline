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

import {
  CalendarEvent,
  UserProfile,
  UserPreferences,
  NotificationItem,
  SystemUpdateInfo,
  CategoryDefinition
} from './types/calendar';
import {
  getInitialUsers,
  saveUsers,
  getActiveUserId,
  setActiveUserId,
  loadUserEvents,
  saveUserEvents,
  getNotifications,
  saveNotifications,
  loadUserCategories,
  saveUserCategories
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
import { CloudOff } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // Multi-user state
  const [users, setUsers] = useState<UserProfile[]>(() => getInitialUsers());
  const [activeUser, setActiveUser] = useState<UserProfile>(() => {
    const list = getInitialUsers();
    const activeId = getActiveUserId();
    return list.find((u) => u.id === activeId) || list[0];
  });

  // Calendar events for active user
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    loadUserEvents(activeUser.id)
  );

  // User Categories (Work, Personal, Fitness, etc.)
  const [categories, setCategories] = useState<CategoryDefinition[]>(() =>
    loadUserCategories(activeUser.id)
  );

  // Reload categories and events when active user changes
  useEffect(() => {
    setCategories(loadUserCategories(activeUser.id));
  }, [activeUser.id]);

  // View state
  const [currentView, setCurrentView] = useState<
    'month' | 'week' | 'day' | 'agenda' | 'horizon24h' | 'admin'
  >(activeUser.preferences.defaultView || 'month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // Google Calendar integration
  const [googleConnected, setGoogleConnected] = useState<boolean>(activeUser.isGoogleConnected);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => getOfflineMutations().length);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getNotifications());
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

  // 2FA Challenge & Setup
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState<'setup' | 'challenge'>('setup');
  const [pendingUserSwitch, setPendingUserSwitch] = useState<UserProfile | null>(null);

  // Theme & Transparency
  const [theme, setTheme] = useState<'dark' | 'light' | 'oled' | 'system'>(
    activeUser.preferences.theme || 'dark'
  );
  const [transparency, setTransparency] = useState<number>(
    activeUser.preferences.glassOpacity ?? 75
  );

  // Sync users to storage
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  // Sync events to storage when changed
  useEffect(() => {
    saveUserEvents(activeUser.id, events);
  }, [events, activeUser.id]);

  // Sync notifications to storage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Firebase Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAccessToken(token);
        setGoogleConnected(true);
        setActiveUser((prev) => ({
          ...prev,
          isGoogleConnected: true,
          googleEmail: user.email || prev.email
        }));
      },
      () => {
        setAccessToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch initial system version info from server
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

  // Auto-sync Google Calendar periodically
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
      // 1. Process pending offline mutations
      const queueResult = await processOfflineQueue(token);
      setOfflineQueueCount(getOfflineMutations().length);

      // 2. Fetch fresh events from Google Calendar
      const gEvents = await fetchGoogleCalendarEvents(token);
      if (gEvents && gEvents.length > 0) {
        setEvents((prev) => {
          // Merge by googleEventId
          const localOnly = prev.filter((e) => !e.googleEventId);
          return [...gEvents, ...localOnly];
        });
      }

      setLastSyncTime(new Date());
      sounds.playSyncSuccess();

      addNotification({
        title: 'Google Calendar Sincronizado',
        message: `Sincronização concluída com sucesso (${gEvents.length} eventos).`,
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
  }, [isOnline, accessToken]);

  // Automatic retry when coming back online
  useEffect(() => {
    if (isOnline && offlineQueueCount > 0) {
      syncWithGoogleCalendar();
    }
  }, [isOnline, offlineQueueCount, syncWithGoogleCalendar]);

  // Periodic background sync timer
  useEffect(() => {
    const minutes = activeUser.preferences.autoSyncInterval;
    if (!minutes || minutes <= 0 || !googleConnected) return;

    const interval = setInterval(() => {
      syncWithGoogleCalendar();
    }, minutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [activeUser.preferences.autoSyncInterval, googleConnected, syncWithGoogleCalendar]);

  // Real-Time Notification Checker: checks if an event is starting soon
  useEffect(() => {
    const checkReminders = () => {
      const nowMs = Date.now();
      events.forEach((ev) => {
        const startMs = new Date(ev.start).getTime();
        const diffMinutes = Math.round((startMs - nowMs) / 60000);

        // Check if event has a matching reminder
        if (ev.reminderMinutes?.includes(diffMinutes)) {
          // Trigger audio chime
          if (activeUser.preferences.soundAlerts) {
            sounds.playReminderChime();
          }

          // Trigger browser notification
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`Lembrete: ${ev.title}`, {
              body: `Seu compromisso começa em ${diffMinutes === 0 ? 'agora' : `${diffMinutes} minutos`}.`,
              icon: '/icon.svg'
            });
          }

          // In-app notification
          addNotification({
            title: `Lembrete: ${ev.title}`,
            message: `Começa em ${diffMinutes === 0 ? 'agora' : `${diffMinutes} minutos`}. Local: ${ev.location || 'Não especificado'}.`,
            type: 'reminder',
            eventId: ev.id
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // check every minute
    return () => clearInterval(interval);
  }, [events, activeUser.preferences.soundAlerts]);

  // Helper to append a notification
  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...item
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
  };

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    sounds.playTactileClick();
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setGoogleConnected(true);
        setActiveUser((prev) => ({
          ...prev,
          isGoogleConnected: true,
          googleEmail: result.user.email || prev.email
        }));
        sounds.playSyncSuccess();
        addNotification({
          title: 'Google Calendar Conectado',
          message: `Conexão autenticada para ${result.user.email}. Eventos serão sincronizados.`,
          type: 'security'
        });
        // Initial sync
        setTimeout(syncWithGoogleCalendar, 400);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
    }
  };

  // User Switch Handler with 2FA Challenge
  const handleSwitchUser = (targetUser: UserProfile) => {
    sounds.playTactileClick();
    if (targetUser.id === activeUser.id) return;

    if (targetUser.twoFactorEnabled) {
      setPendingUserSwitch(targetUser);
      setTwoFactorMode('challenge');
      setIs2FAModalOpen(true);
    } else {
      completeUserSwitch(targetUser);
    }
  };

  const completeUserSwitch = (targetUser: UserProfile) => {
    setActiveUserId(targetUser.id);
    setActiveUser(targetUser);
    setTheme(targetUser.preferences.theme || 'dark');
    setTransparency(targetUser.preferences.glassOpacity ?? 75);
    setEvents(loadUserEvents(targetUser.id));
    setCurrentView(targetUser.preferences.defaultView || 'month');
    setPendingUserSwitch(null);
    sounds.playSyncSuccess();

    addNotification({
      title: 'Sessão Alterada',
      message: `Perfil alternado para ${targetUser.name} (${targetUser.role}).`,
      type: 'security'
    });
  };

  // Event Save Handler (Create or Update)
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
        // Enqueue offline mutation
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

    setEvents((prev) => prev.filter((e) => e.id !== event.id));

    addNotification({
      title: 'Evento Removido',
      message: `"${event.title}" foi excluído da agenda.`,
      type: 'reminder'
    });
  };

  // Category Management Handlers (Work, Personal, Fitness, etc.)
  const handleSaveCategory = (categoryToSave: CategoryDefinition) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === categoryToSave.id);
      let updated: CategoryDefinition[];
      if (idx >= 0) {
        updated = prev.map((c, i) => (i === idx ? categoryToSave : c));
      } else {
        updated = [...prev, categoryToSave];
      }
      saveUserCategories(activeUser.id, updated);
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
      saveUserCategories(activeUser.id, updated);
      return updated;
    });

    addNotification({
      title: 'Categoria Removida',
      message: 'Categoria personalizada removida da lista.',
      type: 'system'
    });
  };

  // Apply OTA system update
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

  // Save updated preferences for user
  const handleSavePreferences = (newPrefs: UserPreferences) => {
    setActiveUser((prev) => {
      const updated = { ...prev, preferences: newPrefs };
      setUsers((uList) => uList.map((u) => (u.id === updated.id ? updated : u)));
      return updated;
    });
    setTheme(newPrefs.theme);
    setTransparency(newPrefs.glassOpacity);
  };

  // 2FA update handler
  const handleUpdate2FA = (enabled: boolean, secret?: string, codes?: string[]) => {
    setActiveUser((prev) => {
      const updated: UserProfile = {
        ...prev,
        twoFactorEnabled: enabled,
        twoFactorSecret: secret || prev.twoFactorSecret,
        backupCodes: codes || prev.backupCodes
      };
      setUsers((uList) => uList.map((u) => (u.id === updated.id ? updated : u)));
      return updated;
    });
    addNotification({
      title: enabled ? '2FA Ativado com Sucesso' : '2FA Desativado',
      message: enabled
        ? 'Sua conta agora está protegida com autenticação em duas etapas.'
        : 'Aviso de segurança: 2FA foi desativado para esta conta.',
      type: 'security'
    });
  };

  // Custom Touch Gestures handlers
  const handleSwipeLeft = () => {
    // Next period
    if (currentView === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (currentView === 'week') {
      setCurrentDate((d) => new Date(d.getTime() + 7 * 86400000));
    } else if (currentView === 'day') {
      setCurrentDate((d) => new Date(d.getTime() + 86400000));
    }
  };

  const handleSwipeRight = () => {
    // Prev period
    if (currentView === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (currentView === 'week') {
      setCurrentDate((d) => new Date(d.getTime() - 7 * 86400000));
    } else if (currentView === 'day') {
      setCurrentDate((d) => new Date(d.getTime() - 86400000));
    }
  };

  const handleSwipeDown = () => {
    // Pull-to-refresh sync Google
    syncWithGoogleCalendar();
  };

  const handleDoubleTap = () => {
    // Quick create
    setEventToEdit(null);
    setPresetStart(undefined);
    setIsEventModalOpen(true);
  };

  // Theme container classes
  const themeClass =
    theme === 'oled'
      ? 'bg-black text-slate-100'
      : theme === 'light'
      ? 'bg-slate-100 text-slate-900'
      : 'bg-slate-950 text-slate-100';

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden select-none transition-colors duration-300 font-sans ${themeClass}`}
    >
      {/* Background ambient frosted glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="w-full bg-amber-600/90 text-white text-xs px-4 py-1.5 flex items-center justify-between font-medium z-40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 animate-pulse" />
            <span>
              Modo Offline — Suas alterações serão salvas localmente e sincronizadas com o Google Calendar ao reconectar.
            </span>
          </div>
          {offlineQueueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-mono">
              {offlineQueueCount} na fila
            </span>
          )}
        </div>
      )}

      {/* Main App Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeUser={activeUser}
        users={users}
        onSwitchUser={handleSwitchUser}
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

      {/* Main Interactive Screen with Custom Gestures */}
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
                setEventToEdit(null);
                setPresetStart(time);
                setIsEventModalOpen(true);
              }}
              categories={categories}
              searchQuery={globalSearchQuery}
              onSearchQueryChange={setGlobalSearchQuery}
            />
          )}

          {currentView === 'admin' && (
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

      {/* PWA In-App Install Banner */}
      <PWAInstallBanner />

      {/* Create / Edit Event Modal */}
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

      {/* Homescreen Widgets Drawer */}
      <WidgetDrawer
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        events={events}
        isFloatingWidgetActive={isFloatingWidgetActive}
        setIsFloatingWidgetActive={setIsFloatingWidgetActive}
        widgetTransparency={transparency}
        setWidgetTransparency={setTransparency}
      />

      {/* Real-time Notifications Center */}
      <NotificationsCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => {
          sounds.playTactileClick();
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearAll={() => {
          sounds.playTactileClick();
          setNotifications([]);
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

      {/* System OTA Update Modal */}
      <SystemUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={systemUpdateInfo}
        onCheckUpdates={checkSystemVersion}
        onApplyUpdate={handleApplyUpdate}
      />

      {/* Gemini AI Schedule Insights Modal */}
      <GeminiInsightsModal
        isOpen={isGeminiInsightsOpen}
        onClose={() => setIsGeminiInsightsOpen(false)}
        events={events}
      />

      {/* Settings Modal */}
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

      {/* Two-Factor Authentication Modal */}
      <TwoFactorModal
        isOpen={is2FAModalOpen}
        onClose={() => {
          setIs2FAModalOpen(false);
          setPendingUserSwitch(null);
        }}
        user={pendingUserSwitch || activeUser}
        mode={twoFactorMode}
        onSuccess={() => {
          if (pendingUserSwitch) {
            completeUserSwitch(pendingUserSwitch);
          }
        }}
        onUpdateUser2FA={handleUpdate2FA}
      />
    </div>
  );
}
