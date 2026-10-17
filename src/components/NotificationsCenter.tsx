import React from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Trash2,
  Shield,
  RotateCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { NotificationItem } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface NotificationsCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification
}) => {
  if (!isOpen) return null;

  const requestBrowserPermission = async () => {
    sounds.playTactileClick();
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Chronos Calendar', {
          body: 'Notificações ativadas! Você receberá alertas dos seus próximos eventos em tempo real.',
          icon: '/icon.svg'
        });
      }
    }
  };

  const testAudioChime = () => {
    sounds.playReminderChime();
  };

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'sync':
        return <RotateCw className="w-4 h-4 text-emerald-400" />;
      case 'security':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'system':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Central de Notificações</h3>
              <p className="text-[11px] text-slate-400">Alertas e lembretes em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-800/40 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={testAudioChime}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition"
              title="Testar sinal sonoro de lembrete"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Testar Som</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={requestBrowserPermission}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Ativar no Navegador
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-slate-400 hover:text-white transition"
            >
              Marcar lidas
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={onClearAll}
              className="text-rose-400 hover:text-rose-300 transition"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic text-xs">
              Nenhuma notificação no momento.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  sounds.playTactileClick();
                  if (onSelectNotification) onSelectNotification(item);
                }}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                  item.read
                    ? 'bg-slate-900/40 border-slate-800 text-slate-300'
                    : 'bg-slate-800/80 border-blue-500/30 text-white shadow-md'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-700">
                  {getIconForType(item.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
