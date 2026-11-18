import { TutonEdit } from './tuton-edit'
import { cellAt, cellValue, type Sheet } from '@/domain/sheets'
import type { TutonCourse, TutonColumn } from '@/domain/tuton'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
export function TutonOfferingEditor({ offeringId, source, columns, sheet, enabled }: { offeringId: string; source: TutonCourse; columns: TutonColumn[]; sheet: Sheet; enabled: boolean }) {
  const sessions = [...new Set(columns.map(column => column.sessionNumber))]
  return <section aria-label={`Aktivitas ${source.name}`} className="mt-3 flex flex-col gap-3">
    {sessions.map(session => <Collapsible key={session} className="border-t pt-2">
      <CollapsibleTrigger render={<Button variant="ghost" className="min-h-11 w-full justify-start whitespace-normal text-left" />}>Sesi {session} · {columns.find(column => column.sessionNumber === session)?.dateLabel}</CollapsibleTrigger><CollapsibleContent keepMounted>
        <div className="grid min-w-0 gap-4 py-3 lg:grid-cols-2">{columns.filter(column => column.sessionNumber === session).map(column => {
          const cell = cellAt(sheet, source.row, column.column)
          let value: boolean | number | null
          try { const native = cellValue(cell); if (typeof native === 'string') return <p key={column.column} className="text-sm">{column.activity}: {native}</p>; value = native } catch { return <p key={column.column} role="status" className="text-sm">{column.activity}: nilai sumber tidak dapat dibaca.</p> }
          return <div key={column.column} className="min-w-0 rounded-md border p-3"><p className="mb-2 text-sm font-medium">{column.activity} · {value === null ? 'Belum ada nilai' : typeof value === 'boolean' ? value ? 'Tercentang' : 'Belum dicentang' : value}</p><TutonEdit offeringId={offeringId} sessionNumber={column.sessionNumber} activity={column.activity} value={value} editable={enabled && !cell?.userEnteredValue?.formulaValue} /></div>
        })}</div>
      </CollapsibleContent></Collapsible>)}
    <p className="text-sm text-muted-foreground">Sesudah konfirmasi receipt, baca ulang workbook untuk memperbarui tracker. Checkbox bukan bukti pengumpulan tugas.</p>
  </section>
}
