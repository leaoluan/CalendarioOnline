import React, { useState } from 'react';
import {
  X,
  Download,
  RotateCw,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { SystemUpdateInfo } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface SystemUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: SystemUpdateInfo | null;
  onCheckUpdates: () => Promise<void>;
  onApplyUpdate: () => Promise<void>;
}

export const SystemUpdateModal: React.FC<SystemUpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onCheckUpdates,
  onApplyUpdate
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  if (!isOpen) return null;

  const handleCheck = async () => {
    sounds.playTactileClick();
    setIsChecking(true);
    try {
      await onCheckUpdates();
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartUpdate = async () => {
    sounds.playTactileClick();
    setIsUpdating(true);
    setUpdateProgress(15);

    const step1 = setTimeout(() => setUpdateProgress(45), 600);
    const step2 = setTimeout(() => setUpdateProgress(80), 1200);
    const step3 = setTimeout(async () => {
      setUpdateProgress(100);
      sounds.playSyncSuccess();
      await onApplyUpdate();
      setIsUpdating(false);
      onClose();
    }, 1800);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  const currentVer = updateInfo?.current || '2.5.0';
  const latestVer = updateInfo?.latest || '2.5.1';
  const hasUpdate = updateInfo?.hasUpdate ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Atualizações do Sistema (OTA)</h3>
              <p className="text-xs text-slate-400">Verificação automática contra o banco de dados</p>
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
          
          {/* Version Status Box */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Versão Instalada</span>
              <span className="font-mono text-base font-bold text-white">v{currentVer}</span>
            </div>

            <ArrowRight className="w-5 h-5 text-slate-500" />

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Última Versão no Servidor</span>
              <span className="font-mono text-base font-bold text-emerald-400">v{latestVer}</span>
            </div>

            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              title="Buscar atualizações no banco de dados agora"
            >
              <RotateCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Release Notes */}
          {hasUpdate ? (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-emerald-200">
                  Nova versão v{latestVer} pronta para instalação!
                </h4>
              </div>
              <p className="text-[11px] text-slate-300">
                Lançada em {updateInfo?.releaseDate || 'hoje'}. Principais novidades:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 mt-1 text-[11px]">
                {updateInfo?.releaseNotes?.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-200">Seu aplicativo está 100% atualizado</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Você já possui as funcionalidades mais recentes, otimizações e correções de segurança.
                </p>
              </div>
            </div>
          )}

          {/* Progress bar during update */}
          {isUpdating && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="flex justify-between text-xs font-semibold">
                <span>Aplicando atualização no pacote PWA...</span>
                <span className="font-mono text-emerald-400">{updateProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${updateProgress}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Servidor OTA Ativo</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
            >
              Fechar
            </button>
            {hasUpdate && (
              <button
                onClick={handleStartUpdate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Atualizar Agora</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
