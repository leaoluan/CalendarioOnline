import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  RotateCw,
  Sparkles,
  Shield,
  Bell,
  Settings,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Smartphone,
  CloudOff,
  Cloud,
  CheckCircle2,
  Download,
  Users,
  Search,
  X,
  MapPin,
  Calendar as CalendarIcon,
  ChevronRight,
  Tag
} from 'lucide-react';
import { UserProfile, CalendarEvent, CategoryDefinition } from '../types/calendar';
import { sounds } from '../services/soundEffects';
import { resolveEventColor, getCategoryName, matchesEventSearch } from '../services/storage';

interface HeaderProps {
  currentView: 'month' | 'week' | 'day' | 'agenda' | 'horizon24h' | 'admin';
  setCurrentView: (view: 'month' | 'week' | 'day' | 'agenda' | 'horizon24h' | 'admin') => void;
  activeUser: UserProfile;
  users: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncGoogle: () => void;
  lastSyncTime: Date | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenGeminiInsights: () => void;
  onOpenWidgetModal: () => void;
  onOpenSettings: () => void;
  onOpenCreateEvent: () => void;
  onOpenUpdateModal: () => void;
  hasSystemUpdate: boolean;
  theme: 'dark' | 'light' | 'oled' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'oled' | 'system') => void;
  googleConnected: boolean;
  onGoogleSignIn: () => void;

  // Global Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  events: CalendarEvent[];
  categories: CategoryDefinition[];
  onSelectEvent: (event: CalendarEvent) => void;
  onNavigateToDate?: (date: Date, view?: 'month' | 'week' | 'day') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  activeUser,
  users,
  onSwitchUser,
  isOnline,
  isSyncing,
  onSyncGoogle,
  lastSyncTime,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenGeminiInsights,
  onOpenWidgetModal,
  onOpenSettings,
  onOpenCreateEvent,
  onOpenUpdateModal,
  hasSystemUpdate,
  theme,
  setTheme,
  googleConnected,
  onGoogleSignIn,
  searchQuery,
  setSearchQuery,
  events,
  categories,
  onSelectEvent,
  onNavigateToDate
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDateStr(
        now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcut: pressing "/" or "Ctrl+K" / "Cmd+K" focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape') {
        if (isSearchFocused || searchQuery) {
          setIsSearchFocused(false);
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, searchQuery]);

  // Click outside search container to close results popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    sounds.playTactileClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const cycleTheme = () => {
    sounds.playTactileClick();
    if (theme === 'dark') setTheme('oled');
    else if (theme === 'oled') setTheme('light');
    else setTheme('dark');
  };

  // Filter events matching search across title, description, location
  const matchingEvents = searchQuery.trim()
    ? events.filter((ev) => matchesEventSearch(ev, searchQuery))
    : [];

  const highlightMatch = (text: string | undefined, query: string) => {
    if (!text) return null;
    if (!query || !query.trim()) return <span>{text}</span>;
    const cleanQuery = query.trim();
    const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    const lowerQuery = cleanQuery.toLowerCase();
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerQuery ? (
            <span key={i} className="bg-amber-400/30 text-amber-200 font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };
  const handleSelectSearchResult = (event: CalendarEvent) => {
    sounds.playTactileClick();
    setIsSearchFocused(false);
    onSelectEvent(event);
  };

  const handleNavigateToResultDate = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    sounds.playTactileClick();
    setIsSearchFocused(false);
    if (onNavigateToDate) {
      const dt = new Date(event.start);
      onNavigateToDate(dt, 'day');
    }
  };

  return (
    <header className="w-full flex-shrink-0 z-30 px-3 sm:px-6 py-2.5 backdrop-blur-xl border-b border-white/10 dark:border-white/5 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        
        {/* Brand & Live Digital Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('month')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-base sm:text-lg bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  CHRONOS
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  AGENDA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium capitalize">{dateStr}</p>
            </div>
          </div>

          {/* Live Clock Horizon Ribbon Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/50 text-slate-200 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{timeStr}</span>
          </div>

          {/* System Update alert pill */}
          {hasSystemUpdate && (
            <button
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-medium transition animate-pulse"
              title="Nova atualização disponível"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">v2.5.1 Disponível</span>
            </button>
          )}
        </div>

        {/* Global Search Bar (Responsive with Live Dropdown) */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
          <div
            className={`relative flex items-center w-full rounded-xl bg-slate-900/80 border transition-all duration-200 ${
              isSearchFocused
                ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20'
                : searchQuery
                ? 'border-blue-500/60'
                : 'border-slate-700/70 hover:border-slate-600'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Buscar título, local, descrição... (/)"
              className="w-full bg-transparent pl-2.5 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
            />

            {/* Clear Button or Hotkey Badge */}
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Limpar busca (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-0.5 absolute right-2 pointer-events-none text-[10px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                <span>/</span>
              </div>
            )}
          </div>

          {/* Search Results Dropdown Popover */}
          {isSearchFocused && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-2xl overflow-hidden z-50 text-slate-200 max-h-96 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
              
              {/* Header summary */}
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-950/40">
                <span className="font-semibold text-slate-300">
                  {matchingEvents.length === 0
                    ? 'Nenhum resultado'
                    : `${matchingEvents.length} evento(s) encontrado(s)`}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Esc para fechar
                </span>
              </div>

              {/* Event list */}
              <div className="overflow-y-auto divide-y divide-slate-800/60">
                {matchingEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <p>Nenhum evento corresponde a "<span className="text-white font-medium">{searchQuery}</span>".</p>
                    <button
                      onClick={() => {
                        setIsSearchFocused(false);
                        onOpenCreateEvent();
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
                    >
                      <span>+ Criar evento com este título</span>
                    </button>
                  </div>
                ) : (
                  matchingEvents.map((ev) => {
                    const eventColor = resolveEventColor(ev, categories);
                    const categoryName = getCategoryName(ev.category, categories);
                    const startDate = new Date(ev.start);
                    const endDate = new Date(ev.end);
                    const dateFormatted = startDate.toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    });
                    const timeFormatted = ev.isAllDay
                      ? 'Dia todo'
                      : `${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleSelectSearchResult(ev)}
                        className="p-3 hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Category indicator bar with assigned color */}
                          <div
                            className="w-2.5 self-stretch rounded-full flex-shrink-0"
                            style={{ backgroundColor: eventColor }}
                          />

                          <div className="min-w-0">
                            {/* Title with query highlight */}
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition truncate">
                              {highlightMatch(ev.title, searchQuery)}
                            </h4>

                            {/* Date, Time and Category badge */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                              <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/80">
                                {dateFormatted} • {timeFormatted}
                              </span>

                              {/* Category pill reflecting category color */}
                              <span
                                className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border"
                                style={{
                                  backgroundColor: `${eventColor}25`,
                                  borderColor: `${eventColor}50`,
                                  color: eventColor
                                }}
                              >
                                {categoryName}
                              </span>
                            </div>

                            {/* Location */}
                            {ev.location && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className="truncate">{highlightMatch(ev.location, searchQuery)}</span>
                              </div>
                            )}

                            {/* Description snippet */}
                            {ev.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {highlightMatch(ev.description, searchQuery)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Action Button: Jump to Date */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleNavigateToResultDate(e, ev)}
                            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 hover:text-white transition"
                            title="Ir para esta data na agenda"
                          >
                            <CalendarIcon className="w-3 h-3 text-blue-400" />
                            <span>Ver data</span>
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* View Switcher Tabs (Desktop & Tablet) */}
        <nav className="flex items-center p-1 rounded-xl bg-slate-800/40 dark:bg-slate-950/40 border border-white/10 backdrop-blur-md overflow-x-auto max-w-full text-xs font-medium">
          <button
            onClick={() => { sounds.playTactileClick(); setCurrentView('horizon24h'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'horizon24h'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Horizonte 24h</span>
          </button>

          <button
            onClick={() => { sounds.playTactileClick(); setCurrentView('month'); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'month'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Mês
          </button>

          <button
            onClick={() => { sounds.playTactileClick(); setCurrentView('week'); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'week'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Semana
          </button>

          <button
            onClick={() => { sounds.playTactileClick(); setCurrentView('day'); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'day'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Dia
          </button>

          <button
            onClick={() => { sounds.playTactileClick(); setCurrentView('agenda'); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'agenda'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Agenda
          </button>

          {activeUser.role === 'ADMIN' && (
            <button
              onClick={() => { sounds.playTactileClick(); setCurrentView('admin'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Action Controls & Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Quick Create Event Button */}
          <button
            onClick={onOpenCreateEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-600/30 ring-1 ring-white/20 transition active:scale-95"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span className="hidden sm:inline">Novo Evento</span>
          </button>

          {/* Google Calendar Sync Button */}
          {googleConnected ? (
            <button
              onClick={onSyncGoogle}
              disabled={isSyncing}
              title={lastSyncTime ? `Última sincronização: ${lastSyncTime.toLocaleTimeString()}` : 'Sincronizar Google'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-blue-500/50 text-slate-200 text-xs font-medium transition active:scale-95"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{isSyncing ? 'Sincronizando...' : 'Google Sync'}</span>
              {isOnline ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ) : (
                <CloudOff className="w-3 h-3 text-amber-400" />
              )}
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium transition active:scale-95"
              title="Conectar com a conta Google para sincronizar automaticamente seus eventos"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
              </svg>
              <span className="hidden md:inline">Conectar Google</span>
            </button>
          )}

          {/* Gemini AI Insights Button */}
          <button
            onClick={onOpenGeminiInsights}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition active:scale-95"
            title="Otimizações e Análises Inteligentes com IA Gemini"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xl:inline">IA Gemini</span>
          </button>

          {/* Homescreen Widget Launcher */}
          <button
            onClick={onOpenWidgetModal}
            className="p-1.5 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition"
            title="Widgets para Tela Inicial (Android / Desktop / Web)"
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
          </button>

          {/* Real-Time Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition"
            title="Notificações e Lembretes em Tempo Real"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Dark / OLED / Light Theme Toggle */}
          <button
            onClick={cycleTheme}
            className="p-1.5 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition"
            title={`Tema atual: ${theme}. Clique para alternar.`}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : theme === 'oled' ? (
              <span className="text-[10px] font-bold px-0.5 text-purple-400">OLED</span>
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-1.5 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition"
            title="Preencher a tela inteira"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition"
            title="Configurações, Categorias, Gestos e Transparência"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Multi-User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 transition active:scale-95"
            >
              {activeUser.avatar ? (
                <img
                  src={activeUser.avatar}
                  alt={activeUser.name}
                  className="w-6 h-6 rounded-lg object-cover ring-1 ring-blue-500/50"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-blue-600/80 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-blue-500/50">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden md:inline text-xs font-medium text-slate-200 max-w-[80px] truncate">
                {activeUser.name}
              </span>
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-2xl p-2 z-50 text-slate-200"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-white">{activeUser.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{activeUser.email}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {activeUser.role}
                    </span>
                    {activeUser.twoFactorEnabled && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> 2FA Ativo
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 pb-1">
                  <p className="px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Conta Atual
                  </p>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition mt-1 ${
                        u.id === activeUser.id
                          ? 'bg-blue-600/30 text-white border border-blue-500/40'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-lg object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-blue-600/80 flex items-center justify-center text-[10px] font-bold text-white">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.role}</div>
                      </div>
                      {u.id === activeUser.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
