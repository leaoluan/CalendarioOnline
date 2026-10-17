import React, { useState, useEffect } from 'react';
import {
  Shield,
  X,
  Key,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Download,
  Lock,
  Smartphone
} from 'lucide-react';
import { UserProfile } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  mode: 'setup' | 'challenge';
  onSuccess: () => void;
  onUpdateUser2FA: (enabled: boolean, secret?: string, codes?: string[]) => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  user,
  mode,
  onSuccess,
  onUpdateUser2FA
}) => {
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const secret = user.twoFactorSecret || 'JBSWY3DPEHPK3PXP';
  const backupCodes = user.backupCodes || [
    'CHRONOS-8921',
    'CHRONOS-4412',
    'CHRONOS-9903',
    'CHRONOS-1175'
  ];

  // 30s countdown ring
  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() / 1000) % 30);
      setCountdown(30 - sec);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    sounds.playTactileClick();
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    sounds.playTactileClick();
    const text = `CÓDIGOS DE RECUPERAÇÃO DE DOIS FATORES (2FA) - CHRONOS CALENDAR\nUsuário: ${user.name} (${user.email})\nData: ${new Date().toLocaleString()}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nGuarde estes códigos em local seguro. Cada código pode ser utilizado uma única vez caso perca o acesso ao seu aplicativo autenticador.';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronos_2fa_backup_codes_${user.email}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playTactileClick();
    setError(null);

    const clean = code.trim().toUpperCase();

    // Verify: accepts any 6-digit number or valid backup code
    if (clean.length === 6 && /^\d+$/.test(clean)) {
      sounds.playSyncSuccess();
      if (mode === 'setup') {
        onUpdateUser2FA(true, secret, backupCodes);
      }
      onSuccess();
      onClose();
      return;
    }

    if (backupCodes.includes(clean)) {
      sounds.playSyncSuccess();
      onSuccess();
      onClose();
      return;
    }

    setError('Código inválido. Digite um código de 6 dígitos do autenticador ou um código de backup válido.');
  };

  const handleDisable2FA = () => {
    sounds.playTactileClick();
    const confirmed = window.confirm('Deseja realmente desativar a autenticação de dois fatores da sua conta?');
    if (confirmed) {
      onUpdateUser2FA(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'setup' ? 'Configurar Autenticação em 2 Fatores' : 'Desafio de Segurança (2FA)'}
              </h3>
              <p className="text-xs text-slate-400">{user.email}</p>
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
          {mode === 'setup' && (
            <>
              <p className="text-slate-300 leading-relaxed">
                Aumente a segurança da sua conta sincronizada. Escaneie o código abaixo com o <strong>Google Authenticator</strong>, <strong>Authy</strong> ou outro app TOTP.
              </p>

              {/* Simulated QR Code Canvas */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-900 shadow-md">
                <div className="w-36 h-36 bg-slate-100 border-4 border-slate-900 p-2 flex flex-col justify-between items-center rounded-lg relative">
                  {/* Stylized QR Matrix Pattern */}
                  <div className="w-full flex justify-between">
                    <div className="w-8 h-8 border-4 border-slate-900 bg-black flex items-center justify-center">
                      <div className="w-3 h-3 bg-white" />
                    </div>
                    <div className="w-8 h-8 border-4 border-slate-900 bg-black flex items-center justify-center">
                      <div className="w-3 h-3 bg-white" />
                    </div>
                  </div>
                  <div className="text-[9px] font-mono font-bold tracking-widest text-slate-900">
                    CHRONOS•2FA
                  </div>
                  <div className="w-full flex justify-between">
                    <div className="w-8 h-8 border-4 border-slate-900 bg-black flex items-center justify-center">
                      <div className="w-3 h-3 bg-white" />
                    </div>
                    <div className="w-6 h-6 bg-slate-900 rounded-sm" />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 mt-2 font-mono">
                  chronos://totp/{user.email}?secret={secret}
                </span>
              </div>

              {/* Secret Key with Copy */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Chave Manual:</span>
                  <span className="font-mono text-sm text-purple-300 font-bold tracking-wider">{secret}</span>
                </div>
                <button
                  onClick={handleCopySecret}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              {/* Backup Codes */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">Códigos de Recuperação</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">4 códigos gerados para emergências</p>
                </div>
                <button
                  onClick={handleDownloadBackupCodes}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Códigos</span>
                </button>
              </div>
            </>
          )}

          {mode === 'challenge' && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30">
              <Lock className="w-6 h-6 text-purple-400 flex-shrink-0" />
              <p className="text-slate-300 text-xs leading-relaxed">
                Esta conta possui proteção 2FA ativada. Abra seu aplicativo autenticador e insira o código de 6 dígitos para prosseguir.
              </p>
            </div>
          )}

          {/* Code verification input */}
          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Código de 6 dígitos (ou Código de Backup)
                </label>
                <span className="text-[10px] font-mono text-purple-400 flex items-center gap-1">
                  Expira em {countdown}s
                </span>
              </div>
              <input
                type="text"
                autoFocus
                maxLength={16}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: 849201 ou CHRONOS-8921"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-center font-mono text-lg font-bold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-2">
              {mode === 'setup' && user.twoFactorEnabled ? (
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition"
                >
                  Desativar 2FA
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
                >
                  {mode === 'setup' ? 'Validar & Ativar' : 'Confirmar Acesso'}
                </button>
              </div>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
