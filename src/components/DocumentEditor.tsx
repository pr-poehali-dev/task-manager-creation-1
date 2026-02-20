import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import type { Document, DocCategory, Recipient } from "@/lib/documents-store";
import { CATEGORY_LABELS, createDocument, updateDocument, fetchRecipients } from "@/lib/documents-store";

interface DocumentEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: Document) => void;
  editing?: Document | null;
  defaultCategory?: DocCategory;
}

// ── Попап выбора адресата ──────────────────────────────
function RecipientPicker({
  recipients,
  onInsert,
  onClose,
}: {
  recipients: Recipient[];
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());

  const filtered = search
    ? recipients.filter(
        (r) =>
          r.fullName.toLowerCase().includes(search.toLowerCase()) ||
          r.position.toLowerCase().includes(search.toLowerCase())
      )
    : recipients;

  const selectRecipient = (r: Recipient) => {
    setSelected(r);
    setCheckedEmails(new Set(r.emails));
  };

  const toggleEmail = (email: string) => {
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleAll = () => {
    if (!selected) return;
    if (checkedEmails.size === selected.emails.length) {
      setCheckedEmails(new Set());
    } else {
      setCheckedEmails(new Set(selected.emails));
    }
  };

  const buildText = () => {
    if (!selected) return "";
    const lines: string[] = [];
    if (selected.fullName) lines.push(selected.fullName);
    if (selected.position) lines.push(selected.position);
    if (selected.address) lines.push(selected.address);
    const emails = selected.emails.filter((e) => checkedEmails.has(e));
    if (emails.length) lines.push(emails.join(", "));
    return lines.join("\n");
  };

  const handleInsert = () => {
    const text = buildText();
    if (text) onInsert(text);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Users" size={16} className="text-muted-foreground" />
            Выбор адресата
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 flex-1 overflow-hidden">
          {/* Поиск */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="pl-7 h-7 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Список адресатов */}
            <div className="w-1/2 border-r overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon name="Users" size={28} className="mb-1 opacity-20" />
                  <p className="text-xs">Нет адресатов</p>
                </div>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectRecipient(r)}
                    className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors ${
                      selected?.id === r.id
                        ? "bg-primary/8 border-l-2 border-l-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{r.fullName}</div>
                    {r.position && (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{r.position}</div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Детали выбранного */}
            <div className="w-1/2 overflow-y-auto">
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground px-4 text-center">
                  <Icon name="MousePointerClick" size={28} className="mb-2 opacity-20" />
                  <p className="text-xs">Выберите адресата слева</p>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {selected.address && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Адрес</div>
                      <p className="text-xs leading-relaxed">{selected.address}</p>
                    </div>
                  )}

                  {selected.emails.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Email</div>
                        {selected.emails.length > 1 && (
                          <button
                            onClick={toggleAll}
                            className="text-[10px] text-blue-600 hover:text-blue-700"
                          >
                            {checkedEmails.size === selected.emails.length ? "Снять все" : "Выбрать все"}
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {selected.emails.map((email) => (
                          <label
                            key={email}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <Checkbox
                              checked={checkedEmails.has(email)}
                              onCheckedChange={() => toggleEmail(email)}
                              className="shrink-0"
                            />
                            <span className="text-xs font-mono truncate group-hover:text-primary transition-colors">
                              {email}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Превью */}
                  {buildText() && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Будет вставлено</div>
                      <pre className="text-[11px] leading-relaxed bg-muted/50 rounded p-2 whitespace-pre-wrap break-all">
                        {buildText()}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" onClick={handleInsert} disabled={!selected} className="gap-1.5">
            <Icon name="CornerDownLeft" size={13} />
            Вставить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Редактор документа ─────────────────────────────────
export default function DocumentEditor({ open, onClose, onSaved, editing, defaultCategory }: DocumentEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<DocCategory>(defaultCategory || "other");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content);
      setCategory(editing.category);
    } else {
      setTitle("");
      setContent("");
      setCategory(defaultCategory || "other");
    }
  }, [editing, defaultCategory, open]);

  useEffect(() => {
    if (open && recipients.length === 0) {
      fetchRecipients().then(setRecipients);
    }
  }, [open]);

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((prev) => prev ? prev + "\n" + text : text);
      return;
    }
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const separator = before && !before.endsWith("\n") ? "\n" : "";
    const newContent = before + separator + text + "\n" + after;
    setContent(newContent);
    setTimeout(() => {
      const pos = before.length + separator.length + text.length + 1;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    }, 0);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let doc: Document;
      if (editing) {
        doc = await updateDocument({ id: editing.id, title: title.trim(), content, category });
      } else {
        doc = await createDocument({ title: title.trim(), content, category });
      }
      onSaved(doc);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать документ" : "Новый документ"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            <div className="flex gap-3">
              <Input
                placeholder="Название документа"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1"
              />
              <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Панель адресата */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-dashed">
              <Icon name="User" size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">Вставить данные адресата в текст</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setPickerOpen(true)}
              >
                <Icon name="Users" size={13} />
                Выбрать адресата
              </Button>
            </div>

            <Textarea
              ref={textareaRef}
              placeholder="Текст документа..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] resize-y font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={onClose}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="gap-1.5">
              {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {pickerOpen && (
        <RecipientPicker
          recipients={recipients}
          onInsert={insertAtCursor}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
