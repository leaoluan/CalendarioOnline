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
  Plus
} from 'lucide-react';
import { CalendarEvent, CategoryDefinition } from '../types/calendar';
import { exportToICS } from '../services/googleCalendar';
import { sounds } from '../services/soundEffects';

interface AgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenCreateEvent: (presetStart?: string) => void;
  categories: CategoryDefinition[];
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onSelectEvent,
  onOpenCreateEvent,
  categories
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().split('T')[0];

  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  // Filter events
  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group events
  const todayEvents = filteredEvents.filter((e) => e.start.split('T')[0] === todayIso);
  const tomorrowEvents = filteredEvents.filter((e) => e.start.split('T')[0] === tomorrowIso);
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
    const catObj = categories.find((c) => c.id === e.category);
    const categoryName = catObj ? catObj.name : e.category;
    const eventColor = e.color || catObj?.color || '#3b82f6';

    return (
      <div
        key={e.id}
        onClick={() => {
          sounds.playTactileClick();
          onSelectEvent(e);
        }}
        className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl shadow-lg transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-2.5 sm:w-3 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: eventColor }}
          />
          <div>
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

            <h4 className="text-base font-bold text-white mt-1.5">{e.title}</h4>
            {e.description && (
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{e.description}</p>
            )}

            {e.location && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{e.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
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
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              sounds.playTactileClick();
              setSelectedCategory('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                sounds.playTactileClick();
                setSelectedCategory(c.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'text-white font-semibold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
              }`}
              style={{
                backgroundColor: selectedCategory === c.id ? `${c.color}35` : undefined,
                borderColor: selectedCategory === c.id ? c.color : undefined
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Export iCal .ics */}
        <button
          onClick={handleExportICS}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          title="Exportar calendário em formato padrão iCalendar (.ics)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar .ICS</span>
        </button>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-6">
        
        {/* Hoje */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Hoje</h3>
            <span className="text-xs text-slate-400">({todayEvents.length})</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {todayEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2">Nenhum evento agendado para hoje.</p>
            ) : (
              todayEvents.map(renderEventCard)
            )}
          </div>
        </div>

        {/* Amanhã */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Amanhã</h3>
            <span className="text-xs text-slate-400">({tomorrowEvents.length})</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {tomorrowEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2">Nenhum evento para amanhã.</p>
            ) : (
              tomorrowEvents.map(renderEventCard)
            )}
          </div>
        </div>

        {/* Próximos 7 Dias */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Próximos 7 Dias
            </h3>
            <span className="text-xs text-slate-400">({next7DaysEvents.length})</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {next7DaysEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2">Nenhum evento no período.</p>
            ) : (
              next7DaysEvents.map(renderEventCard)
            )}
          </div>
        </div>

        {/* Mais Adiante */}
        {laterEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Mais Adiante
              </h3>
              <span className="text-xs text-slate-400">({laterEvents.length})</span>
            </div>
            <div className="flex flex-col gap-2.5">{laterEvents.map(renderEventCard)}</div>
          </div>
        )}

      </div>

    </div>
  );
};
