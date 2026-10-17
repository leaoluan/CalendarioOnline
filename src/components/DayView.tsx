import React from 'react';
import { ChevronLeft, ChevronRight, Video, MapPin, Clock, Plus, CheckCircle2, Search, X } from 'lucide-react';
import { CalendarEvent, CategoryDefinition } from '../types/calendar';
import { sounds } from '../services/soundEffects';
import { resolveEventColor, getCategoryName, matchesEventSearch, toLocalDateKey } from '../services/storage';

interface DayViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  categories?: CategoryDefinition[];
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  setCurrentDate,
  events,
  onSelectEvent,
  onOpenCreateEvent,
  categories,
  searchQuery = '',
  onClearSearch
}) => {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dateIso = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;

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
    .filter((e) => toLocalDateKey(e.start) === dateIso)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const hours = Array.from({ length: 24 }).map((_, i) => i);

  const hasSearch = Boolean(searchQuery && searchQuery.trim());
  const matchingDayEventsCount = hasSearch
    ? dayEvents.filter((e) => matchesEventSearch(e, searchQuery)).length
    : 0;

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-transparent select-none">
      
      {/* Day Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-white/10 dark:border-white/5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight capitalize">
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

        {/* Search Active Notification Badge */}
        {hasSearch && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs animate-in fade-in">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Filtrando dia por: <strong>"{searchQuery}"</strong> ({matchingDayEventsCount} neste dia)
            </span>
            {onClearSearch && (
              <button
                onClick={onClearSearch}
                className="p-0.5 rounded-full hover:bg-blue-500/30 text-blue-300 hover:text-white transition"
                title="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevDay}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
            title="Dia Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition"
            title="Próximo Dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hourly Schedule List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 divide-y divide-white/5">
        {hours.map((h) => {
          // Find events that start in this hour
          const slotEvents = dayEvents.filter((ev) => {
            const dt = new Date(ev.start);
            return dt.getHours() === h;
          });

          return (
            <div key={h} className="py-2.5 flex items-start gap-4 group">
              
              {/* Hour Label */}
              <div className="w-14 sm:w-16 flex-shrink-0 text-right font-mono text-xs text-slate-400 pt-1">
                {pad(h)}:00
              </div>

              {/* Slot Area */}
              <div className="flex-1 flex flex-col gap-2">
                {slotEvents.length === 0 ? (
                  <div
                    onClick={() => {
                      const presetTime = `${dateIso}T${pad(h)}:00:00`;
                      sounds.playTactileClick();
                      onOpenCreateEvent(presetTime);
                    }}
                    className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-slate-800 hover:border-slate-600 text-slate-600 hover:text-slate-300 text-xs cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Livre • Clique para agendar</span>
                  </div>
                ) : (
                  slotEvents.map((ev) => {
                    const eventColor = resolveEventColor(ev, categories);
                    const categoryName = getCategoryName(ev.category, categories);
                    const isMatch = hasSearch ? matchesEventSearch(ev, searchQuery) : true;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          sounds.playTactileClick();
                          onSelectEvent(ev);
                        }}
                        className={`p-3.5 rounded-xl border border-white/10 backdrop-blur-md cursor-pointer shadow-md hover:brightness-110 transition flex items-center justify-between gap-3 ${
                          hasSearch && !isMatch ? 'opacity-30' : ''
                        } ${hasSearch && isMatch ? 'ring-2 ring-white/60 shadow-xl' : ''}`}
                        style={{
                          backgroundColor: `${eventColor}25`,
                          borderLeft: `5px solid ${eventColor || '#3b82f6'}`
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
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

                            {/* Category pill reflecting category color */}
                            <span
                              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: `${eventColor}30`,
                                borderColor: `${eventColor}50`,
                                color: eventColor
                              }}
                            >
                              {categoryName}
                            </span>

                            {ev.isGoogleSynced && (
                              <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Sincronizado Google
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-white mt-1">{ev.title}</h4>

                          {ev.location && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{ev.location}</span>
                            </div>
                          )}

                          {ev.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ev.description}</p>
                          )}
                        </div>

                        {ev.hangoutLink && (
                          <a
                            href={ev.hangoutLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Entrar</span>
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
