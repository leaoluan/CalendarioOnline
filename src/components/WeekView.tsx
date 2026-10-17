import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Video, CheckCircle2, Clock } from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface WeekViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onSelectEvent,
  onOpenCreateEvent
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to 8:00 AM on initial mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * 60; // 8 AM * 60px per hour
    }
  }, []);

  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => {
    sounds.playTactileClick();
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    sounds.playTactileClick();
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToToday = () => {
    sounds.playTactileClick();
    setCurrentDate(new Date());
  };

  const now = new Date();
  const isToday = (d: Date) => {
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  // Filter events for the week
  const weekStartMs = weekDays[0].getTime();
  const weekEndMs = weekDays[6].getTime() + 86400000;

  const currentWeekEvents = events.filter((e) => {
    const s = new Date(e.start).getTime();
    return s >= weekStartMs && s < weekEndMs;
  });

  // Calculate current time line position
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-transparent select-none">
      
      {/* Week Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2 border-b border-white/10 dark:border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {weekDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} –{' '}
            {weekDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
            onClick={prevWeek}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Day Header Columns */}
      <div className="flex-shrink-0 flex border-b border-white/10 dark:border-white/5 bg-slate-900/50">
        <div className="w-14 sm:w-16 flex-shrink-0 border-r border-white/10 text-center py-2 text-[10px] text-slate-500 font-mono">
          HORA
        </div>
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((d) => {
            const todayMatch = isToday(d);
            return (
              <div
                key={d.toISOString()}
                className={`py-2 text-center border-r border-white/5 last:border-r-0 ${
                  todayMatch ? 'bg-blue-600/10' : ''
                }`}
              >
                <div className="text-[11px] font-semibold uppercase text-slate-400">
                  {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </div>
                <div
                  className={`text-sm sm:text-base font-bold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                    todayMatch ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40' : 'text-slate-200'
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Grid Scrollable Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0">
        <div className="flex relative" style={{ height: `${24 * 60}px` }}>
          
          {/* Hour labels gutter */}
          <div className="w-14 sm:w-16 flex-shrink-0 border-r border-white/10 flex flex-col bg-slate-950/30">
            {hours.map((h) => (
              <div
                key={h}
                className="h-[60px] text-[11px] text-slate-400 font-mono pr-2 text-right -translate-y-2.5 border-b border-white/5"
              >
                {pad(h)}:00
              </div>
            ))}
          </div>

          {/* 7 Day Columns */}
          <div className="flex-1 grid grid-cols-7 relative">
            {weekDays.map((d, colIdx) => {
              const dayIso = d.toISOString().split('T')[0];
              const todayMatch = isToday(d);

              // Find events for this specific day
              const dayEvents = currentWeekEvents.filter(
                (e) => e.start.split('T')[0] === dayIso
              );

              return (
                <div
                  key={dayIso}
                  className={`relative border-r border-white/10 last:border-r-0 ${
                    todayMatch ? 'bg-blue-950/15' : ''
                  }`}
                >
                  {/* Hour slots (click to add event) */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      onClick={() => {
                        const presetTime = `${dayIso}T${pad(h)}:00:00`;
                        sounds.playTactileClick();
                        onOpenCreateEvent(presetTime);
                      }}
                      className="h-[60px] border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    />
                  ))}

                  {/* Red Live Time Marker Line on Today */}
                  {todayMatch && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${currentMinutesFromMidnight}px` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-sm shadow-rose-500" />
                      <div className="flex-1 border-t-2 border-rose-500" />
                    </div>
                  )}

                  {/* Events positioned in column */}
                  {dayEvents.map((ev) => {
                    const startDt = new Date(ev.start);
                    const endDt = new Date(ev.end);
                    const startMin = startDt.getHours() * 60 + startDt.getMinutes();
                    const endMin = endDt.getHours() * 60 + endDt.getMinutes();
                    const duration = Math.max(endMin - startMin, 30); // min 30 min height

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          sounds.playTactileClick();
                          onSelectEvent(ev);
                        }}
                        style={{
                          top: `${startMin}px`,
                          height: `${duration}px`,
                          backgroundColor: `${ev.color}35`,
                          borderLeft: `4px solid ${ev.color || '#3b82f6'}`
                        }}
                        className="absolute left-1 right-1 rounded-lg p-1.5 overflow-hidden text-xs cursor-pointer shadow-md backdrop-blur-md border border-white/10 hover:brightness-125 z-10 transition-transform active:scale-98"
                      >
                        <div className="flex items-center gap-1 font-bold text-white truncate text-[11px]">
                          {ev.hangoutLink && <Video className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                          <span className="truncate">{ev.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono opacity-90 truncate">
                          {startDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {endDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
};
