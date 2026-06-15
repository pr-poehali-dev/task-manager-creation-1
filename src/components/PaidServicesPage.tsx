import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import * as XLSX from "xlsx";
import funcUrls from "../../backend/func2url.json";
import { authHeaders } from "@/lib/auth";

const API = funcUrls["paid-services-api"];

// ── Types ────────────────────────────────────────────────────────────────────

interface ExtraCost {
  label: string;
  amount: number;
}

interface PaidService {
  id: number;
  serviceName: string;
  applicantName: string;
  applicantId: number | null;
  serviceCatalogId: number | null;
  hours: number;
  hourlyRate: number;
  isFixedPrice: boolean;
  fixedPrice: number | null;
  extraCosts: ExtraCost[];
  tagIds: number[];
  status: string;
  notes: string;
  contractDraftUrl: string | null;
  contractFinalUrl: string | null;
  serviceDate: string | null;
  total: number;
  createdAt: string;
}

interface CatalogItem {
  id: number;
  name: string;
  description: string;
  isFixedPrice: boolean;
  fixedPrice: number | null;
  hourlyRate: number;
}

interface Applicant {
  id: number;
  name: string;
  address: string;
  inn: string;
  contact: string;
}

interface Tag {
  id: number;
  name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const VAT_RATE = 0.22;

function calcTotal(s: Pick<PaidService, "isFixedPrice" | "fixedPrice" | "hours" | "hourlyRate" | "extraCosts">): number {
  const extra = (s.extraCosts || []).reduce((a, c) => a + Number(c.amount), 0);
  if (s.isFixedPrice) return Number(s.fixedPrice || 0) + extra;
  return Number(s.hours) * Number(s.hourlyRate) + extra;
}

function calcVat(total: number): number {
  return total * VAT_RATE;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  active: "Активна",
  completed: "Выполнена",
  cancelled: "Отменена",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

// ── Service Form Dialog ───────────────────────────────────────────────────────

interface ServiceFormProps {
  service: PaidService | null;
  catalog: CatalogItem[];
  applicants: Applicant[];
  tags: Tag[];
  onSave: (data: Partial<PaidService>) => Promise<void>;
  onClose: () => void;
}

function ServiceForm({ service, catalog, applicants, tags, onSave, onClose }: ServiceFormProps) {
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

  const total = calcTotal({ ...form, extraCosts: form.extraCosts || [], hours: form.hours || 0, hourlyRate: form.hourlyRate || 1420, isFixedPrice: form.isFixedPrice || false, fixedPrice: form.fixedPrice || null });

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

function FileUploadButton({ serviceId, fileType, currentUrl, onUploaded }: {
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

// ── Catalog Manager ───────────────────────────────────────────────────────────

function CatalogManager({ catalog, onRefresh }: { catalog: CatalogItem[]; onRefresh: () => void }) {
  const [form, setForm] = useState<Partial<CatalogItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => setForm({ name: "", description: "", isFixedPrice: false, fixedPrice: null, hourlyRate: 1420 });
  const openEdit = (c: CatalogItem) => setForm({ ...c });

  const handleSave = async () => {
    if (!form?.name?.trim()) return;
    setSaving(true);
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${API}/catalog/${form.id}` : `${API}/catalog`;
    await fetch(url, {
      method,
      headers: { ...(authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm(null);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить услугу из справочника?")) return;
    await fetch(`${API}/catalog/${id}`, { method: "DELETE", headers: authHeaders() });
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Справочник типовых услуг для быстрого заполнения</p>
        <Button size="sm" variant="outline" onClick={openNew} className="gap-1.5 h-8">
          <Icon name="Plus" size={13} /> Добавить
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {catalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Icon name="BookOpen" size={32} className="mb-2 opacity-20" />
            <p className="text-sm">Справочник пуст</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Название</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Тип расчёта</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Ставка / Сумма</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {catalog.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.isFixedPrice ? "Фиксированная" : "Почасовая"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {c.isFixedPrice ? `${fmt(c.fixedPrice || 0)} ₽` : `${fmt(c.hourlyRate)} ₽/ч`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground"><Icon name="Pencil" size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive"><Icon name="Trash2" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <Dialog open onOpenChange={() => setForm(null)}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{form.id ? "Редактировать" : "Новая услуга в справочник"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Название *</label>
                <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p!, name: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Описание</label>
                <Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p!, description: e.target.value }))} className="resize-none min-h-[60px] text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isFixedPrice || false} onChange={e => setForm(p => ({ ...p!, isFixedPrice: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm">Фиксированная стоимость</span>
              </label>
              {form.isFixedPrice ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Сумма, ₽</label>
                  <Input type="number" value={form.fixedPrice ?? ""} onChange={e => setForm(p => ({ ...p!, fixedPrice: Number(e.target.value) }))} className="h-9" />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Ставка ч/час, ₽</label>
                  <Input type="number" value={form.hourlyRate ?? 1420} onChange={e => setForm(p => ({ ...p!, hourlyRate: Number(e.target.value) }))} className="h-9" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setForm(null)}>Отмена</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !form.name?.trim()} className="gap-1.5">
                  {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Applicants Manager ────────────────────────────────────────────────────────

function ApplicantsManager({ applicants, onRefresh }: { applicants: Applicant[]; onRefresh: () => void }) {
  const [form, setForm] = useState<Partial<Applicant> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form?.name?.trim()) return;
    setSaving(true);
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${API}/applicants/${form.id}` : `${API}/applicants`;
    await fetch(url, {
      method,
      headers: { ...(authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm(null);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить заявителя?")) return;
    await fetch(`${API}/applicants/${id}`, { method: "DELETE", headers: authHeaders() });
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Справочник заявителей (организаций)</p>
        <Button size="sm" variant="outline" onClick={() => setForm({ name: "", address: "", inn: "", contact: "" })} className="gap-1.5 h-8">
          <Icon name="Plus" size={13} /> Добавить
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {applicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Icon name="Building2" size={32} className="mb-2 opacity-20" />
            <p className="text-sm">Нет заявителей</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Наименование</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">ИНН</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Адрес</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {applicants.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.inn || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{a.address || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setForm({ ...a })} className="text-muted-foreground hover:text-foreground"><Icon name="Pencil" size={13} /></button>
                      <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive"><Icon name="Trash2" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <Dialog open onOpenChange={() => setForm(null)}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{form.id ? "Редактировать заявителя" : "Новый заявитель"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {[
                { k: "name", label: "Наименование *", ph: "ООО Пример" },
                { k: "inn", label: "ИНН", ph: "7700000000" },
                { k: "address", label: "Адрес", ph: "г. Москва, ул. Ленина, 1" },
                { k: "contact", label: "Контакт", ph: "Иванов И.И., +7..." },
              ].map(({ k, label, ph }) => (
                <div key={k} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <Input value={(form as Record<string, string>)[k] || ""} onChange={e => setForm(p => ({ ...p!, [k]: e.target.value }))} placeholder={ph} className="h-9" />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setForm(null)}>Отмена</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !form.name?.trim()} className="gap-1.5">
                  {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Tags Manager ─────────────────────────────────────────────────────────────

function TagsManager({ tags, onRefresh }: { tags: Tag[]; onRefresh: () => void }) {
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newTag.trim()) return;
    setSaving(true);
    await fetch(`${API}/tags`, {
      method: "POST",
      headers: { ...(authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag.trim() }),
    });
    setNewTag("");
    setSaving(false);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/tags/${id}`, { method: "DELETE", headers: authHeaders() });
    onRefresh();
  };

  return (
    <div className="space-y-3 max-w-sm">
      <p className="text-xs text-muted-foreground">Теги для классификации и фильтрации услуг</p>
      <div className="flex gap-2">
        <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Название тега..." className="h-9"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <Button size="sm" onClick={handleAdd} disabled={saving || !newTag.trim()} className="gap-1 h-9">
          {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Plus" size={13} />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <div key={t.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm">
            <span>{t.name}</span>
            <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive ml-1">
              <Icon name="X" size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PaidServicesPage() {
  const [services, setServices] = useState<PaidService[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("services");

  // Service list state
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<PaidService | null>(null);
  const [searchStr, setSearchStr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const headers = authHeaders();
    const [sRes, cRes, aRes, tRes] = await Promise.all([
      fetch(API, { headers }),
      fetch(`${API}/catalog`, { headers }),
      fetch(`${API}/applicants`, { headers }),
      fetch(`${API}/tags`, { headers }),
    ]);
    if (sRes.ok) setServices(await sRes.json());
    if (cRes.ok) setCatalog(await cRes.json());
    if (aRes.ok) setApplicants(await aRes.json());
    if (tRes.ok) setTags(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const reloadServices = async () => {
    const res = await fetch(API, { headers: authHeaders() });
    if (res.ok) setServices(await res.json());
  };

  const handleSaveService = async (data: Partial<PaidService>) => {
    const method = editingService ? "PUT" : "POST";
    const url = editingService ? `${API}/${editingService.id}` : API;
    await fetch(url, {
      method,
      headers: { ...(authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setFormOpen(false);
    setEditingService(null);
    await reloadServices();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить услугу?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE", headers: authHeaders() });
    setServices(p => p.filter(s => s.id !== id));
  };

  const openEdit = (s: PaidService) => {
    setEditingService(s);
    setFormOpen(true);
  };

  // Filtered list
  const filtered = services.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (dateFrom && s.serviceDate && s.serviceDate < dateFrom) return false;
    if (dateTo && s.serviceDate && s.serviceDate > dateTo) return false;
    if (searchStr) {
      const q = searchStr.toLowerCase();
      return s.serviceName.toLowerCase().includes(q) || s.applicantName.toLowerCase().includes(q);
    }
    return true;
  });

  // Excel export — single service
  const exportSingle = (s: PaidService) => {
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
  };

  // Excel export — summary list
  const exportSummary = () => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Icon name="Loader2" size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1 bg-muted/50">
          <TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Receipt" size={14} /> Услуги
            {services.length > 0 && (
              <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {services.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="BookOpen" size={14} /> Справочник услуг
          </TabsTrigger>
          <TabsTrigger value="applicants" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Building2" size={14} /> Заявители
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Tag" size={14} /> Теги
          </TabsTrigger>
        </TabsList>

        {/* ── SERVICES TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="services" className="space-y-3 mt-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 flex-1">
              <div className="relative">
                <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchStr} onChange={e => setSearchStr(e.target.value)} placeholder="Поиск по услуге или заявителю..." className="pl-8 h-8 text-sm w-56" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Все статусы</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" title="Дата с" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" title="Дата по" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={exportSummary} className="gap-1.5 h-8">
                <Icon name="Download" size={13} /> Перечень Excel
              </Button>
              <Button size="sm" onClick={() => { setEditingService(null); setFormOpen(true); }} className="gap-1.5 h-8">
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
                          onUploaded={url => setServices(prev => prev.map(x => x.id === s.id ? { ...x, contractDraftUrl: url } : x))}
                        />
                        <FileUploadButton
                          serviceId={s.id}
                          fileType="final"
                          currentUrl={s.contractFinalUrl}
                          onUploaded={url => setServices(prev => prev.map(x => x.id === s.id ? { ...x, contractFinalUrl: url } : x))}
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
                        <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground p-1" title="Редактировать">
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive p-1" title="Удалить">
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
        </TabsContent>

        {/* ── CATALOG TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="catalog" className="mt-4">
          <CatalogManager catalog={catalog} onRefresh={async () => {
            const res = await fetch(`${API}/catalog`, { headers: authHeaders() });
            if (res.ok) setCatalog(await res.json());
          }} />
        </TabsContent>

        {/* ── APPLICANTS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="applicants" className="mt-4">
          <ApplicantsManager applicants={applicants} onRefresh={async () => {
            const res = await fetch(`${API}/applicants`, { headers: authHeaders() });
            if (res.ok) setApplicants(await res.json());
          }} />
        </TabsContent>

        {/* ── TAGS TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="tags" className="mt-4">
          <TagsManager tags={tags} onRefresh={async () => {
            const res = await fetch(`${API}/tags`, { headers: authHeaders() });
            if (res.ok) setTags(await res.json());
          }} />
        </TabsContent>
      </Tabs>

      {/* Service Form Dialog */}
      {formOpen && (
        <Dialog open onOpenChange={() => { setFormOpen(false); setEditingService(null); }}>
          <ServiceForm
            service={editingService}
            catalog={catalog}
            applicants={applicants}
            tags={tags}
            onSave={handleSaveService}
            onClose={() => { setFormOpen(false); setEditingService(null); }}
          />
        </Dialog>
      )}
    </div>
  );
}