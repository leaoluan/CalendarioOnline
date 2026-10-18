import React, { useState, useEffect } from 'react';
import {
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  Sparkles,
  Calendar,
  ChevronRight,
  Bell,
  RefreshCw,
  Plus,
  Search,
  X
} from 'lucide-react';
import { CalendarEvent, CategoryDefinition } from '../types/calendar';
import { fetchDailyBriefing } from '../services/geminiService';
import { sounds } from '../services/soundEffects';
import { resolveEventColor, getCategoryName, matchesEventSearch } from '../services/storage';

export interface Next24hPanelProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  onSyncGoogle?: () => void;
  isSyncing?: boolean;
  googleConnected?: boolean;
  categories?: CategoryDefinition[];
  searchQuery?: string;
  onClearSearch?: () => void;
  isCompact?: boolean; // When rendered in split view
}

export const Next24hPanel: React.FC<Next24hPanelProps> = ({
  events,
  onSelectEvent,
  onOpenCreateEvent,
  onSyncGoogle,
  isSyncing = false,
  categories,
  searchQuery = '',
  onClearSearch
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [briefing, setBriefing] = useState<string>('');
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);

  // Update timer every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter events within next 24 hours (inclusive of currently running events)
  const next24hEventsRaw = events
    .filter((e) => {
      const startTime = new Date(e.start).getTime();
      const endTime = new Date(e.end).getTime();
      const horizonEnd = currentTime + 24 * 60 * 60 * 1000;
      return (startTime <= horizonEnd && endTime >= currentTime) || (startTime >= currentTime && startTime <= horizonEnd);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const hasSearch = Boolean(searchQuery && searchQuery.trim());
  const next24hEvents = hasSearch
    ? next24hEventsRaw.filter((e) => matchesEventSearch(e, searchQuery))
    : next24hEventsRaw;

  // AI Briefing
  const handleGenerateBriefing = async () => {
    sounds.playTactileClick();
    setIsLoadingBriefing(true);
    setIsBriefingOpen(true);
    try {
      const res = await fetchDailyBriefing(next24hEventsRaw);
      setBriefing(res);
      sounds.playSyncSuccess();
    } catch {
      setBriefing('Não foi possível gerar o briefing inteligente no momento.');
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Compute live countdown
  const getCountdown = (event: CalendarEvent) => {
    const startMs = new Date(event.start).getTime();
    const endMs = new Date(event.end).getTime();

    if (currentTime >= startMs && currentTime <= endMs) {
      const remainingMs = endMs - currentTime;
      const minutesLeft = Math.max(1, Math.floor(remainingMs / 60000));
      return {
        label: `Em andamento (${minutesLeft}m restantes)`,
        isOngoing: true,
        urgency: 'ongoing' as const
      };
    }

    const diffMs = startMs - currentTime;
    if (diffMs <= 0) return { label: 'Começou agora', isOngoing: true, urgency: 'urgent' as const };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    let label = '';
    if (hours > 0) {
      label = `Em ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      label = `Em ${minutes}m ${seconds}s`;
    } else {
      label = `Em ${seconds}s`;
    }

    let urgency: 'urgent' | 'soon' | 'normal' = 'normal';
    if (hours === 0 && minutes < 30) urgency = 'urgent';
    else if (hours < 3) urgency = 'soon';

    return { label, isOngoing: false, urgency };
  };

  // Live time display string
  const currentFormattedTime = new Date(currentTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-slate-900/40 dark:bg-slate-950/40 select-none overflow-hidden">
      
      {/* Panel Top Header Bar */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 border-b border-white/10 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                Próximas 24h
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold tabular-nums">
                {next24hEvents.length}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tabular-nums leading-none mt-0.5">
              Agora: {currentFormattedTime}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* AI Briefing Button */}
          <button
            onClick={handleGenerateBriefing}
            disabled={isLoadingBriefing}
            className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[11px] font-medium transition active:scale-95 flex items-center gap-1"
            title="Briefing Inteligente com IA Gemini"
          >
            {isLoadingBriefing ? (
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-purple-400" />
            ) : (
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
            )}
            <span className="hidden sm:inline">Briefing</span>
          </button>

          {/* Sync Button */}
          {onSyncGoogle && (
            <button
              onClick={() => { sounds.playTactileClick(); onSyncGoogle(); }}
              disabled={isSyncing}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50"
              title="Sincronizar com Google Calendar"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Quick Create Event */}
          <button
            onClick={() => { sounds.playTactileClick(); onOpenCreateEvent(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold shadow-sm transition active:scale-95"
            title="Adicionar compromisso nas próximas 24h"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* AI Briefing Drawer */}
      {isBriefingOpen && (
        <div className="flex-shrink-0 p-3 bg-purple-950/30 border-b border-purple-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span>Briefing Executivo (Gemini)</span>
            </div>
            <button
              onClick={() => setIsBriefingOpen(false)}
              className="p-0.5 rounded text-slate-400 hover:text-white transition"
              title="Fechar briefing"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed mt-1.5 whitespace-pre-line">
            {briefing || 'Analisando seus compromissos imediatos...'}
          </p>
        </div>
      )}

      {/* Search Indicator */}
      {hasSearch && (
        <div className="flex-shrink-0 px-3 py-1.5 bg-blue-950/40 border-b border-blue-500/20 flex items-center justify-between text-[11px] text-blue-300">
          <div className="flex items-center gap-1.5 truncate">
            <Search className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="truncate">Busca: "{searchQuery}" ({next24hEvents.length})</span>
          </div>
          {onClearSearch && (
            <button onClick={onClearSearch} className="text-blue-400 hover:text-white ml-2 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable Events List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 flex flex-col gap-2">
        {next24hEvents.length === 0 ? (
          <div className="py-8 px-4 text-center text-slate-400 flex flex-col items-center justify-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 my-auto">
            <Calendar className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              Nenhum evento nas próximas 24h
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px]">
              Sua agenda está livre para este período imediato.
            </p>
            <button
              onClick={() => onOpenCreateEvent()}
              className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-medium transition active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Agendar Compromisso</span>
            </button>
          </div>
        ) : (
          next24hEvents.map((event) => {
            const { label: countdownLabel, isOngoing, urgency } = getCountdown(event);
            const eventColor = resolveEventColor(event, categories);
            const categoryName = getCategoryName(event.category, categories);

            const startTimeFormatted = new Date(event.start).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            const endTimeFormatted = new Date(event.end).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={event.id}
                onClick={() => {
                  sounds.playTactileClick();
                  onSelectEvent(event);
                }}
                className={`p-2.5 sm:p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800/90 border transition cursor-pointer flex flex-col gap-2 group ${
                  isOngoing
                    ? 'border-blue-400/50 bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : urgency === 'urgent'
                    ? 'border-rose-500/40 bg-rose-950/15'
                    : 'border-white/5 hover:border-slate-700'
                }`}
              >
                {/* Card Header: Category + Live Countdown */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: eventColor }}
                    />
                    <span
                      className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border truncate max-w-[100px]"
                      style={{
                        backgroundColor: `${eventColor}15`,
                        borderColor: `${eventColor}30`,
                        color: eventColor
                      }}
                    >
                      {categoryName}
                    </span>
                    {event.isGoogleSynced && (
                      <span title="Sincronizado com Google Calendar">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                      </span>
                    )}
                  </div>

                  {/* Countdown Badge */}
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1 ${
                      isOngoing
                        ? 'bg-blue-500/25 text-blue-300 border border-blue-400/40 animate-pulse'
                        : urgency === 'urgent'
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse'
                        : urgency === 'soon'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-900/80 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>{countdownLabel}</span>
                  </span>
                </div>

                {/* Event Title */}
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition line-clamp-2">
                    {event.title}
                  </h4>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition flex-shrink-0 mt-0.5" />
                </div>

                {/* Description snippet if any */}
                {event.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {event.description}
                  </p>
                )}

                {/* Footer metadata: Time + Location + Meet Link */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5 text-[10px] text-slate-400 flex-wrap">
                  <span className="font-mono text-slate-300 font-medium">
                    {event.isAllDay ? 'Dia Inteiro' : `${startTimeFormatted} - ${endTimeFormatted}`}
                  </span>

                  <div className="flex items-center gap-2">
                    {event.location && (
                      <span className="flex items-center gap-0.5 text-slate-400 truncate max-w-[90px]" title={event.location}>
                        <MapPin className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    )}

                    {event.hangoutLink && (
                      <a
                        href={event.hangoutLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition font-medium text-[10px]"
                        title="Abrir Google Meet"
                      >
                        <Video className="w-2.5 h-2.5" />
                        <span>Meet</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
