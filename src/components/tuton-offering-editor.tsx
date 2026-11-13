import { TutonEdit } from './tuton-edit'
import { cellAt, cellValue, type Sheet } from '@/domain/sheets'
import type { TutonCourse, TutonColumn } from '@/domain/tuton'
export function TutonOfferingEditor({ offeringId, source, columns, sheet, enabled }: { offeringId: string; source: TutonCourse; columns: TutonColumn[]; sheet: Sheet; enabled: boolean }) {
  return <section aria-label="Edit aktivitas offering" className="flex flex-col gap-3">{columns.map(column => {
    const cell = cellAt(sheet, source.row, column.column)
    let value: boolean | number | null
    try { const native = cellValue(cell); if (typeof native === 'string') return null; value = native } catch { return null }
    return <div key={column.column} className="border-t pt-2"><p className="text-sm">Sesi {column.sessionNumber} · {column.activity}</p><TutonEdit offeringId={offeringId} sessionNumber={column.sessionNumber} activity={column.activity} value={value} editable={enabled && !cell?.userEnteredValue?.formulaValue} /></div>
  })}<p className="text-sm text-muted-foreground">Sesudah konfirmasi receipt, baca ulang workbook untuk memperbarui tracker. Editor tidak mengubah rencana belajar atau menyimpulkan submitted.</p></section>
}
