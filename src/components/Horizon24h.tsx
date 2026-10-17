import React, { useState, useEffect } from 'react';
import {
  Clock,
  Video,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Calendar,
  ExternalLink,
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

interface Horizon24hProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  onSyncGoogle: () => void;
  isSyncing: boolean;
  categories?: CategoryDefinition[];
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const Horizon24h: React.FC<Horizon24hProps> = ({
  events,
  onSelectEvent,
  onOpenCreateEvent,
  onSyncGoogle,
  isSyncing,
  categories,
  searchQuery = '',
  onClearSearch
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [briefing, setBriefing] = useState<string>('');
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);

  // Update timer every second for accurate countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter events within the 24h window (including currently active events)
  const next24hEventsRaw = events
    .filter((e) => {
      const startTime = new Date(e.start).getTime();
      const endTime = new Date(e.end).getTime();
      const horizonEnd = currentTime + 24 * 60 * 60 * 1000;

      // Event is either occurring now or starts in next 24 hours
      return (startTime <= horizonEnd && endTime >= currentTime) || (startTime >= currentTime && startTime <= horizonEnd);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const hasSearch = Boolean(searchQuery && searchQuery.trim());
  const next24hEvents = hasSearch
    ? next24hEventsRaw.filter((e) => matchesEventSearch(e, searchQuery))
    : next24hEventsRaw;

  // Generate AI Executive Briefing for next 24 hours
  const handleGenerateBriefing = async () => {
    sounds.playTactileClick();
    setIsLoadingBriefing(true);
    try {
      const res = await fetchDailyBriefing(next24hEventsRaw);
      setBriefing(res);
      sounds.playSyncSuccess();
    } catch (e) {
      setBriefing('Não foi possível gerar o briefing inteligente no momento.');
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Compute countdown format for an event
  const getCountdown = (event: CalendarEvent) => {
    const startMs = new Date(event.start).getTime();
    const endMs = new Date(event.end).getTime();

    // Check if event is happening now
    if (currentTime >= startMs && currentTime <= endMs) {
      const remainingMs = endMs - currentTime;
      const minutesLeft = Math.floor(remainingMs / 60000);
      return {
        label: `Em andamento (termina em ${minutesLeft}m)`,
        isOngoing: true,
        urgency: 'ongoing'
      };
    }

    const diffMs = startMs - currentTime;
    if (diffMs <= 0) return { label: 'Começou agora', isOngoing: true, urgency: 'urgent' };

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

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-3 sm:p-6 flex flex-col gap-6">
      
      {/* 24h Horizon Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/30 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Horizonte 24 Horas
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-semibold">
                {next24hEvents.length} eventos
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Monitoramento ativo de todos os compromissos, reuniões e lembretes para as próximas 24 horas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => { sounds.playTactileClick(); onSyncGoogle(); }}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-200 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Google</span>
          </button>
          <button
            onClick={() => { sounds.playTactileClick(); onOpenCreateEvent(); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar no Horizonte</span>
          </button>
        </div>
      </div>

      {/* Search Active Notification Banner */}
      {hasSearch && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <span>
              Filtrando horizonte 24h por: <strong>"{searchQuery}"</strong> ({next24hEvents.length} resultados)
            </span>
          </div>
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Limpar busca
            </button>
          )}
        </div>
      )}

      {/* AI Executive Briefing Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-purple-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-purple-200 tracking-wide">
                Briefing Executivo IA Gemini
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50">
                gemini-3.8-flash
              </span>
            </div>

            {briefing ? (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mt-2 whitespace-pre-line">
                {briefing}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Gere um resumo inteligente com sugestões de foco, gaps de descanso e preparação para reuniões das próximas 24h.
              </p>
            )}

            <button
              onClick={handleGenerateBriefing}
              disabled={isLoadingBriefing}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition disabled:opacity-50"
            >
              {isLoadingBriefing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analisando agenda...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{briefing ? 'Atualizar Briefing' : 'Gerar Briefing com IA'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 24h Timeline List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span>Próximos Compromissos Imediatos</span>
          <span className="text-xs font-normal text-slate-500">
            ({next24hEvents.length} no horizonte)
          </span>
        </h3>

        {next24hEvents.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-slate-400 flex flex-col items-center justify-center">
            <Calendar className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-base font-semibold text-slate-300">Nenhum evento nas próximas 24 horas</p>
            <p className="text-xs text-slate-500 mt-1">
              Sua agenda está livre para este período. Desfrute do seu tempo ou agende novos compromissos!
            </p>
            <button
              onClick={() => onOpenCreateEvent()}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium shadow-md shadow-blue-600/30"
            >
              Criar Novo Evento
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
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/70 border border-white/10 hover:border-slate-700 backdrop-blur-xl shadow-lg transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  isOngoing ? 'ring-2 ring-blue-500/50 bg-blue-950/20' : ''
                }`}
              >
                {/* Left: Event Details & Category Indicator */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className="w-2.5 sm:w-3 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: eventColor }}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                        {event.isAllDay ? 'Dia Inteiro' : `${startTimeFormatted} - ${endTimeFormatted}`}
                      </span>

                      {/* Category pill reflecting category color */}
                      <span
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: `${eventColor}20`,
                          borderColor: `${eventColor}40`,
                          color: eventColor
                        }}
                      >
                        {categoryName}
                      </span>

                      {event.isGoogleSynced && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Sincronizado Google
                        </span>
                      )}
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-white mt-1.5 group-hover:text-blue-300 transition truncate">
                      {event.title}
                    </h4>

                    {event.description && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {event.location}
                        </span>
                      )}
                      {event.reminderMinutes && event.reminderMinutes.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Bell className="w-3.5 h-3.5 text-blue-400" />
                          Lembrete {event.reminderMinutes[0]} min antes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Live Countdown Badge & Google Meet Action */}
                <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                  
                  {/* Countdown Ticker */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold shadow-sm ${
                      isOngoing
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50 animate-pulse'
                        : urgency === 'urgent'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : urgency === 'soon'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{countdownLabel}</span>
                  </div>

                  {/* Google Meet join button */}
                  {event.hangoutLink && (
                    <a
                      href={event.hangoutLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition"
                      title="Entrar na chamada de vídeo do Google Meet"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Google Meet</span>
                    </a>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
