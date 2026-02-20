import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import type { Recipient } from "@/lib/documents-store";
import {
  fetchRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
} from "@/lib/documents-store";

// ── Копирование с тостом ────────────────────────────────
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
      title="Скопировать"
    >
      <Icon name={copied ? "Check" : "Copy"} size={11} />
      {label || (copied ? "Скопировано" : "Копировать")}
    </button>
  );
}

// ── Панель просмотра адресата ───────────────────────────
function RecipientView({ recipient, onClose, onEdit }: {
  recipient: Recipient;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="User" size={18} className="text-muted-foreground" />
            {recipient.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recipient.organization && (
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Организация</div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40">
                <span className="text-sm font-medium">{recipient.organization}</span>
                <CopyButton text={recipient.organization} />
              </div>
            </div>
          )}

          {recipient.position && (
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Должность</div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40">
                <span className="text-sm">{recipient.position}</span>
                <CopyButton text={recipient.position} />
              </div>
            </div>
          )}

          {recipient.address && (
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Адрес</div>
              <div className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/40">
                <span className="text-sm leading-relaxed">{recipient.address}</span>
                <CopyButton text={recipient.address} />
              </div>
            </div>
          )}

          {recipient.emails.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Электронная почта ({recipient.emails.length})
              </div>
              <div className="space-y-1.5">
                {recipient.emails.map((email, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40">
                    <span className="text-sm font-mono">{email}</span>
                    <CopyButton text={email} />
                  </div>
                ))}
                {recipient.emails.length > 1 && (
                  <div className="flex justify-end">
                    <CopyButton text={recipient.emails.join("; ")} label="Все адреса" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Закрыть</Button>
          <Button size="sm" className="gap-1.5" onClick={onEdit}>
            <Icon name="Pencil" size={14} />
            Редактировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Форма редактирования / добавления ──────────────────
interface RecipientFormData {
  fullName: string;
  organization: string;
  position: string;
  address: string;
  emails: string[];
}

const EMPTY_FORM: RecipientFormData = { fullName: "", organization: "", position: "", address: "", emails: [""] };

function RecipientForm({ initial, onSave, onCancel, saving }: {
  initial: RecipientFormData;
  onSave: (data: RecipientFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<RecipientFormData>(initial);

  const setField = (key: keyof Omit<RecipientFormData, "emails">, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const setEmail = (i: number, val: string) =>
    setForm((p) => { const emails = [...p.emails]; emails[i] = val; return { ...p, emails }; });

  const addEmail = () => setForm((p) => ({ ...p, emails: [...p.emails, ""] }));

  const removeEmail = (i: number) =>
    setForm((p) => ({ ...p, emails: p.emails.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    const cleanEmails = form.emails.map((e) => e.trim()).filter(Boolean);
    onSave({ ...form, emails: cleanEmails });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ФИО *</label>
          <Input
            className="mt-1 h-8 text-sm"
            value={form.fullName}
            onChange={(e) => setField("fullName", e.target.value)}
            placeholder="Иванов Иван Иванович"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Организация</label>
          <Input
            className="mt-1 h-8 text-sm"
            value={form.organization}
            onChange={(e) => setField("organization", e.target.value)}
            placeholder="ООО «Ромашка»"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Должность</label>
          <Input
            className="mt-1 h-8 text-sm"
            value={form.position}
            onChange={(e) => setField("position", e.target.value)}
            placeholder="Директор"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Адрес</label>
          <Input
            className="mt-1 h-8 text-sm"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="г. Москва, ул. Примерная, д. 1"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email-адреса</label>
          <button
            onClick={addEmail}
            className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            <Icon name="Plus" size={11} />
            Добавить
          </button>
        </div>
        <div className="space-y-1.5">
          {form.emails.map((email, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                className="h-8 text-sm flex-1 font-mono"
                value={email}
                onChange={(e) => setEmail(i, e.target.value)}
                placeholder="example@mail.ru"
                type="email"
              />
              {form.emails.length > 1 && (
                <button
                  onClick={() => removeEmail(i)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Icon name="X" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Отмена</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.fullName.trim()} className="gap-1.5">
          {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
          Сохранить
        </Button>
      </div>
    </div>
  );
}

// ── Диалог редактирования ──────────────────────────────
function RecipientEditDialog({ recipient, onClose, onSaved }: {
  recipient: Recipient | null;
  onClose: () => void;
  onSaved: (r: Recipient) => void;
}) {
  const [saving, setSaving] = useState(false);

  const initial: RecipientFormData = recipient
    ? {
        fullName: recipient.fullName,
        organization: recipient.organization || "",
        position: recipient.position,
        address: recipient.address,
        emails: recipient.emails.length ? recipient.emails : [""],
      }
    : EMPTY_FORM;

  const handleSave = async (data: RecipientFormData) => {
    setSaving(true);
    try {
      let result: Recipient;
      if (recipient) {
        result = await updateRecipient({ id: recipient.id, ...data });
      } else {
        result = await createRecipient(data);
      }
      onSaved(result);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{recipient ? "Редактировать адресата" : "Новый адресат"}</DialogTitle>
        </DialogHeader>
        <RecipientForm initial={initial} onSave={handleSave} onCancel={onClose} saving={saving} />
      </DialogContent>
    </Dialog>
  );
}

// ── Основная таблица ────────────────────────────────────
export default function RecipientsTable() {
  const [rows, setRows] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Recipient | null>(null);
  const [editing, setEditing] = useState<Recipient | null | "new">(null);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");

  useEffect(() => {
    fetchRecipients().then((data) => { setRows(data); setLoading(false); });
  }, []);

  const organizations = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.organization) set.add(r.organization); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (orgFilter) result = result.filter((r) => r.organization === orgFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.organization.toLowerCase().includes(q) ||
          r.position.toLowerCase().includes(q) ||
          r.emails.some((e) => e.toLowerCase().includes(q))
      );
    }
    return result;
  }, [rows, search, orgFilter]);

  const handleSaved = (r: Recipient) => {
    setRows((prev) => {
      const exists = prev.find((x) => x.id === r.id);
      return exists ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev];
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRecipient(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (viewing?.id === id) setViewing(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Панель управления */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, должности, email..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {organizations.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setOrgFilter("")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                !orgFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Все
            </button>
            {organizations.map((org) => (
              <button
                key={org}
                onClick={() => setOrgFilter(org === orgFilter ? "" : org)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  orgFilter === org ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {org}
              </button>
            ))}
          </div>
        )}

        <Button size="sm" variant="outline" className="gap-1.5 ml-auto" onClick={() => setEditing("new")}>
          <Icon name="UserPlus" size={14} />
          Добавить
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "адресат" : filtered.length < 5 ? "адресата" : "адресатов"}
        {(search || orgFilter) && rows.length !== filtered.length && ` из ${rows.length}`}
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
          <span className="flex-[2] text-xs font-semibold text-muted-foreground uppercase tracking-wide">ФИО</span>
          <span className="flex-[2] text-xs font-semibold text-muted-foreground uppercase tracking-wide">Организация</span>
          <span className="flex-[2] text-xs font-semibold text-muted-foreground uppercase tracking-wide">Должность</span>
          <span className="flex-[2] text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</span>
          <span className="w-24" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Icon name="Users" size={36} className="mb-2 opacity-20" />
            <p className="text-sm">{rows.length === 0 ? "Список адресатов пуст" : "Нет подходящих адресатов"}</p>
          </div>
        ) : (
          filtered.map((row, i) => (
            <div
              key={row.id}
              className={`flex items-center gap-2 px-3 py-2.5 ${i < filtered.length - 1 ? "border-b" : ""} hover:bg-muted/30 transition-colors group`}
            >
              <span className="flex-[2] text-sm font-medium truncate">{row.fullName}</span>
              <span className="flex-[2] text-sm text-muted-foreground truncate">
                {row.organization || <span className="opacity-30">—</span>}
              </span>
              <span className="flex-[2] text-sm text-muted-foreground truncate">
                {row.position || <span className="opacity-30">—</span>}
              </span>
              <div className="flex-[2] min-w-0">
                {row.emails.length === 0 ? (
                  <span className="text-sm text-muted-foreground/30">—</span>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-sm font-mono truncate block">{row.emails[0]}</span>
                    {row.emails.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">+{row.emails.length - 1} ещё</span>
                    )}
                  </div>
                )}
              </div>
              <div className="w-24 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setViewing(row)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  Открыть
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Просмотр */}
      {viewing && (
        <RecipientView
          recipient={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
        />
      )}

      {/* Редактирование / создание */}
      {editing !== null && (
        <RecipientEditDialog
          recipient={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
