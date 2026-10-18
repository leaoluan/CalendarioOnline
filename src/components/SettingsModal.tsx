import React, { useState } from 'react';
import {
  X,
  Settings,
  Moon,
  Sun,
  Sliders,
  Hand,
  RotateCw,
  Volume2,
  Shield,
  Smartphone,
  Eye,
  CheckCircle2,
  Tag,
  Plus,
  Trash2,
  Palette,
  Database
} from 'lucide-react';
import { UserProfile, UserPreferences, CategoryDefinition } from '../types/calendar';
import { sounds } from '../services/soundEffects';
import { isLocalMode, activeSupabaseUrl, resetSupabaseConfig } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSavePreferences: (prefs: UserPreferences) => void;
  onOpen2FA: () => void;
  categories: CategoryDefinition[];
  onSaveCategory: (cat: CategoryDefinition) => void;
  onDeleteCategory: (catId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSavePreferences,
  onOpen2FA,
  categories,
  onSaveCategory,
  onDeleteCategory
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#f97316');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  if (!isOpen) return null;

  const prefs = user.preferences;

  const update = (partial: Partial<UserPreferences>) => {
    sounds.playTactileClick();
    onSavePreferences({
      ...prefs,
      ...partial
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    sounds.playTactileClick();
    const id = newCatName.toLowerCase().trim().replace(/\s+/g, '-');
    onSaveCategory({
      id,
      name: newCatName.trim(),
      color: newCatColor,
      isDefault: false
    });
    setNewCatName('');
    setIsAddingCategory(false);
    sounds.playSyncSuccess();
  };

  const handleUpdateColor = (cat: CategoryDefinition, color: string) => {
    sounds.playTactileClick();
    onSaveCategory({
      ...cat,
      color
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações & Personalização</h3>
              <p className="text-xs text-slate-400">Preferências exclusivas de {user.name}</p>
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
        <div className="p-5 flex flex-col gap-5 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Theme & Night Mode */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-blue-400" />
              Tema & Modo Escuro Nativo
            </span>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {[
                { id: 'dark', label: 'Escuro' },
                { id: 'oled', label: 'OLED Puro' },
                { id: 'light', label: 'Claro' },
                { id: 'system', label: 'Sistema' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => update({ theme: t.id as any })}
                  className={`py-2 px-3 rounded-xl border text-center transition ${
                    prefs.theme === t.id
                      ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories & Colors Management System */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-400" />
                  Gerenciador de Categorias & Cores
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Defina as cores padrão para Work, Personal, Fitness e categorias personalizadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Inline Add Category Form */}
            {isAddingCategory && (
              <form onSubmit={handleCreateCategory} className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/40 flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Fitness, Projetos, Família)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Cor:</span>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="color"
                      value={cat.color}
                      onChange={(e) => handleUpdateColor(cat, e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      title="Alterar cor desta categoria"
                    />
                    <span className="font-semibold text-white truncate text-xs">
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${cat.color}25`,
                        color: cat.color
                      }}
                    >
                      {cat.color}
                    </span>
                    {!cat.isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTactileClick();
                          onDeleteCategory(cat.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                        title="Remover categoria customizada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Glassmorphic Transparency */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" />
                Transparência dos Módulos (Glassmorphism)
              </span>
              <span className="font-mono text-sky-400 font-bold">{prefs.glassOpacity}%</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ajuste a opacidade do efeito de vidro translúcido nos painéis da agenda.
            </p>
            <input
              type="range"
              min="30"
              max="95"
              value={prefs.glassOpacity}
              onChange={(e) => update({ glassOpacity: Number(e.target.value) })}
              className="w-full accent-blue-500 mt-1 cursor-pointer"
            />
          </div>

          {/* Custom Touch & Gestures */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-amber-400" />
                Gestos Personalizados (Touch / Swipe)
              </span>
              <input
                type="checkbox"
                checked={prefs.gesturesEnabled}
                onChange={(e) => update({ gesturesEnabled: e.target.checked })}
                className="rounded bg-slate-700 text-blue-600 focus:ring-0"
              />
            </div>

            {prefs.gesturesEnabled && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Deslizar para Esquerda:</span>
                  <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Avançar Mês/Semana
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Deslizar para Direita:</span>
                  <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Voltar Período
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Deslizar para Baixo:</span>
                  <span className="font-semibold text-emerald-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Sincronizar Google (Pull to Refresh)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Toque Duplo no Dia:</span>
                  <span className="font-semibold text-blue-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Novo Evento Rápido
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sync Frequency & Sound */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <RotateCw className="w-4 h-4 text-emerald-400" />
                Sincronização em Tempo Real
              </span>
              <select
                value={prefs.autoSyncInterval}
                onChange={(e) => update({ autoSyncInterval: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none"
              >
                <option value={1}>A cada 1 minuto</option>
                <option value={5}>A cada 5 minutos</option>
                <option value={15}>A cada 15 minutos</option>
                <option value={0}>Apenas manual</option>
              </select>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-purple-400" />
                Alertas Sonoros
              </span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-slate-400">Som de lembrete</span>
                <input
                  type="checkbox"
                  checked={prefs.soundAlerts}
                  onChange={(e) => update({ soundAlerts: e.target.checked })}
                  className="rounded bg-slate-700 text-blue-600 focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Security & 2FA */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Autenticação de Dois Fatores (2FA)</h4>
                <p className="text-[11px] text-slate-400">
                  {user.twoFactorEnabled ? 'Ativo com proteção TOTP' : 'Proteja seu login com autenticador'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpen2FA();
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition"
            >
              {user.twoFactorEnabled ? 'Gerenciar' : 'Ativar'}
            </button>
          </div>

          {/* Database & Supabase Connection */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white flex items-center gap-2">
                  Banco de Dados & Supabase
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isLocalMode
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {isLocalMode ? 'Modo Local / Offline' : 'Conectado ao Supabase'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isLocalMode
                    ? 'Dados salvos localmente no navegador (localStorage)'
                    : `Conexão ativa: ${activeSupabaseUrl.replace(/https?:\/\//, '').split('.')[0]}...`}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Deseja reconfigurar os dados de conexão do Supabase? A página será recarregada.')) {
                  resetSupabaseConfig();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition self-start sm:self-auto"
            >
              Reconfigurar Chaves
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs shadow-md shadow-blue-600/30"
          >
            Salvar & Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
