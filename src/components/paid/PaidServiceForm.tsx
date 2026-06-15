import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { authHeaders } from "@/lib/auth";
import funcUrls from "../../../backend/func2url.json";
import {
  PaidService, CatalogItem, Applicant, Tag, ExtraCost,
  fmt, calcTotal, calcVat, STATUS_LABELS,
} from "./PaidServiceTypes";

const API = funcUrls["paid-services-api"];

// ── Service Form Dialog ───────────────────────────────────────────────────────

interface ServiceFormProps {
  service: PaidService | null;
  catalog: CatalogItem[];
  applicants: Applicant[];
  tags: Tag[];
  onSave: (data: Partial<PaidService>) => Promise<void>;
  onClose: () => void;
}

export function ServiceForm({ service, catalog, applicants, tags, onSave, onClose }: ServiceFormProps) {
  const [form, setForm] = useState<Partial<PaidService>>({
    serviceName: service?.serviceName ?? "",
    applicantName: service?.applicantName ?? "",
    applicantId: service?.applicantId ?? null,
    serviceCatalogId: service?.serviceCatalogId ?? null,
    hours: service?.hours ?? 0,
    hourlyRate: service?.hourlyRate ?? 1420,
    isFixedPrice: service?.isFixedPrice ?? false,
    fixedPrice: service?.fixedPrice ?? null,
    extraCosts: service?.extraCosts ?? [],
    tagIds: service?.tagIds ?? [],
    status: service?.status ?? "draft",
    notes: service?.notes ?? "",
    serviceDate: service?.serviceDate ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof PaidService, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const addExtra = () => set("extraCosts", [...(form.extraCosts || []), { label: "", amount: 0 }]);
  const updateExtra = (i: number, k: keyof ExtraCost, v: string | number) => {
    const arr = [...(form.extraCosts || [])];
    arr[i] = { ...arr[i], [k]: v };
    set("extraCosts", arr);
  };
  const removeExtra = (i: number) => set("extraCosts", (form.extraCosts || []).filter((_, idx) => idx !== i));

  const toggleTag = (id: number) => {
    const ids = form.tagIds || [];
    set("tagIds", ids.includes(id) ? ids.filter(t => t !== id) : [...ids, id]);
  };

  const pickCatalog = (id: string) => {
    const item = catalog.find(c => c.id === Number(id));
    if (!item) { set("serviceCatalogId", null); return; }
    setForm(p => ({
      ...p,
      serviceCatalogId: item.id,
      serviceName: item.name,
      isFixedPrice: item.isFixedPrice,
      fixedPrice: item.fixedPrice,
      hourlyRate: item.hourlyRate,
    }));
  };

  const pickApplicant = (id: string) => {
    const a = applicants.find(a => a.id === Number(id));
    if (!a) { set("applicantId", null); set("applicantName", ""); return; }
    setForm(p => ({ ...p, applicantId: a.id, applicantName: a.name }));
  };

  const total = calcTotal({
    ...form,
    extraCosts: form.extraCosts || [],
    hours: form.hours || 0,
    hourlyRate: form.hourlyRate || 1420,
    isFixedPrice: form.isFixedPrice || false,
    fixedPrice: form.fixedPrice || null,
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{service ? "Редактировать услугу" : "Новая платная услуга"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        {/* Catalog picker */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Из справочника</label>
            <select
              value={form.serviceCatalogId ?? ""}
              onChange={e => pickCatalog(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— выбрать —</option>
              {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Заявитель</label>
            <select
              value={form.applicantId ?? ""}
              onChange={e => pickApplicant(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— выбрать —</option>
              {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Service name & applicant name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Наименование услуги *</label>
            <Input value={form.serviceName || ""} onChange={e => set("serviceName", e.target.value)} placeholder="Название услуги" className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Наименование заявителя *</label>
            <Input value={form.applicantName || ""} onChange={e => set("applicantName", e.target.value)} placeholder="ООО Пример" className="h-9" />
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFixedPrice || false} onChange={e => set("isFixedPrice", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium">Фиксированная стоимость</span>
            </label>
          </div>

          {form.isFixedPrice ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Фиксированная сумма, ₽</label>
              <Input type="number" value={form.fixedPrice ?? ""} onChange={e => set("fixedPrice", Number(e.target.value))} placeholder="0.00" className="h-9 w-48" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Количество часов</label>
                <Input type="number" value={form.hours ?? 0} onChange={e => set("hours", Number(e.target.value))} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ставка ч/час, ₽</label>
                <Input type="number" value={form.hourlyRate ?? 1420} onChange={e => set("hourlyRate", Number(e.target.value))} className="h-9" />
              </div>
            </div>
          )}

          {/* Extra costs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Дополнительные надбавки</span>
              <button onClick={addExtra} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Icon name="Plus" size={12} /> добавить
              </button>
            </div>
            {(form.extraCosts || []).map((ec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={ec.label} onChange={e => updateExtra(i, "label", e.target.value)} placeholder="Название (госпошлина, лицензионный сбор...)" className="h-8 text-sm flex-1" />
                <Input type="number" value={ec.amount} onChange={e => updateExtra(i, "amount", Number(e.target.value))} placeholder="Сумма ₽" className="h-8 text-sm w-32" />
                <button onClick={() => removeExtra(i)} className="text-muted-foreground hover:text-destructive"><Icon name="X" size={14} /></button>
              </div>
            ))}
          </div>

          {/* Total preview */}
          <div className="space-y-1 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Итого без НДС</span>
              <span className="text-sm font-semibold">{fmt(total)} ₽</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">НДС 22%</span>
              <span className="text-sm text-muted-foreground">{fmt(calcVat(total))} ₽</span>
            </div>
            <div className="flex items-center justify-between border-t pt-1">
              <span className="text-xs font-semibold">Итого с НДС</span>
              <span className="text-base font-bold text-primary">{fmt(total + calcVat(total))} ₽</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Теги</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                    (form.tagIds || []).includes(t.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:border-primary/40"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date, status, notes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Дата услуги</label>
            <Input type="date" value={form.serviceDate || ""} onChange={e => set("serviceDate", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Статус</label>
            <select value={form.status || "draft"} onChange={e => set("status", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Примечания</label>
          <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Любые заметки..." className="resize-none min-h-[60px] text-sm" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.serviceName?.trim()} className="gap-1.5">
            {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
            Сохранить
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ── File Upload Button ────────────────────────────────────────────────────────

export function FileUploadButton({ serviceId, fileType, currentUrl, onUploaded }: {
  serviceId: number;
  fileType: "draft" | "final";
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        headers: { ...(authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, fileType, fileName: file.name, contentType: file.type, fileData: base64 }),
      });
      if (res.ok) {
        const data = await res.json();
        onUploaded(data.url);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const label = fileType === "draft" ? "Проект договора" : "Итоговый договор";
  const icon = fileType === "draft" ? "FilePen" : "FileCheck2";

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border hover:bg-muted/50 transition-colors text-muted-foreground"
      >
        {uploading ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name={icon} size={12} />}
        {label}
      </button>
      {currentUrl && (
        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
          <Icon name="Download" size={11} /> Открыть
        </a>
      )}
    </div>
  );
}
