import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  X,
  Plus,
  Maximize2,
  Minimize2,
  CheckCircle2
} from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface FloatingMiniWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onOpenCreateEvent: () => void;
  onOpenEvent: (e: CalendarEvent) => void;
  transparency: number;
}

export const FloatingMiniWidget: React.FC<FloatingMiniWidgetProps> = ({
  isOpen,
  onClose,
  events,
  onOpenCreateEvent,
  onOpenEvent,
  transparency
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
      setDateStr(
        now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Next upcoming event
  const upcomingEvents = events
    .filter((e) => new Date(e.end).getTime() > Date.now())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const nextEvent = upcomingEvents[0];

  return (
    <div
      style={{
        backgroundColor: `rgba(15, 23, 42, ${Math.max(transparency / 100, 0.4)})`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
      className="fixed bottom-4 right-4 z-40 w-72 sm:w-80 rounded-3xl border border-white/20 shadow-2xl p-4 text-slate-200 transition-all duration-200 animate-in slide-in-from-bottom-5"
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Calendar className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-white tracking-wider">CHRONOS WIDGET</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="Fechar Widget"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clock & Date Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>{timeStr}</span>
        </div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase capitalize">{dateStr}</div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col gap-2 mt-2">
          {nextEvent ? (
            <div
              onClick={() => {
                sounds.playTactileClick();
                onOpenEvent(nextEvent);
              }}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition shadow-sm"
              style={{ borderLeft: `4px solid ${nextEvent.color || '#3b82f6'}` }}
            >
              <div className="flex items-center justify-between text-[10px] text-blue-300 font-bold uppercase">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                  style={{
                    backgroundColor: `${nextEvent.color || '#3b82f6'}30`,
                    color: nextEvent.color || '#93c5fd'
                  }}
                >
                  {nextEvent.category || 'Geral'}
                </span>
                <span className="font-mono text-slate-300">
                  {new Date(nextEvent.start).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <h5 className="text-xs font-bold text-white mt-1 line-clamp-1">{nextEvent.title}</h5>
              {nextEvent.location && (
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{nextEvent.location}</p>
              )}

              {nextEvent.hangoutLink && (
                <a
                  href={nextEvent.hangoutLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                >
                  <Video className="w-3 h-3" />
                  <span>Entrar no Google Meet</span>
                </a>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-white/5 text-center text-xs text-slate-400 italic">
              Nenhum evento nas próximas horas.
            </div>
          )}

          {/* Quick Add Action */}
          <button
            onClick={() => {
              sounds.playTactileClick();
              onOpenCreateEvent();
            }}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Evento Rápido</span>
          </button>
        </div>
      )}
    </div>
  );
};
