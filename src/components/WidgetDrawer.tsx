import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Clock,
  Video,
  CheckCircle2,
  Calendar,
  Sparkles,
  Sliders,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface WidgetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  isFloatingWidgetActive: boolean;
  setIsFloatingWidgetActive: (active: boolean) => void;
  widgetTransparency: number;
  setWidgetTransparency: (val: number) => void;
}

export const WidgetDrawer: React.FC<WidgetDrawerProps> = ({
  isOpen,
  onClose,
  events,
  isFloatingWidgetActive,
  setIsFloatingWidgetActive,
  widgetTransparency,
  setWidgetTransparency
}) => {
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [platformPreview, setPlatformPreview] = useState<'android' | 'desktop'>('android');

  if (!isOpen) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  // Next upcoming event
  const upcomingEvents = events
    .filter((e) => new Date(e.end).getTime() > Date.now())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const nextEvent = upcomingEvents[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Widgets Intuitivos para Tela Inicial
              </h3>
              <p className="text-xs text-slate-400">
                Suporte nativo para Android, Tablet e Desktop com transparência personalizável
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          
          {/* Controls: Size & Device & Opacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs">
            {/* Size */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Formato do Widget</label>
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700">
                <button
                  onClick={() => { sounds.playTactileClick(); setWidgetSize('small'); }}
                  className={`flex-1 py-1 rounded-lg transition ${
                    widgetSize === 'small' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  2x2
                </button>
                <button
                  onClick={() => { sounds.playTactileClick(); setWidgetSize('medium'); }}
                  className={`flex-1 py-1 rounded-lg transition ${
                    widgetSize === 'medium' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  4x2
                </button>
                <button
                  onClick={() => { sounds.playTactileClick(); setWidgetSize('large'); }}
                  className={`flex-1 py-1 rounded-lg transition ${
                    widgetSize === 'large' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  4x4
                </button>
              </div>
            </div>

            {/* Device Frame */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Pré-visualização</label>
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700">
                <button
                  onClick={() => { sounds.playTactileClick(); setPlatformPreview('android'); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg transition ${
                    platformPreview === 'android' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> Android
                </button>
                <button
                  onClick={() => { sounds.playTactileClick(); setPlatformPreview('desktop'); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg transition ${
                    platformPreview === 'desktop' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Monitor className="w-3 h-3" /> Desktop
                </button>
              </div>
            </div>

            {/* Transparency Slider */}
            <div>
              <div className="flex items-center justify-between text-slate-400 font-semibold mb-1">
                <span>Transparência Vidro</span>
                <span className="font-mono text-blue-400">{widgetTransparency}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                value={widgetTransparency}
                onChange={(e) => setWidgetTransparency(Number(e.target.value))}
                className="w-full accent-blue-500 mt-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Interactive Live Widget Preview Display */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden min-h-[220px]">
            {/* Background simulated homescreen wallpaper */}
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black" />
            <div className="absolute top-2 left-3 text-[10px] text-slate-500 font-mono">
              Homescreen Preview ({platformPreview})
            </div>

            {/* The Widget Itself with Dynamic Glass Transparency */}
            <div
              style={{
                backgroundColor: `rgba(15, 23, 42, ${widgetTransparency / 100})`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
              }}
              className={`rounded-3xl border border-white/15 p-4 shadow-2xl relative z-10 transition-all ${
                widgetSize === 'small'
                  ? 'w-44 h-44 flex flex-col justify-between'
                  : widgetSize === 'medium'
                  ? 'w-full max-w-sm flex flex-col gap-2.5'
                  : 'w-full max-w-md flex flex-col gap-3'
              }`}
            >
              {/* Widget Header Strip */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Calendar className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">CHRONOS</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>{timeStr}</span>
                </div>
              </div>

              {/* Small format content */}
              {widgetSize === 'small' && (
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">{dateStr}</div>
                  {nextEvent ? (
                    <div className="mt-1">
                      <div className="text-xs font-bold text-white line-clamp-1">{nextEvent.title}</div>
                      <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                        {new Date(nextEvent.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1 italic">Agenda livre hoje</div>
                  )}
                </div>
              )}

              {/* Medium format content */}
              {widgetSize === 'medium' && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Próximo no Horizonte 24h
                  </div>
                  {nextEvent ? (
                    <div className="mt-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{nextEvent.title}</div>
                        <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                          {new Date(nextEvent.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(nextEvent.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {nextEvent.hangoutLink && (
                        <div className="px-2 py-1 rounded-lg bg-emerald-600 text-[10px] font-bold text-white flex items-center gap-1">
                          <Video className="w-2.5 h-2.5" /> Meet
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-slate-400 italic">Nenhum evento agendado</div>
                  )}
                </div>
              )}

              {/* Large format content (Multiple upcoming events) */}
              {widgetSize === 'large' && (
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase">
                    Agenda do Dia ({upcomingEvents.slice(0, 3).length} eventos)
                  </div>
                  {upcomingEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="p-2 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-bold text-white truncate block">{ev.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {ev.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer status */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Google Sync Ativo
                </span>
                <span className="font-mono">{dateStr}</span>
              </div>
            </div>
          </div>

          {/* Floating Mini-Widget Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                Modo Mini-Widget Flutuante (Picture-in-Picture)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fixa um widget compacto e translúcido no canto da sua tela enquanto você navega.
              </p>
            </div>
            <button
              onClick={() => {
                sounds.playTactileClick();
                setIsFloatingWidgetActive(!isFloatingWidgetActive);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                isFloatingWidgetActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isFloatingWidgetActive ? 'Ativado' : 'Ativar'}
            </button>
          </div>

          {/* Installation Instructions */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 flex flex-col gap-2">
            <h4 className="font-bold text-white">Como fixar na sua Tela Inicial:</h4>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                1
              </span>
              <span>
                <strong>Android:</strong> Toque no menu do navegador (três pontos) &gt; selecione <em>"Adicionar à tela inicial"</em> ou <em>"Instalar aplicativo"</em>. Toque e segure o ícone para escolher o widget.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                2
              </span>
              <span>
                <strong>Desktop (Windows / Mac / Linux):</strong> Clique no botão de instalar PWA no cabeçalho ou fixe a aba como aplicativo autônomo (janela sem barra de navegador).
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
