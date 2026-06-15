import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { authHeaders } from "@/lib/auth";
import funcUrls from "../../../backend/func2url.json";
import { CatalogItem, Applicant, Tag, fmt } from "./PaidServiceTypes";

const API = funcUrls["paid-services-api"];

// ── Catalog Manager ───────────────────────────────────────────────────────────

export function CatalogManager({ catalog, onRefresh }: { catalog: CatalogItem[]; onRefresh: () => void }) {
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

export function ApplicantsManager({ applicants, onRefresh }: { applicants: Applicant[]; onRefresh: () => void }) {
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

export function TagsManager({ tags, onRefresh }: { tags: Tag[]; onRefresh: () => void }) {
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
