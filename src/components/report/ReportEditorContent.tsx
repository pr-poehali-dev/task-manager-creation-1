import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { ReportRow, COLUMNS, COLUMN_SHORT } from "./ReportTypes";

// ─── Form card for a single row ───────────────────────────────────────────────
function RowFormCard({
  row,
  index,
  onUpdate,
  onRemove,
}: {
  row: ReportRow;
  index: number;
  onUpdate: (id: number, field: keyof ReportRow, value: string) => void;
  onRemove: (id: number) => void;
}) {
  const textareaFields: (keyof ReportRow)[] = ["serviceName", "operation", "comment"];

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
        <span className="text-xs font-semibold text-muted-foreground">Запись #{index + 1}</span>
        <button
          onClick={() => onRemove(row.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Удалить запись"
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLUMNS.map((col) => {
          const key = col.key as keyof ReportRow;
          const isTextarea = textareaFields.includes(key);
          return (
            <div key={col.key} className={col.wide ? "md:col-span-2" : ""}>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1 leading-snug">
                {COLUMN_SHORT[col.key]}
              </label>
              {isTextarea ? (
                <Textarea
                  value={row[key]}
                  onChange={(e) => onUpdate(row.id, key, e.target.value)}
                  className="text-sm resize-none min-h-[72px]"
                  placeholder={COLUMN_SHORT[col.key] + "..."}
                />
              ) : (
                <Input
                  value={row[key]}
                  onChange={(e) => onUpdate(row.id, key, e.target.value)}
                  className="text-sm h-9"
                  placeholder={COLUMN_SHORT[col.key] + "..."}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ReportEditorContentProps {
  rows: ReportRow[];
  department: string;
  month: string;
  employeeName: string;
  currentId: number | null;
  reportName: string;
  viewMode: "table" | "form";
  loading: boolean;
  onUpdateCell: (id: number, field: keyof ReportRow, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: number) => void;
}

export default function ReportEditorContent({
  rows,
  department,
  month,
  employeeName,
  currentId,
  reportName,
  viewMode,
  loading,
  onUpdateCell,
  onAddRow,
  onRemoveRow,
}: ReportEditorContentProps) {
  return (
    <>
      {/* Employee badge */}
      {employeeName && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 w-fit">
          <Icon name="User" size={13} className="text-primary" />
          <span className="text-xs font-medium text-primary">{employeeName}</span>
          {currentId && (
            <span className="text-[10px] text-muted-foreground ml-1">— {reportName}</span>
          )}
        </div>
      )}

      {/* ── TABLE MODE ─────────────────────────────────────────────────────── */}
      {viewMode === "table" && (
        <div className="rounded-lg border bg-card text-sm">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              Отчет к плану выполнения работ {department} за {month}
              {employeeName && ` — ${employeeName}`}
            </p>
            {loading && <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground shrink-0 ml-2" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/40">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="border border-border px-2 py-2 text-[11px] font-semibold text-center align-middle leading-tight text-muted-foreground"
                      style={{ minWidth: col.wide ? 200 : 110 }}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="border border-border px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                    <>
                      <td className="border border-border p-1 align-top">
                        <Textarea value={row.serviceName} onChange={(e) => onUpdateCell(row.id, "serviceName", e.target.value)} className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full" placeholder="Наименование..." />
                      </td>
                      <td className="border border-border p-1 align-top">
                        <Textarea value={row.operation} onChange={(e) => onUpdateCell(row.id, "operation", e.target.value)} className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full" placeholder="Операция..." />
                      </td>
                      <td className="border border-border p-1 align-top">
                        <Input value={row.group} onChange={(e) => onUpdateCell(row.id, "group", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Группа..." />
                      </td>
                      <td className="border border-border p-1 align-top">
                        <Input value={row.executor} onChange={(e) => onUpdateCell(row.id, "executor", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Исполнитель..." />
                      </td>
                      <td className="border border-border p-1 align-top">
                        <Input value={row.unit} onChange={(e) => onUpdateCell(row.id, "unit", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ед. изм..." />
                      </td>
                      <td className="border border-border p-1 align-top">
                        <Input value={row.result} onChange={(e) => onUpdateCell(row.id, "result", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Результат..." />
                      </td>
                      <td className="border border-border p-1 align-top">
                        <Textarea value={row.comment} onChange={(e) => onUpdateCell(row.id, "comment", e.target.value)} className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full" placeholder="Комментарий..." />
                      </td>
                    </>
                    <td className="border border-border p-1 align-middle text-center">
                      <button onClick={() => onRemoveRow(row.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                        <Icon name="X" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t">
            <Button variant="ghost" size="sm" onClick={onAddRow} className="gap-1.5 text-xs h-7">
              <Icon name="Plus" size={13} />
              Добавить строку
            </Button>
          </div>
        </div>
      )}

      {/* ── FORM / CARDS MODE ──────────────────────────────────────────────── */}
      {viewMode === "form" && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/20 px-4 py-2.5 flex items-center gap-2">
            {loading && <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground" />}
            <p className="text-[11px] text-muted-foreground">
              Отчет к плану выполнения работ <strong>{department}</strong> за <strong>{month}</strong>
              {employeeName && <> — <strong>{employeeName}</strong></>}
            </p>
          </div>

          {rows.map((row, index) => (
            <RowFormCard
              key={row.id}
              row={row}
              index={index}
              onUpdate={onUpdateCell}
              onRemove={onRemoveRow}
            />
          ))}

          <Button variant="outline" size="sm" onClick={onAddRow} className="gap-1.5 text-xs w-full border-dashed">
            <Icon name="Plus" size={13} />
            Добавить запись
          </Button>
        </div>
      )}
    </>
  );
}
