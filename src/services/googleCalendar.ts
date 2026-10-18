import { CalendarEvent, OfflineMutation } from '../types/calendar';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const OFFLINE_QUEUE_KEY = 'chronos_offline_mutations';

// Format event to Google Calendar API Resource
export function toGoogleEventResource(event: CalendarEvent) {
  const resource: any = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
  };

  if (event.isAllDay) {
    resource.start = { date: event.start.split('T')[0] };
    resource.end = { date: event.end.split('T')[0] };
  } else {
    resource.start = { dateTime: new Date(event.start).toISOString() };
    resource.end = { dateTime: new Date(event.end).toISOString() };
  }

  if (event.hangoutLink) {
    resource.conferenceData = {
      entryPoints: [{ entryPointType: 'video', uri: event.hangoutLink }]
    };
  }

  // Reminders
  if (event.reminderMinutes && event.reminderMinutes.length > 0) {
    resource.reminders = {
      useDefault: false,
      overrides: event.reminderMinutes.map((m) => ({ method: 'popup', minutes: m }))
    };
  }

  return resource;
}

// Convert Google Calendar API event to local CalendarEvent
export function fromGoogleEvent(gEvent: any): CalendarEvent {
  const isAllDay = !!gEvent.start?.date;
  const start = gEvent.start?.dateTime || (gEvent.start?.date ? `${gEvent.start.date}T00:00:00.000Z` : new Date().toISOString());
  const end = gEvent.end?.dateTime || (gEvent.end?.date ? `${gEvent.end.date}T23:59:59.999Z` : new Date().toISOString());

  // Determine category based on summary or attendees
  let category: string = 'meeting';
  const lowerSummary = (gEvent.summary || '').toLowerCase();
  if (lowerSummary.includes('treino') || lowerSummary.includes('academia') || lowerSummary.includes('fitness') || lowerSummary.includes('gym') || lowerSummary.includes('workout') || lowerSummary.includes('corrida')) {
    category = 'fitness';
  } else if (lowerSummary.includes('saúde') || lowerSummary.includes('médic') || lowerSummary.includes('dentista') || lowerSummary.includes('consulta')) {
    category = 'health';
  } else if (lowerSummary.includes('urgente') || lowerSummary.includes('deadline') || lowerSummary.includes('prazo')) {
    category = 'urgent';
  } else if (lowerSummary.includes('trabalho') || lowerSummary.includes('projeto') || lowerSummary.includes('alinhamento') || lowerSummary.includes('sprint') || lowerSummary.includes('work')) {
    category = 'work';
  } else if (lowerSummary.includes('aniversário') || lowerSummary.includes('jantar') || lowerSummary.includes('família') || lowerSummary.includes('pessoal') || lowerSummary.includes('personal')) {
    category = 'personal';
  } else if (lowerSummary.includes('estudo') || lowerSummary.includes('aula') || lowerSummary.includes('curso') || lowerSummary.includes('study')) {
    category = 'study';
  }

  // Color mapping
  const categoryColors: Record<string, string> = {
    work: '#3b82f6',
    personal: '#10b981',
    fitness: '#f97316',
    meeting: '#8b5cf6',
    health: '#06b6d4',
    urgent: '#ef4444',
    study: '#ec4899',
    finance: '#eab308'
  };

  const reminders: number[] = [];
  if (gEvent.reminders?.overrides) {
    for (const ov of gEvent.reminders.overrides) {
      if (typeof ov.minutes === 'number') reminders.push(ov.minutes);
    }
  }
  if (reminders.length === 0) reminders.push(15);

  return {
    id: `gcal-${gEvent.id}`,
    title: gEvent.summary || '(Sem título)',
    description: gEvent.description || '',
    start,
    end,
    isAllDay,
    location: gEvent.location || '',
    hangoutLink: gEvent.hangoutLink || gEvent.conferenceData?.entryPoints?.[0]?.uri,
    category,
    color: categoryColors[category],
    reminderMinutes: reminders,
    isGoogleSynced: true,
    googleEventId: gEvent.id,
    syncStatus: 'synced'
  };
}

// Fetch events from Google Calendar
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const min = timeMin || new Date(Date.now() - 30 * 86400000).toISOString();
  const max = timeMax || new Date(Date.now() + 60 * 86400000).toISOString();

  const url = `${CALENDAR_API_BASE}?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
    min
  )}&timeMax=${encodeURIComponent(max)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const items = (data.items || []).filter((item: any) => item.status !== 'cancelled');
  return items.map(fromGoogleEvent);
}

// Insert an event into Google Calendar
export async function insertGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const resource = toGoogleEventResource(event);

  const response = await fetch(CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resource)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro ao criar evento no Google Calendar: ${err}`);
  }

  const data = await response.json();
  return fromGoogleEvent(data);
}

// Patch/Update an event in Google Calendar
export async function updateGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const resource = toGoogleEventResource(event);

  const response = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resource)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro ao atualizar evento no Google Calendar: ${err}`);
  }

  const data = await response.json();
  return fromGoogleEvent(data);
}

// Delete an event from Google Calendar
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  const response = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Erro ao excluir evento do Google Calendar: ${err}`);
  }
}

// --- Offline Queue Handling ---

export function getOfflineMutations(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineMutation(mutation: OfflineMutation) {
  try {
    const list = getOfflineMutations();
    list.push(mutation);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Falha ao enfileirar mutação offline:', err);
  }
}

export function clearOfflineMutations() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function processOfflineQueue(
  accessToken: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const queue = getOfflineMutations();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: OfflineMutation[] = [];

  for (let i = 0; i < queue.length; i++) {
    const mut = queue[i];
    try {
      if (mut.type === 'CREATE') {
        await insertGoogleCalendarEvent(accessToken, mut.event);
      } else if (mut.type === 'UPDATE' && mut.event.googleEventId) {
        await updateGoogleCalendarEvent(accessToken, mut.event.googleEventId, mut.event);
      } else if (mut.type === 'DELETE' && mut.event.googleEventId) {
        await deleteGoogleCalendarEvent(accessToken, mut.event.googleEventId);
      }
      success++;
    } catch (err) {
      console.warn('Erro ao processar item da fila offline:', err);
      failed++;
      remaining.push(mut);
    }
    if (onProgress) onProgress(i + 1, queue.length);
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return { success, failed };
}

// Export events to iCalendar (.ics) standard
export function exportToICS(events: CalendarEvent[]): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatICSDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chronos Calendar//AI Studio Build//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach((e) => {
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${e.id}@chronos.app`);
    ics.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);
    ics.push(`DTSTART:${formatICSDate(e.start)}`);
    ics.push(`DTEND:${formatICSDate(e.end)}`);
    ics.push(`SUMMARY:${e.title.replace(/\n/g, ' ')}`);
    if (e.description) ics.push(`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`);
    if (e.location) ics.push(`LOCATION:${e.location.replace(/\n/g, ' ')}`);
    ics.push('STATUS:CONFIRMED');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}
