import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import * as XLSX from "xlsx";
import {
  PaidService, Tag,
  fmt, calcVat, STATUS_LABELS, STATUS_COLORS,
} from "./PaidServiceTypes";
import { FileUploadButton } from "./PaidServiceForm";

interface PaidServicesListProps {
  filtered: PaidService[];
  tags: Tag[];
  searchStr: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onNew: () => void;
  onEdit: (s: PaidService) => void;
  onDelete: (id: number) => void;
  onFileUploaded: (serviceId: number, fileType: "draft" | "final", url: string) => void;
}

function exportSingle(s: PaidService) {
  const total = s.total;
  const rows: (string | number)[][] = [];
  rows.push(["Расчёт стоимости платной услуги"]);
  rows.push([]);
  rows.push(["Услуга:", s.serviceName]);
  rows.push(["Заявитель:", s.applicantName]);
  rows.push(["Дата:", s.serviceDate || "—"]);
  rows.push(["Статус:", STATUS_LABELS[s.status] || s.status]);
  rows.push([]);
  rows.push(["Параметр", "Значение"]);
  if (s.isFixedPrice) {
    rows.push(["Тип расчёта", "Фиксированная стоимость"]);
    rows.push(["Фиксированная сумма, ₽", s.fixedPrice || 0]);
  } else {
    rows.push(["Тип расчёта", "Почасовая"]);
    rows.push(["Количество часов", s.hours]);
    rows.push(["Ставка ч/час, ₽", s.hourlyRate]);
    rows.push(["Стоимость (часы × ставка), ₽", s.hours * s.hourlyRate]);
  }
  if (s.extraCosts?.length) {
    rows.push([]);
    rows.push(["Дополнительные надбавки", ""]);
    s.extraCosts.forEach(ec => rows.push([ec.label, ec.amount]));
  }
  rows.push([]);
  rows.push(["Итого без НДС, ₽", total]);
  rows.push(["НДС 22%, ₽", calcVat(total)]);
  rows.push(["ИТОГО с НДС, ₽", total + calcVat(total)]);
  if (s.notes) rows.push(["Примечания", s.notes]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 35 }, { wch: 25 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Расчёт");
  XLSX.writeFile(wb, `Расчёт_${s.serviceName.slice(0, 30)}.xlsx`);
}

function exportSummary(filtered: PaidService[]) {
  const headers = ["Дата", "Заявитель", "Наименование услуги", "Часы", "Ставка ₽/ч", "Надбавки, ₽", "Без НДС, ₽", "НДС 22%, ₽", "Итого с НДС, ₽", "Статус"];
  const rows = filtered.map(s => {
    const extra = (s.extraCosts || []).reduce((a, c) => a + Number(c.amount), 0);
    return [
      s.serviceDate || "—",
      s.applicantName,
      s.serviceName,
      s.isFixedPrice ? "—" : s.hours,
      s.isFixedPrice ? "—" : s.hourlyRate,
      extra || "—",
      s.total,
      calcVat(s.total),
      s.total + calcVat(s.total),
      STATUS_LABELS[s.status] || s.status,
    ];
  });
  const totalNoVat = filtered.reduce((a, s) => a + s.total, 0);
  const totalVat = filtered.reduce((a, s) => a + calcVat(s.total), 0);
  const totalWithVat = totalNoVat + totalVat;
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, [], ["", "", "", "", "", "ИТОГО:", totalNoVat, totalVat, totalWithVat, ""]]);
  ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Перечень услуг");
  XLSX.writeFile(wb, "Перечень_платных_услуг.xlsx");
}

export default function PaidServicesList({
  filtered,
  tags,
  searchStr,
  statusFilter,
  dateFrom,
  dateTo,
  onSearchChange,
  onStatusFilterChange,
  onDateFromChange,
  onDateToChange,
  onNew,
  onEdit,
  onDelete,
  onFileUploaded,
}: PaidServicesListProps) {
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchStr} onChange={e => onSearchChange(e.target.value)} placeholder="Поиск по услуге или заявителю..." className="pl-8 h-8 text-sm w-56" />
          </div>
          <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="h-8 text-sm w-36" title="Дата с" />
          <Input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="h-8 text-sm w-36" title="Дата по" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => exportSummary(filtered)} className="gap-1.5 h-8">
            <Icon name="Download" size={13} /> Перечень Excel
          </Button>
          <Button size="sm" onClick={onNew} className="gap-1.5 h-8">
            <Icon name="Plus" size={13} /> Новая услуга
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/30 text-sm flex-wrap">
          <span className="text-muted-foreground">Итого по фильтру:</span>
          <span className="text-muted-foreground text-xs">без НДС: <span className="font-semibold text-foreground">{fmt(filtered.reduce((a, s) => a + s.total, 0))} ₽</span></span>
          <span className="text-muted-foreground text-xs">НДС 22%: <span className="font-semibold text-foreground">{fmt(filtered.reduce((a, s) => a + calcVat(s.total), 0))} ₽</span></span>
          <span className="font-bold text-primary">{fmt(filtered.reduce((a, s) => a + s.total + calcVat(s.total), 0))} ₽ с НДС</span>
          <span className="text-muted-foreground text-xs">({filtered.length} услуг)</span>
        </div>
      )}

      {/* Services list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon name="Receipt" size={48} className="mb-4 opacity-20" />
          <p className="text-sm">Нет платных услуг. Создайте первую!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{s.serviceName}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.draft}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                    {s.tagIds?.map(tid => {
                      const tag = tags.find(t => t.id === tid);
                      return tag ? (
                        <span key={tid} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{tag.name}</span>
                      ) : null;
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">{s.applicantName}{s.serviceDate && ` · ${s.serviceDate}`}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {s.isFixedPrice ? (
                      <span>Фикс. {fmt(s.fixedPrice || 0)} ₽</span>
                    ) : (
                      <span>{s.hours} ч × {fmt(s.hourlyRate)} ₽</span>
                    )}
                    {(s.extraCosts?.length || 0) > 0 && (
                      <span>+ надбавки {fmt((s.extraCosts || []).reduce((a, c) => a + Number(c.amount), 0))} ₽</span>
                    )}
                  </div>
                  {/* Contract files */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <FileUploadButton
                      serviceId={s.id}
                      fileType="draft"
                      currentUrl={s.contractDraftUrl}
                      onUploaded={url => onFileUploaded(s.id, "draft", url)}
                    />
                    <FileUploadButton
                      serviceId={s.id}
                      fileType="final"
                      currentUrl={s.contractFinalUrl}
                      onUploaded={url => onFileUploaded(s.id, "final", url)}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{fmt(s.total + calcVat(s.total))} ₽</div>
                    <div className="text-[11px] text-muted-foreground">без НДС: {fmt(s.total)} ₽</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => exportSingle(s)} className="text-muted-foreground hover:text-primary p-1" title="Экспорт расчёта в Excel">
                      <Icon name="Download" size={14} />
                    </button>
                    <button onClick={() => onEdit(s)} className="text-muted-foreground hover:text-foreground p-1" title="Редактировать">
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive p-1" title="Удалить">
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
              {s.notes && <p className="mt-2 text-xs text-muted-foreground border-t pt-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
