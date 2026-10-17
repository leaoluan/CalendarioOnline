import React, { useState } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sounds } from '../services/soundEffects';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !isIOS) return null;

  const handleInstall = async () => {
    sounds.playTactileClick();
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-2xl bg-slate-900/95 border border-blue-500/40 p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Instalar Chronos no Aparelho</h5>
            <p className="text-[10px] text-slate-400">Suporte offline nativo e widgets de tela</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-200">
            <h4 className="text-sm font-bold text-white">Instalar no iPhone / iPad</h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 mt-3">
              <li>Toque no botão <strong>Compartilhar</strong> (ícone com seta para cima no Safari).</li>
              <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
