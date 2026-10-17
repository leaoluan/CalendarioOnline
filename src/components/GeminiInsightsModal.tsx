import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RotateCw,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Lightbulb,
  Calendar
} from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { analyzeScheduleWithGemini, ScheduleAnalysis } from '../services/geminiService';
import { sounds } from '../services/soundEffects';

interface GeminiInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
}

export const GeminiInsightsModal: React.FC<GeminiInsightsModalProps> = ({
  isOpen,
  onClose,
  events
}) => {
  const [analysis, setAnalysis] = useState<ScheduleAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    sounds.playTactileClick();
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyzeScheduleWithGemini(events);
      setAnalysis(data);
      sounds.playSyncSuccess();
    } catch (err: any) {
      setError('Falha ao processar análise da agenda com o Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis) {
      runAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Análise & Otimização com IA Gemini</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Otimização preditiva de carga horária, blocos de foco e mitigação de fadiga
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

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <RotateCw className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-sm font-semibold text-white">
                O Gemini está analisando sua agenda semanal...
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                Calculando densidade de reuniões, janelas de produtividade profunda e pausas estratégicas.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center">
              <p>{error}</p>
              <button
                onClick={runAnalysis}
                className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium"
              >
                Tentar Novamente
              </button>
            </div>
          ) : analysis ? (
            <div className="flex flex-col gap-4">
              
              {/* Executive Summary */}
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block mb-1">
                  Diagnóstico Executivo
                </span>
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                  {analysis.summary}
                </p>
              </div>

              {/* Workload Score & Meeting Density */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Índice de Sobrecarga Mental
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold font-mono text-white">
                        {analysis.workloadScore}%
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                        {analysis.workloadStatus}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700 mt-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 rounded-full"
                      style={{ width: `${Math.min(analysis.workloadScore, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Janelas de Foco Profundo
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {analysis.focusBlocksFound}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {analysis.meetingDensity}
                  </p>
                </div>
              </div>

              {/* Conflict Alert (if any) */}
              {analysis.conflictsDetected && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Atenção: Há sobreposições ou reuniões consecutivas sem intervalo detectadas.</span>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Recomendações da IA para sua Rotina:
                </h4>
                <div className="flex flex-col gap-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5 text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={runAnalysis}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reavaliar Agenda</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
