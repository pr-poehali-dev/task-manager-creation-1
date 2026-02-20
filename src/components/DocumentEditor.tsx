import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import type { Document, DocCategory } from "@/lib/documents-store";
import { CATEGORY_LABELS, createDocument, updateDocument } from "@/lib/documents-store";

interface DocumentEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: Document) => void;
  editing?: Document | null;
  defaultCategory?: DocCategory;
}

export default function DocumentEditor({ open, onClose, onSaved, editing, defaultCategory }: DocumentEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<DocCategory>(defaultCategory || "other");
  const [saving, setSaving] = useState(false);

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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? "Редактировать документ" : "Новый документ"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
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
          <Textarea
            placeholder="Текст документа..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[320px] resize-y font-mono text-sm"
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
  );
}
