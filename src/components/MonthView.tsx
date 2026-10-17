import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface MonthViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  onDayClick?: (dayDate: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onSelectEvent,
  onOpenCreateEvent,
  onDayClick
}) => {
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
    const dateKey = ev.start.split('T')[0];
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(ev);
  });

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-transparent select-none">
      
      {/* Month Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2 border-b border-white/10 dark:border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight capitalize">
            {monthNames[month]} <span className="text-slate-400 font-medium">{year}</span>
          </h2>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
            title="Mês Anterior (Deslize para direita)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
            title="Próximo Mês (Deslize para esquerda)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-white/10 dark:border-white/5 text-center text-xs font-semibold text-slate-400 py-1.5 bg-slate-900/40">
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
            // Previous month
            dayNumber = daysInPrevMonth - startDayOfWeek + index + 1;
            cellMonth = month - 1;
            if (cellMonth < 0) {
              cellMonth = 11;
              cellYear = year - 1;
            }
            isOtherMonth = true;
          } else if (index >= startDayOfWeek + daysInMonth) {
            // Next month
            dayNumber = index - (startDayOfWeek + daysInMonth) + 1;
            cellMonth = month + 1;
            if (cellMonth > 11) {
              cellMonth = 0;
              cellYear = year + 1;
            }
            isOtherMonth = true;
          } else {
            // Current month
            dayNumber = index - startDayOfWeek + 1;
          }

          const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
          const dateKey = `${cellYear}-${pad(cellMonth + 1)}-${pad(dayNumber)}`;
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = isCurrentDay(dayNumber, cellMonth, cellYear);

          return (
            <div
              key={dateKey}
              onClick={() => {
                if (onDayClick) onDayClick(new Date(cellYear, cellMonth, dayNumber));
              }}
              className={`group relative flex flex-col p-1 sm:p-2 transition-colors min-h-[70px] sm:min-h-[90px] overflow-hidden ${
                isOtherMonth
                  ? 'bg-slate-950/40 text-slate-600'
                  : isToday
                  ? 'bg-blue-950/20 text-slate-100'
                  : 'bg-slate-900/60 hover:bg-slate-800/50 text-slate-200'
              }`}
            >
              {/* Day Cell Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs sm:text-sm font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md shadow-blue-600/40'
                      : isOtherMonth
                      ? 'text-slate-500'
                      : 'text-slate-200 group-hover:text-blue-300'
                  }`}
                >
                  {dayNumber}
                </span>

                {/* Quick Add Button on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const presetTime = `${dateKey}T09:00:00`;
                    sounds.playTactileClick();
                    onOpenCreateEvent(presetTime);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition"
                  title="Adicionar evento neste dia"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day Events Pills */}
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
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
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium truncate cursor-pointer transition shadow-xs hover:brightness-110 active:scale-98"
                      style={{
                        backgroundColor: `${ev.color}25`,
                        color: ev.color || '#93c5fd',
                        borderLeft: `3px solid ${ev.color || '#3b82f6'}`
                      }}
                      title={`${ev.title} (${startTime || 'Dia todo'})`}
                    >
                      {ev.hangoutLink && <Video className="w-2.5 h-2.5 flex-shrink-0" />}
                      <span className="truncate">
                        {startTime && <span className="opacity-80 mr-1">{startTime}</span>}
                        {ev.title}
                      </span>
                    </div>
                  );
                })}

                {/* Overflow count */}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] font-medium text-slate-400 px-1 hover:text-blue-300 cursor-pointer">
                    +{dayEvents.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
