import { test, expect } from 'bun:test'
import { calendarWindow, calendarBusy, calendarInventory } from '../src/domain/calendar'

test('date-only windows use Jakarta midnight and reject impossible or oversized ranges', () => {
  expect(calendarWindow('2026-11-18', '2026-11-19')).toEqual({ timeMin: '2026-11-18T00:00:00+07:00', timeMax: '2026-11-19T00:00:00+07:00' })
  for (const [start, end] of [['2026-02-30', '2026-03-02'], ['2026-11-18', '2026-11-18'], ['2026-11-19', '2026-11-18'], ['2026-01-01', '2026-02-02'], ['2026-1-01', '2026-01-02']]) expect(() => calendarWindow(start, end)).toThrow('invalid_input')
})

test('busy ranges normalize offsets, clip and merge overlaps without leaking event details', () => {
  const window = calendarWindow('2026-11-18', '2026-11-19')
  const result = { ...window, calendars: { selected: { busy: [{ start: '2026-11-18T10:00:00+07:00', end: '2026-11-18T12:00:00+07:00' }, { start: '2026-11-18T02:00:00Z', end: '2026-11-18T04:00:00Z' }] } } }
  expect(calendarBusy(result, 'selected', window)).toEqual([{ start: '2026-11-18T02:00:00.000Z', end: '2026-11-18T05:00:00.000Z' }])
  expect(calendarBusy({ ...window, calendars: { selected: { busy: [] } } }, 'selected', window)).toEqual([])
  expect(() => calendarBusy({ ...window, calendars: { selected: { busy: [], errors: [{ reason: 'notFound' }] } } }, 'selected', window)).toThrow('calendar_unavailable')
  expect(() => calendarBusy({ ...window, calendars: {} }, 'selected', window)).toThrow('provider_error')
  expect(() => calendarBusy({ ...window, calendars: { selected: { busy: [{ start: '2026-11-18', end: '2026-11-19' }] } } }, 'selected', window)).toThrow('provider_error')
})

test('inventory rejects partial pages and preserves normalized UI entries', () => {
  const items = [{ id: 'selected', summary: 'Study', accessRole: 'owner', timeZone: 'Asia/Jakarta' }]
  const calendars = calendarInventory({ items })
  expect(calendars[0].name).toBe('Study')
  expect(calendarInventory({ items: calendars }, true)).toEqual(calendars)
  expect(() => calendarInventory({ items, nextPageToken: 'more' })).toThrow('source_too_large')
})
