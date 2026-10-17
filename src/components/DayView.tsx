import React from 'react';
import { ChevronLeft, ChevronRight, Video, MapPin, Clock, Plus, CheckCircle2 } from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface DayViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onSelectEvent,
  onOpenCreateEvent
}) => {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dateIso = currentDate.toISOString().split('T')[0];

  const prevDay = () => {
    sounds.playTactileClick();
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    sounds.playTactileClick();
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToToday = () => {
    sounds.playTactileClick();
    setCurrentDate(new Date());
  };

  const dayEvents = events
    .filter((e) => e.start.split('T')[0] === dateIso)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const hours = Array.from({ length: 24 }).map((_, i) => i);

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-transparent select-none">
      
      {/* Day Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2 border-b border-white/10 dark:border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight capitalize">
            {currentDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
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
            onClick={prevDay}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hourly Schedule View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col gap-2">
        {hours.map((h) => {
          const slotEvents = dayEvents.filter((ev) => {
            const evHour = new Date(ev.start).getHours();
            return evHour === h;
          });

          return (
            <div
              key={h}
              className="flex items-start gap-4 p-2 sm:p-3 rounded-2xl hover:bg-slate-800/40 border border-transparent hover:border-slate-700/50 transition-colors"
            >
              <div className="w-14 sm:w-16 flex-shrink-0 text-xs font-mono font-bold text-slate-400 pt-1">
                {pad(h)}:00
              </div>

              <div className="flex-1 flex flex-col gap-2 min-h-[44px]">
                {slotEvents.length === 0 ? (
                  <div
                    onClick={() => {
                      sounds.playTactileClick();
                      onOpenCreateEvent(`${dateIso}T${pad(h)}:00:00`);
                    }}
                    className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-slate-800 hover:border-slate-600 text-slate-600 hover:text-slate-300 text-xs cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Livre • Clique para agendar</span>
                  </div>
                ) : (
                  slotEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        sounds.playTactileClick();
                        onSelectEvent(ev);
                      }}
                      className="p-3.5 rounded-xl border border-white/10 backdrop-blur-md cursor-pointer shadow-md hover:brightness-110 transition flex items-center justify-between"
                      style={{
                        backgroundColor: `${ev.color}25`,
                        borderLeft: `5px solid ${ev.color || '#3b82f6'}`
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-300 font-bold">
                            {new Date(ev.start).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}{' '}
                            -{' '}
                            {new Date(ev.end).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span
                            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: `${ev.color || '#3b82f6'}30`,
                              borderColor: `${ev.color || '#3b82f6'}50`,
                              color: ev.color || '#3b82f6'
                            }}
                          >
                            {ev.category}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white mt-1">{ev.title}</h4>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{ev.location}</span>
                          </div>
                        )}
                      </div>

                      {ev.hangoutLink && (
                        <a
                          href={ev.hangoutLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Meet</span>
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
