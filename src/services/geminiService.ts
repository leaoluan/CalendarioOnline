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

export async function analyzeScheduleWithGemini(
  events: CalendarEvent[],
  userContext?: string
): Promise<ScheduleAnalysis> {
  const res = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events, userContext })
  });

  if (!res.ok) {
    throw new Error('Falha ao conectar com o serviço de análise Gemini.');
  }

  const data = await res.json();
  return data.analysis;
}

export async function parseNaturalLanguageEvent(
  textPrompt: string,
  referenceDate?: string
): Promise<Partial<CalendarEvent>> {
  const res = await fetch('/api/gemini/parse-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textPrompt, referenceDate })
  });

  if (!res.ok) {
    throw new Error('Falha ao processar texto com o Gemini.');
  }

  const data = await res.json();
  return data.event;
}

export async function fetchDailyBriefing(events: CalendarEvent[]): Promise<string> {
  const res = await fetch('/api/gemini/daily-briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });

  if (!res.ok) {
    return 'Tenha um excelente dia! Seus compromissos das próximas 24 horas estão carregados e sincronizados.';
  }

  const data = await res.json();
  return data.briefing;
}
