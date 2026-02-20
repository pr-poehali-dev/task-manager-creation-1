import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import type { Document, DocCategory, Recipient, DocAttachment } from "@/lib/documents-store";
import {
  CATEGORY_LABELS,
  createDocument,
  updateDocument,
  fetchRecipients,
  fetchDocAttachments,
  uploadDocAttachment,
  deleteDocAttachment,
} from "@/lib/documents-store";
import { formatFileSize, getFileIcon } from "@/lib/task-store";

interface DocumentEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: Document) => void;
  editing?: Document | null;
  defaultCategory?: DocCategory;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ── Попап выбора адресата ──────────────────────────────
function RecipientPicker({ recipients, onInsert, onClose }: {
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
      if (next.has(email)) { next.delete(email); } else { next.add(email); }
      return next;
    });
  };

  const toggleAll = () => {
    if (!selected) return;
    setCheckedEmails(checkedEmails.size === selected.emails.length ? new Set() : new Set(selected.emails));
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
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." className="pl-7 h-7 text-sm" />
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
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
                    className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors ${selected?.id === r.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}
                  >
                    <div className="text-sm font-medium truncate">{r.fullName}</div>
                    {r.position && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{r.position}</div>}
                  </button>
                ))
              )}
            </div>
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
                          <button onClick={toggleAll} className="text-[10px] text-blue-600 hover:text-blue-700">
                            {checkedEmails.size === selected.emails.length ? "Снять все" : "Выбрать все"}
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {selected.emails.map((email) => (
                          <label key={email} className="flex items-center gap-2 cursor-pointer group">
                            <Checkbox checked={checkedEmails.has(email)} onCheckedChange={() => toggleEmail(email)} className="shrink-0" />
                            <span className="text-xs font-mono truncate group-hover:text-primary transition-colors">{email}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {buildText() && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Будет вставлено</div>
                      <pre className="text-[11px] leading-relaxed bg-muted/50 rounded p-2 whitespace-pre-wrap break-all">{buildText()}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" onClick={() => { onInsert(buildText()); onClose(); }} disabled={!selected} className="gap-1.5">
            <Icon name="CornerDownLeft" size={13} />
            Вставить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Блок файлов документа ──────────────────────────────
function DocFiles({ docId }: { docId: string }) {
  const [files, setFiles] = useState<DocAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocAttachments(docId).then((data) => { setFiles(data); setLoading(false); });
  }, [docId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setUploading(true);
    const added: DocAttachment[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.size > MAX_FILE_SIZE) continue;
      const att = await uploadDocAttachment(docId, f);
      added.push(att);
    }
    setFiles((prev) => [...added, ...prev]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    await deleteDocAttachment(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {files.length > 0 ? `${files.length} ${files.length === 1 ? "файл" : files.length < 5 ? "файла" : "файлов"}` : "Файлов нет"}
        </span>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Upload" size={13} />}
          {uploading ? "Загрузка..." : "Добавить файл"}
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar"
          onChange={handleUpload} />
      </div>

      {files.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
        >
          <Icon name="CloudUpload" size={28} className="opacity-30" />
          <span className="text-sm">Нажмите или перетащите файлы</span>
          <span className="text-xs opacity-60">PDF, Word, Excel, изображения · до 10 МБ</span>
        </button>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-2.5 p-2.5 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors group">
              <div className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-background border">
                <Icon name={getFileIcon(file.contentType)} size={15} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <a href={file.cdnUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline truncate block">
                  {file.fileName}
                </a>
                <span className="text-[11px] text-muted-foreground">{formatFileSize(file.fileSize)}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a href={file.cdnUrl} target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 rounded text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Скачать
                </a>
                <button onClick={() => handleDelete(file.id)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [savedDoc, setSavedDoc] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState("text");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content);
      setCategory(editing.category);
      setSavedDoc(editing);
    } else {
      setTitle("");
      setContent("");
      setCategory(defaultCategory || "other");
      setSavedDoc(null);
    }
    setActiveTab("text");
  }, [editing, defaultCategory, open]);

  useEffect(() => {
    if (open && recipients.length === 0) {
      fetchRecipients().then(setRecipients);
    }
  }, [open]);

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) { setContent((prev) => prev ? prev + "\n" + text : text); return; }
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const sep = before && !before.endsWith("\n") ? "\n" : "";
    setContent(before + sep + text + "\n" + after);
    setTimeout(() => {
      const pos = before.length + sep.length + text.length + 1;
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
      setSavedDoc(doc);
      onSaved(doc);
      return doc;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndFiles = async () => {
    await handleSave();
    setActiveTab("files");
  };

  const currentDocId = savedDoc?.id || editing?.id || "";

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать документ" : "Новый документ"}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-3 shrink-0">
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
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 shrink-0">
              <TabsTrigger value="text" className="gap-1.5 text-xs">
                <Icon name="FileText" size={13} />
                Текст
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5 text-xs">
                <Icon name="Paperclip" size={13} />
                Файлы
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="flex-1 flex flex-col gap-3 overflow-y-auto mt-0 pt-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-dashed shrink-0">
                <Icon name="User" size={14} className="text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">Вставить данные адресата в текст</span>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setPickerOpen(true)}>
                  <Icon name="Users" size={13} />
                  Выбрать адресата
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                placeholder="Текст документа..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[260px] resize-y font-mono text-sm flex-1"
              />
            </TabsContent>

            <TabsContent value="files" className="flex-1 overflow-y-auto mt-0 pt-3">
              {!currentDocId ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center gap-3">
                  <Icon name="CloudUpload" size={36} className="opacity-20" />
                  <p className="text-sm">Сначала сохраните документ</p>
                  <Button size="sm" onClick={handleSaveAndFiles} disabled={!title.trim() || saving} className="gap-1.5">
                    {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
                    Сохранить и добавить файлы
                  </Button>
                </div>
              ) : (
                <DocFiles docId={currentDocId} />
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-between gap-2 pt-2 border-t shrink-0">
            <Button variant="ghost" onClick={onClose}>Закрыть</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="gap-1.5">
              {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {pickerOpen && (
        <RecipientPicker recipients={recipients} onInsert={insertAtCursor} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}