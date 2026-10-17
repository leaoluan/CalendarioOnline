import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  Bell,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Repeat,
  Plus,
  Palette,
  Tag
} from 'lucide-react';
import { CalendarEvent, CategoryDefinition } from '../types/calendar';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { sounds } from '../services/soundEffects';

const PRESET_COLORS = [
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#8b5cf6', label: 'Roxo' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#f97316', label: 'Laranja (Fitness)' },
  { hex: '#eab308', label: 'Âmbar / Ouro' },
  { hex: '#10b981', label: 'Verde (Pessoal)' },
  { hex: '#06b6d4', label: 'Ciano (Saúde)' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#64748b', label: 'Ardósia' }
];

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  presetStart?: string;
  onSaveEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (event: CalendarEvent) => Promise<void>;
  googleConnected: boolean;
  userId: string;
  categories: CategoryDefinition[];
  onAddCategory?: (category: CategoryDefinition) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  presetStart,
  onSaveEvent,
  onDeleteEvent,
  googleConnected,
  userId,
  categories,
  onAddCategory
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'ai'>('details');

  // Form states
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState<string>('work');
  const [color, setColor] = useState<string>('#3b82f6');
  const [location, setLocation] = useState('');
  const [hangoutLink, setHangoutLink] = useState('');
  const [description, setDescription] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([15]);
  const [syncWithGoogle, setSyncWithGoogle] = useState(true);
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  // New Category inline creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#f97316');
  const [updateCategoryColorDefault, setUpdateCategoryColorDefault] = useState(false);

  // AI Natural Language input
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Destructive / update confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'DELETE' | 'UPDATE';
    title: string;
    description: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Populate form on open
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setStart(eventToEdit.start.slice(0, 16));
      setEnd(eventToEdit.end.slice(0, 16));
      setIsAllDay(eventToEdit.isAllDay);
      setCategory(eventToEdit.category || 'work');
      setColor(eventToEdit.color || '#3b82f6');
      setLocation(eventToEdit.location || '');
      setHangoutLink(eventToEdit.hangoutLink || '');
      setDescription(eventToEdit.description || '');
      setReminderMinutes(eventToEdit.reminderMinutes || [15]);
      setSyncWithGoogle(eventToEdit.isGoogleSynced);
      setRecurring(eventToEdit.recurring || 'none');
      setActiveTab('details');
    } else {
      const now = presetStart ? new Date(presetStart) : new Date();
      // default 1 hour slot
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

      const toLocalDatetime = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      };

      const defaultCat = categories.find((c) => c.id === 'work') || categories[0] || {
        id: 'work',
        color: '#3b82f6'
      };

      setTitle('');
      setStart(toLocalDatetime(now));
      setEnd(toLocalDatetime(inOneHour));
      setIsAllDay(false);
      setCategory(defaultCat.id);
      setColor(defaultCat.color);
      setLocation('');
      setHangoutLink('');
      setDescription('');
      setReminderMinutes([15]);
      setSyncWithGoogle(googleConnected);
      setRecurring('none');
      setActiveTab('details');
    }
    setIsCreatingCategory(false);
    setConfirmDialog(null);
  }, [eventToEdit, presetStart, isOpen, googleConnected, categories]);

  if (!isOpen) return null;

  // Handle category change: update category and sync default color
  const handleCategoryChange = (catId: string) => {
    sounds.playTactileClick();
    setCategory(catId);
    const matched = categories.find((c) => c.id === catId);
    if (matched) {
      setColor(matched.color);
    }
  };

  // Handle creating a new custom category
  const handleCreateNewCategory = () => {
    if (!newCatName.trim()) return;
    sounds.playTactileClick();
    const id = newCatName.toLowerCase().trim().replace(/\s+/g, '-');
    const newCategory: CategoryDefinition = {
      id,
      name: newCatName.trim(),
      color: newCatColor,
      isDefault: false
    };

    if (onAddCategory) {
      onAddCategory(newCategory);
    }
    setCategory(id);
    setColor(newCatColor);
    setNewCatName('');
    setIsCreatingCategory(false);
    sounds.playSyncSuccess();
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiProcessing(true);
    setAiError(null);
    try {
      sounds.playTactileClick();
      const parsed = await parseNaturalLanguageEvent(aiPrompt);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.start) setStart(parsed.start.slice(0, 16));
      if (parsed.end) setEnd(parsed.end.slice(0, 16));
      if (typeof parsed.isAllDay === 'boolean') setIsAllDay(parsed.isAllDay);
      if (parsed.location) setLocation(parsed.location);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.category) {
        const catKey = parsed.category.toLowerCase();
        setCategory(catKey);
        const match = categories.find(
          (c) => c.id === catKey || c.name.toLowerCase() === catKey
        );
        if (match) setColor(match.color);
      }
      if (parsed.reminderMinutes) setReminderMinutes(parsed.reminderMinutes);
      setActiveTab('details');
      sounds.playSyncSuccess();
    } catch (err: any) {
      setAiError('Não foi possível interpretar o texto. Verifique sua conexão e tente novamente.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleGenerateMeetLink = () => {
    sounds.playTactileClick();
    const randomCode =
      Math.random().toString(36).substring(2, 5) +
      '-' +
      Math.random().toString(36).substring(2, 6) +
      '-' +
      Math.random().toString(36).substring(2, 5);
    setHangoutLink(`https://meet.google.com/${randomCode}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // If editing an existing Google-synced event, show mandatory confirmation
    if (eventToEdit && eventToEdit.isGoogleSynced && googleConnected) {
      setConfirmDialog({
        isOpen: true,
        type: 'UPDATE',
        title: `Atualizar evento no Google Calendar?`,
        description: `Deseja sincronizar as alterações feitas em "${title}" com o Google Calendar da sua conta?`
      });
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setIsSaving(true);
    try {
      const eventData: CalendarEvent = {
        id: eventToEdit ? eventToEdit.id : crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        isAllDay,
        category,
        color: color || '#3b82f6',
        location: location.trim(),
        hangoutLink: hangoutLink.trim(),
        reminderMinutes,
        isGoogleSynced: syncWithGoogle && googleConnected,
        googleEventId: eventToEdit?.googleEventId,
        recurring,
        userId
      };

      await onSaveEvent(eventData);

      // If user chose to update default color for this category
      if (updateCategoryColorDefault && onAddCategory && selectedCategoryObj) {
        onAddCategory({
          ...selectedCategoryObj,
          color
        });
      }

      sounds.playSyncSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setConfirmDialog(null);
    }
  };

  const handleDeleteClick = () => {
    if (!eventToEdit) return;
    sounds.playTactileClick();
    const isGoogle = eventToEdit.isGoogleSynced && googleConnected;
    setConfirmDialog({
      isOpen: true,
      type: 'DELETE',
      title: isGoogle ? 'Excluir evento do Google Calendar?' : 'Excluir este evento?',
      description: isGoogle
        ? `Você está prestes a excluir "${eventToEdit.title}" do Google Calendar e da sua agenda local. Esta ação não pode ser desfeita.`
        : `Deseja realmente remover o evento "${eventToEdit.title}" da sua agenda?`
    });
  };

  const executeDelete = async () => {
    if (!eventToEdit) return;
    setIsSaving(true);
    try {
      await onDeleteEvent(eventToEdit);
      sounds.playTactileClick();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setConfirmDialog(null);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Dialog */}
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full ring-2 ring-white/20 shadow-md transition-colors"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-base sm:text-lg font-bold text-white">
              {eventToEdit ? 'Editar Evento' : 'Novo Compromisso'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => { sounds.playTactileClick(); setActiveTab('details'); }}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  activeTab === 'details' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Detalhes
              </button>
              <button
                type="button"
                onClick={() => { sounds.playTactileClick(); setActiveTab('ai'); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ${
                  activeTab === 'ai' ? 'bg-purple-600 text-white font-semibold' : 'text-purple-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Criar com IA</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'ai' ? (
            /* AI Natural Language Tab */
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-100">
                    Criação Inteligente com Gemini 3.8 Flash
                  </p>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    Escreva o evento como você falaria naturalmente. O Gemini extrai automaticamente título, data, horário, categoria (Work, Personal, Fitness, etc.), local e lembretes.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Descreva o seu compromisso:
                </label>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Treino de crossfit e corrida amanhã às 07:00 com lembrete de 15 minutos (categoria Fitness)"
                  className="w-full p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {aiError}
                </div>
              )}

              <button
                type="button"
                disabled={isAiProcessing || !aiPrompt.trim()}
                onClick={handleAiGenerate}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
              >
                {isAiProcessing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Interpretando com Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Estruturar Evento Automaticamente</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Standard Details Form */
            <form id="event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treino de Alta Intensidade / Sprint Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category & Color System Module */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/70 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    Categoria do Evento & Cor
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nova Categoria</span>
                  </button>
                </div>

                {/* Inline Category Creator */}
                {isCreatingCategory && (
                  <div className="p-3 rounded-xl bg-slate-800/90 border border-blue-500/40 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Nome da categoria (ex: Fitness, Design, Família)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Cor:</span>
                        <input
                          type="color"
                          value={newCatColor}
                          onChange={(e) => setNewCatColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Escolher cor da categoria"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsCreatingCategory(false)}
                          className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateNewCategory}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Pills Selector */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                          isSelected
                            ? 'ring-2 ring-white/30 text-white shadow-md'
                            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${cat.color}35` : undefined,
                          borderColor: isSelected ? cat.color : undefined
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Color Palette Swatches */}
                <div className="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <Palette className="w-3 h-3 text-slate-400" />
                      Cor personalizada para este evento:
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color }}>
                      {color}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((pc) => (
                      <button
                        key={pc.hex}
                        type="button"
                        onClick={() => {
                          sounds.playTactileClick();
                          setColor(pc.hex);
                        }}
                        style={{ backgroundColor: pc.hex }}
                        className={`w-6 h-6 rounded-full transition-transform active:scale-90 shadow-sm ${
                          color.toLowerCase() === pc.hex.toLowerCase()
                            ? 'ring-2 ring-white scale-110 shadow-lg'
                            : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        title={pc.label}
                      />
                    ))}

                    {/* Native Custom Color Picker */}
                    <label className="flex items-center gap-1 cursor-pointer pl-1">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0 p-0"
                        title="Escolha qualquer tom personalizado"
                      />
                      <span className="text-[10px] text-slate-400 hover:text-white">Mais tons</span>
                    </label>
                  </div>

                  {/* Option to set as default color for this category */}
                  {selectedCategoryObj && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-2 mt-1 border-t border-slate-700/40">
                      <input
                        type="checkbox"
                        checked={updateCategoryColorDefault}
                        onChange={(e) => setUpdateCategoryColorDefault(e.target.checked)}
                        className="rounded bg-slate-800 text-blue-600 focus:ring-0"
                      />
                      <span>
                        Definir <span className="font-semibold" style={{ color }}>{color}</span> como cor padrão da categoria <strong>{selectedCategoryObj.name}</strong>
                      </span>
                    </label>
                  )}
                </div>

                {/* Live Calendar Card Preview */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-9 rounded-full flex-shrink-0 transition-colors"
                      style={{ backgroundColor: color || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border transition-colors"
                          style={{
                            backgroundColor: `${color || '#3b82f6'}25`,
                            borderColor: `${color || '#3b82f6'}50`,
                            color: color || '#3b82f6'
                          }}
                        >
                          {selectedCategoryObj?.name || category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isAllDay ? 'Dia todo' : `${start ? start.split('T')[1] : '09:00'} - ${end ? end.split('T')[1] : '10:00'}`}
                        </span>
                        {location && <span className="text-[10px] text-slate-400 truncate">• {location}</span>}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                        {title.trim() || 'Pré-visualização do evento no calendário...'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider flex-shrink-0">
                    Visualização
                  </span>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Repetição
                </label>
                <select
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Não se repete</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Horário do Evento</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="rounded bg-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Dia inteiro</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Início</label>
                    <input
                      type={isAllDay ? 'date' : 'datetime-local'}
                      value={isAllDay ? start.split('T')[0] : start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Término</label>
                    <input
                      type={isAllDay ? 'date' : 'datetime-local'}
                      value={isAllDay ? end.split('T')[0] : end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Video Call */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Localização Física
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Academia BodyTech, Sala 2 ou Endereço"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Google Meet / Link
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateMeetLink}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                    >
                      + Gerar Meet
                    </button>
                  </div>
                  <div className="relative">
                    <Video className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={hangoutLink}
                      onChange={(e) => setHangoutLink(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Reminders & Google Sync Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-300">Lembrete Automático</span>
                  </div>
                  <select
                    value={reminderMinutes[0] ?? 15}
                    onChange={(e) => setReminderMinutes([Number(e.target.value)])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value={0}>No horário do evento</option>
                    <option value={5}>5 minutos antes</option>
                    <option value={15}>15 minutos antes</option>
                    <option value={30}>30 minutos antes</option>
                    <option value={60}>1 hora antes</option>
                    <option value={1440}>1 dia antes</option>
                  </select>
                </div>

                {googleConnected && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Sincronizar com Google Calendar
                    </span>
                    <input
                      type="checkbox"
                      checked={syncWithGoogle}
                      onChange={(e) => setSyncWithGoogle(e.target.checked)}
                      className="rounded bg-slate-700 text-blue-600 focus:ring-0"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Anotações / Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="Pauta da reunião, detalhes adicionais ou rotina do treino..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <div>
            {eventToEdit && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            )}
          </div>

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
              form="event-form"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{eventToEdit ? 'Salvar Alterações' : 'Criar Evento'}</span>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Mandatory User Confirmation Modal for Destructive Operations */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-5 shadow-2xl text-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{confirmDialog.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
              >
                Cancelar
              </button>
              {confirmDialog.type === 'DELETE' ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={executeDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Exclusão</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={executeSave}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
                >
                  Confirmar Atualização
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
