export interface CalendarWindow { timeMin: string; timeMax: string }
export interface BusyRange { start: string; end: string }
export interface CalendarEntry { id: string; name: string; accessRole: string; timeZone: string | null }

export function calendarWindow(start: string, end: string): CalendarWindow {
  const date = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('invalid_input')
    const parsed = Date.parse(value + 'T00:00:00Z')
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error('invalid_input')
    return parsed
  }
  const from = date(start), to = date(end)
  if (to <= from || to - from > 31 * 86400000) throw new Error('invalid_input')
  return { timeMin: start + 'T00:00:00+07:00', timeMax: end + 'T00:00:00+07:00' }
}

export function calendarInventory(result: Record<string, unknown>, normalized = false): CalendarEntry[] {
  if (result.nextPageToken) throw new Error('source_too_large')
  if (!Array.isArray(result.items) || result.items.length > 250) throw new Error('provider_error')
  const ids = new Set<string>()
  return result.items.map((value: unknown) => {
    const label = normalized ? 'name' : 'summary'
    if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' || !value.id || value.id.length > 1024 || ids.has(value.id) || !(label in value) || typeof (value as Record<string, unknown>)[label] !== 'string' || !('accessRole' in value) || !['owner', 'writer', 'reader', 'freeBusyReader'].includes(String(value.accessRole))) throw new Error('provider_error')
    ids.add(value.id)
    return { id: value.id, name: (value as Record<string, string>)[label], accessRole: String(value.accessRole), timeZone: 'timeZone' in value && typeof value.timeZone === 'string' ? value.timeZone : null }
  })
}

export function calendarBusy(result: Record<string, unknown>, calendarId: string, window: CalendarWindow): BusyRange[] {
  const from = Date.parse(window.timeMin), to = Date.parse(window.timeMax)
  if (Date.parse(String(result.timeMin)) !== from || Date.parse(String(result.timeMax)) !== to || !result.calendars || typeof result.calendars !== 'object' || !Object.hasOwn(result.calendars, calendarId)) throw new Error('provider_error')
  const entry = (result.calendars as Record<string, unknown>)[calendarId]
  if (!entry || typeof entry !== 'object') throw new Error('provider_error')
  if ('errors' in entry && (!Array.isArray(entry.errors) || entry.errors.length)) throw new Error('calendar_unavailable')
  if (!('busy' in entry) || !Array.isArray(entry.busy) || entry.busy.length > 10000) throw new Error('provider_error')
  const instant = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('provider_error')
    return Date.parse(value)
  }
  const ranges = entry.busy.map((value: unknown) => {
    if (!value || typeof value !== 'object' || !('start' in value) || !('end' in value)) throw new Error('provider_error')
    const start = instant(value.start), end = instant(value.end)
    if (end <= start) throw new Error('provider_error')
    return { start: Math.max(from, start), end: Math.min(to, end) }
  }).filter(value => value.end > value.start).sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push(range)
  }
  return merged.map(range => ({ start: new Date(range.start).toISOString(), end: new Date(range.end).toISOString() }))
}
