import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Search,
  X,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { CalendarEvent, CategoryDefinition } from '../types/calendar';
import { sounds } from '../services/soundEffects';
import { resolveEventColor, getCategoryName, matchesEventSearch, toLocalDateKey } from '../services/storage';
import { Next24hPanel } from './Next24hPanel';

interface MonthViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  onDayClick?: (dayDate: Date) => void;
  categories?: CategoryDefinition[];
  searchQuery?: string;
  onClearSearch?: () => void;
  onSyncGoogle?: () => void;
  isSyncing?: boolean;
  googleConnected?: boolean;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onSelectEvent,
  onOpenCreateEvent,
  onDayClick,
  categories,
  searchQuery = '',
  onClearSearch,
  onSyncGoogle,
  isSyncing = false,
  googleConnected = false
}) => {
  const [mobileTab, setMobileTab] = useState<'calendar' | 'next24h'>('calendar');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    sounds.playTactileClick();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    sounds.playTactileClick();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    sounds.playTactileClick();
    setCurrentDate(new Date());
  };

  // Compute calendar days
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

  const today = new Date();
  const isCurrentDay = (d: number, m: number, y: number) => {
    return (
      today.getDate() === d &&
      today.getMonth() === m &&
      today.getFullYear() === y
    );
  };

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];

  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Map events to date strings YYYY-MM-DD
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((ev) => {
    const dateKey = toLocalDateKey(ev.start);
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(ev);
  });

  const hasSearch = Boolean(searchQuery && searchQuery.trim());
  const totalSearchMatches = hasSearch
    ? events.filter((e) => matchesEventSearch(e, searchQuery)).length
    : 0;

  // Calculate upcoming events in next 24h for the mobile badge
  const now = Date.now();
  const next24hCount = events.filter((e) => {
    const st = new Date(e.start).getTime();
    const et = new Date(e.end).getTime();
    const end24 = now + 24 * 60 * 60 * 1000;
    return (st <= end24 && et >= now) || (st >= now && st <= end24);
  }).length;

  return (
    <div className="flex-1 w-full h-full flex flex-col lg:flex-row min-h-0 bg-transparent select-none overflow-hidden">
      
      {/* =========================================================================
          PRIMARY REGION: Monthly Calendar Grid (Proporção Maior)
          ========================================================================= */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-white/10 dark:border-white/5 ${
          mobileTab === 'next24h' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Month Toolbar */}
        <div className="flex-shrink-0 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 py-2 border-b border-white/10 dark:border-white/5 flex-wrap gap-2 bg-slate-900/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight capitalize flex items-center gap-1.5">
              <span>{monthNames[month]}</span>
              <span className="text-slate-400 font-medium">{year}</span>
            </h2>
            <button
              onClick={goToToday}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] sm:text-xs font-medium text-slate-200 transition active:scale-95"
            >
              Hoje
            </button>
          </div>

          {/* Search Active Notification Badge */}
          {hasSearch && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] animate-in fade-in">
              <Search className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-xs">
                "{searchQuery}" ({totalSearchMatches})
              </span>
              {onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="p-0.5 rounded-full hover:bg-blue-500/30 text-blue-300 hover:text-white transition"
                  title="Limpar busca"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* Right Controls: Navigation & Mobile Segmented Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Mobile View Toggle: Calendar vs Próximas 24h (hidden on lg: where both show simultaneously) */}
            <div className="flex lg:hidden items-center p-0.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setMobileTab('calendar')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                  mobileTab === 'calendar'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3 h-3" />
                <span className="hidden xs:inline">Mês</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('next24h')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                  mobileTab === 'next24h'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="hidden xs:inline">24h</span>
                <span className="px-1 py-0.2 rounded-full bg-white/20 text-[9px] font-mono">
                  {next24hCount}
                </span>
              </button>
            </div>

            {/* Prev / Next Month Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1 sm:p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition active:scale-95"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 sm:p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition active:scale-95"
                title="Próximo Mês"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 border-b border-white/10 dark:border-white/5 text-center text-[10px] sm:text-xs font-semibold text-slate-400 py-1 sm:py-1.5 bg-slate-900/40">
          {weekDayNames.map((day, idx) => (
            <div key={day} className={idx === 0 || idx === 6 ? 'text-blue-400/80' : ''}>
              {day}
            </div>
          ))}
        </div>

        {/* Full-Screen Month Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6 gap-[1px] bg-white/5 dark:bg-white/5 min-h-0 overflow-y-auto">
          {Array.from({ length: totalCells }).map((_, index) => {
            let dayNumber: number;
            let cellMonth: number = month;
            let cellYear: number = year;
            let isOtherMonth = false;

            if (index < startDayOfWeek) {
              // Day from previous month
              dayNumber = daysInPrevMonth - (startDayOfWeek - index - 1);
              cellMonth = month === 0 ? 11 : month - 1;
              cellYear = month === 0 ? year - 1 : year;
              isOtherMonth = true;
            } else if (index >= startDayOfWeek + daysInMonth) {
              // Day from next month
              dayNumber = index - (startDayOfWeek + daysInMonth) + 1;
              cellMonth = month === 11 ? 0 : month + 1;
              cellYear = month === 11 ? year + 1 : year;
              isOtherMonth = true;
            } else {
              // Current month day
              dayNumber = index - startDayOfWeek + 1;
            }

            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            const dateKey = `${cellYear}-${pad(cellMonth + 1)}-${pad(dayNumber)}`;
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isToday = isCurrentDay(dayNumber, cellMonth, cellYear);

            // Check if day cell contains any event matching global search query
            const hasMatchingEvent =
              hasSearch && dayEvents.some((ev) => matchesEventSearch(ev, searchQuery));

            return (
              <div
                key={index}
                onClick={() => {
                  if (onDayClick) {
                    onDayClick(new Date(cellYear, cellMonth, dayNumber));
                  }
                }}
                className={`p-1 sm:p-1.5 lg:p-2 flex flex-col justify-between transition-colors relative group min-h-[56px] sm:min-h-[75px] lg:min-h-[90px] cursor-pointer ${
                  hasMatchingEvent
                    ? 'ring-2 ring-blue-500/60 bg-blue-900/20'
                    : isOtherMonth
                    ? 'bg-slate-950/40 text-slate-600'
                    : isToday
                    ? 'bg-blue-950/20 text-slate-100'
                    : 'bg-slate-900/60 hover:bg-slate-800/50 text-slate-200'
                }`}
              >
                {/* Day Cell Header */}
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <span
                    className={`text-[11px] sm:text-xs lg:text-sm font-semibold inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md shadow-blue-600/40'
                        : isOtherMonth
                        ? 'text-slate-500'
                        : 'text-slate-200 group-hover:text-blue-300'
                    }`}
                  >
                    {dayNumber}
                  </span>

                  {/* Quick Add Button on Hover / Focus */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const presetTime = `${dateKey}T09:00:00`;
                      sounds.playTactileClick();
                      onOpenCreateEvent(presetTime);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition hidden sm:block"
                    title="Adicionar evento neste dia"
                  >
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>

                {/* Day Events Pills */}
                <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const eventColor = resolveEventColor(ev, categories);
                    const isMatch = hasSearch ? matchesEventSearch(ev, searchQuery) : true;
                    const startTime = ev.isAllDay
                      ? ''
                      : new Date(ev.start).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          sounds.playTactileClick();
                          onSelectEvent(ev);
                        }}
                        className={`flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium truncate cursor-pointer transition shadow-xs hover:brightness-110 active:scale-98 ${
                          hasSearch && !isMatch ? 'opacity-30' : ''
                        } ${hasSearch && isMatch ? 'ring-1 ring-white/50 font-bold' : ''}`}
                        style={{
                          backgroundColor: `${eventColor}25`,
                          color: eventColor || '#93c5fd',
                          borderLeft: `2.5px solid ${eventColor || '#3b82f6'}`
                        }}
                        title={`${ev.title} (${startTime || 'Dia todo'}) - ${getCategoryName(ev.category, categories)}`}
                      >
                        {ev.hangoutLink && <Video className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />}
                        <span className="truncate">
                          {startTime && <span className="opacity-80 mr-1 hidden sm:inline">{startTime}</span>}
                          {ev.title}
                        </span>
                      </div>
                    );
                  })}

                  {/* Overflow count */}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 px-1 hover:text-blue-300 cursor-pointer">
                      +{dayEvents.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECONDARY REGION: "Próximas 24h" (Fused Horizon Panel)
          Desktop: dedicated sidebar (~360px - 420px)
          Mobile: displayed when mobileTab === 'next24h'
          ========================================================================= */}
      <div
        className={`w-full lg:w-[350px] xl:w-[400px] 2xl:w-[440px] flex-shrink-0 flex flex-col h-full overflow-hidden ${
          mobileTab === 'calendar' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Mobile Header Bar with Back to Calendar button */}
        <div className="flex lg:hidden items-center justify-between px-3 py-2 bg-slate-900 border-b border-white/10">
          <button
            onClick={() => setMobileTab('calendar')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Calendário</span>
          </button>
          <span className="text-xs font-bold text-slate-300">
            {monthNames[month]} {year}
          </span>
        </div>

        <Next24hPanel
          events={events}
          onSelectEvent={onSelectEvent}
          onOpenCreateEvent={onOpenCreateEvent}
          onSyncGoogle={onSyncGoogle}
          isSyncing={isSyncing}
          googleConnected={googleConnected}
          categories={categories}
          searchQuery={searchQuery}
          onClearSearch={onClearSearch}
          isCompact={true}
        />
      </div>

    </div>
  );
};
