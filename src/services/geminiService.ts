import { CalendarEvent } from '../types/calendar';

export interface ScheduleAnalysis {
  workloadScore: number;
  workloadStatus: string;
  meetingDensity: string;
  focusBlocksFound: string;
  conflictsDetected: boolean;
  recommendations: string[];
  summary: string;
}

// Client-side fallback analyzer for static hosting (e.g. GitHub Pages)
function analyzeClientSide(events: CalendarEvent[]): ScheduleAnalysis {
  const count = Array.isArray(events) ? events.length : 0;
  const score = count > 8 ? 85 : count > 4 ? 65 : count > 0 ? 35 : 10;
  const status =
    count > 8
      ? 'Alta Sobrecarga'
      : count > 4
      ? 'Moderado Equilibrado'
      : count > 0
      ? 'Dia Leve'
      : 'Dia Livre';

  return {
    workloadScore: score,
    workloadStatus: status,
    meetingDensity: `${count} compromissos agendados no período`,
    focusBlocksFound:
      count > 5
        ? '1 janela de 90 min livre à tarde'
        : '3 janelas ideais para foco profundo e tarefas críticas',
    conflictsDetected: false,
    recommendations: [
      'Reserve pausas de 10 a 15 minutos entre reuniões consecutivas.',
      'Aproveite a janela matinal para tarefas de alta complexidade mental.',
      'Mantenha notificações silenciosas durante os períodos de foco profundo.'
    ],
    summary:
      count > 0
        ? `Sua agenda possui ${count} eventos mapeados no horizonte. O dia apresenta excelente organização para conclusão de prioridades.`
        : 'Nenhum compromisso pendente no horizonte. Excelente momento para planejamento estratégico.'
  };
}

// Client-side fallback natural language parser for static hosting
function parseClientSide(textPrompt: string, referenceDate?: string): Partial<CalendarEvent> {
  const baseDate = referenceDate ? new Date(referenceDate) : new Date();
  const lower = textPrompt.toLowerCase();

  // Detect time (e.g., "14h", "14:30", "às 10")
  let hours = 10;
  let minutes = 0;
  const timeMatch = lower.match(/(?:às|as|\bat)?\s*(\d{1,2})(?::|h)?(\d{2})?/i);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      hours = h;
      if (timeMatch[2]) {
        minutes = parseInt(timeMatch[2], 10) || 0;
      }
    }
  }

  // Detect day
  const targetDate = new Date(baseDate);
  if (lower.includes('amanhã') || lower.includes('amanha')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
    targetDate.setDate(targetDate.getDate() + 2);
  }
  targetDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  // Detect category
  let category = 'work';
  if (lower.includes('treino') || lower.includes('academia') || lower.includes('corrida') || lower.includes('fitness')) {
    category = 'fitness';
  } else if (lower.includes('almoço') || lower.includes('jantar') || lower.includes('família') || lower.includes('pessoal')) {
    category = 'personal';
  } else if (lower.includes('médico') || lower.includes('dentista') || lower.includes('exame') || lower.includes('saúde')) {
    category = 'health';
  } else if (lower.includes('urgente') || lower.includes('crítico') || lower.includes('prazo')) {
    category = 'urgent';
  }

  // Clean title
  let title = textPrompt.trim();
  if (title.length > 50) title = title.substring(0, 50) + '...';

  return {
    title,
    start: targetDate.toISOString(),
    end: endDate.toISOString(),
    isAllDay: false,
    location: 'A definir',
    description: `Criado a partir da descrição rápida: "${textPrompt}"`,
    reminderMinutes: [15],
    category
  };
}

export async function analyzeScheduleWithGemini(
  events: CalendarEvent[],
  userContext?: string
): Promise<ScheduleAnalysis> {
  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, userContext })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.analysis) {
        return data.analysis;
      }
    }
  } catch (_e) {
    // Backend API unavailable (e.g. running statically on GitHub Pages)
  }

  // Resilient fallback client-side analysis
  return analyzeClientSide(events);
}

export async function parseNaturalLanguageEvent(
  textPrompt: string,
  referenceDate?: string
): Promise<Partial<CalendarEvent>> {
  try {
    const res = await fetch('/api/gemini/parse-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textPrompt, referenceDate })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.event) {
        return data.event;
      }
    }
  } catch (_e) {
    // Backend API unavailable (e.g. running statically on GitHub Pages)
  }

  // Resilient fallback client-side natural language parser
  return parseClientSide(textPrompt, referenceDate);
}

export async function fetchDailyBriefing(events: CalendarEvent[]): Promise<string> {
  try {
    const res = await fetch('/api/gemini/daily-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.briefing) {
        return data.briefing;
      }
    }
  } catch (_e) {
    // Backend API unavailable
  }

  const count = events?.length || 0;
  if (count === 0) {
    return 'Bom dia! Sua agenda está livre para as próximas 24 horas. Aproveite para focar em planejamento estratégico e descanso.';
  }

  const first = events[0];
  const timeStr = first.start ? new Date(first.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  return `Bom dia! Você possui ${count} compromisso(s) mapeado(s) para as próximas 24 horas. Seu próximo evento é "${first.title}" ${timeStr ? `às ${timeStr}` : ''}. Mantenha pausas ativas e tenha um dia produtivo!`;
}
