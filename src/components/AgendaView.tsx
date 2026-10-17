import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Video,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { CalendarEvent, CategoryDefinition } from '../types/calendar';
import { exportToICS } from '../services/googleCalendar';
import { sounds } from '../services/soundEffects';
import { resolveEventColor, getCategoryName, matchesEventSearch, toLocalDateKey } from '../services/storage';

interface AgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  categories: CategoryDefinition[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onSelectEvent,
  onOpenCreateEvent,
  categories,
  searchQuery: externalSearchQuery,
  onSearchQueryChange
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Unified search query from props or internal
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (q: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(q);
    } else {
      setInternalSearchQuery(q);
    }
  };

  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  // Filter events matching search and category
  const filteredEvents = events.filter((e) => {
    const matchesSearch = matchesEventSearch(e, searchQuery);
    const matchesCategory =
      selectedCategory === 'all' ||
      e.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Group events
  const todayEvents = filteredEvents.filter((e) => toLocalDateKey(e.start) === todayIso);
  const tomorrowEvents = filteredEvents.filter((e) => toLocalDateKey(e.start) === tomorrowIso);
  const next7DaysEvents = filteredEvents.filter((e) => {
    const d = new Date(e.start);
    return d > tomorrow && d <= in7Days;
  });
  const laterEvents = filteredEvents.filter((e) => {
    const d = new Date(e.start);
    return d > in7Days;
  });

  const handleExportICS = () => {
    sounds.playTactileClick();
    const icsContent = exportToICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronos_calendar_${todayIso}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderEventCard = (e: CalendarEvent) => {
    const eventColor = resolveEventColor(e, categories);
    const categoryName = getCategoryName(e.category, categories);

    return (
      <div
        key={e.id}
        onClick={() => {
          sounds.playTactileClick();
          onSelectEvent(e);
        }}
        className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl shadow-lg transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-2.5 sm:w-3 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: eventColor }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                {e.isAllDay
                  ? 'Dia todo'
                  : `${new Date(e.start).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - ${new Date(e.end).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
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

              {e.isGoogleSynced && (
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Google Sync
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-white mt-1.5 truncate">{e.title}</h4>
            {e.description && (
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{e.description}</p>
            )}

            {e.location && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5 truncate">
                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="truncate">{e.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          {e.hangoutLink && (
            <a
              href={e.hangoutLink}
              target="_blank"
              rel="noreferrer"
              onClick={(ev) => ev.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/30"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Meet</span>
            </a>
          )}
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-3 sm:p-6 flex flex-col gap-6">
      
      {/* Search & Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar eventos, locais ou descrições..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Filter with their assigned colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => { sounds.playTactileClick(); setSelectedCategory('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todas as Categorias
          </button>

          {categories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { sounds.playTactileClick(); setSelectedCategory(c.id); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'ring-2 ring-white/40 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
                style={{
                  backgroundColor: isSelected ? `${c.color}35` : undefined,
                  borderColor: isSelected ? c.color : undefined
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Export & Create Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportICS}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
            title="Exportar agenda como arquivo iCalendar (.ics)"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Exportar .ICS</span>
          </button>

          <button
            onClick={() => { sounds.playTactileClick(); onOpenCreateEvent(); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Filter summary if active */}
      {(searchQuery || selectedCategory !== 'all') && (
        <div className="text-xs text-slate-400 flex items-center justify-between px-2">
          <span>
            Mostrando <strong>{filteredEvents.length}</strong> eventos{' '}
            {searchQuery && <>para "<strong>{searchQuery}</strong>" </>}
            {selectedCategory !== 'all' && (
              <>
                na categoria{' '}
                <strong className="capitalize">
                  {categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                </strong>
              </>
            )}
          </span>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-blue-400 hover:underline text-[11px]"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Events Sections */}
      {filteredEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800">
          <Calendar className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-300">Nenhum evento encontrado</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Nenhum compromisso corresponde aos critérios de pesquisa ou categoria selecionada.
          </p>
          <button
            onClick={() => onOpenCreateEvent()}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs shadow-md shadow-blue-600/30"
          >
            Criar Novo Evento
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Today */}
          {todayEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hoje</h3>
                <span className="text-xs text-slate-400 font-mono">({todayEvents.length})</span>
              </div>
              <div className="flex flex-col gap-2.5">{todayEvents.map(renderEventCard)}</div>
            </div>
          )}

          {/* Tomorrow */}
          {tomorrowEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Amanhã</h3>
                <span className="text-xs text-slate-400 font-mono">({tomorrowEvents.length})</span>
              </div>
              <div className="flex flex-col gap-2.5">{tomorrowEvents.map(renderEventCard)}</div>
            </div>
          )}

          {/* Next 7 days */}
          {next7DaysEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Próximos 7 Dias
                </h3>
                <span className="text-xs text-slate-400 font-mono">({next7DaysEvents.length})</span>
              </div>
              <div className="flex flex-col gap-2.5">{next7DaysEvents.map(renderEventCard)}</div>
            </div>
          )}

          {/* Later */}
          {laterEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Mais Adiante
                </h3>
                <span className="text-xs text-slate-500 font-mono">({laterEvents.length})</span>
              </div>
              <div className="flex flex-col gap-2.5">{laterEvents.map(renderEventCard)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
