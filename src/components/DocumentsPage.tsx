import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import DocumentEditor from "./DocumentEditor";
import RecipientsTable from "./RecipientsTable";
import type { Document, DocCategory } from "@/lib/documents-store";
import { fetchDocuments, deleteDocument, CATEGORY_LABELS } from "@/lib/documents-store";

type DocTab = DocCategory | "recipients";

const CATEGORY_ICONS: Record<DocCategory, string> = {
  letters: "Mail",
  internal: "Building2",
  other: "FolderOpen",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function DocList({
  category,
  onEdit,
}: {
  category: DocCategory;
  onEdit: (doc: Document) => void;
}) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDocuments(category).then((data) => {
      setDocs(data);
      setLoading(false);
    });
  }, [category]);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaved = (doc: Document) => {
    setDocs((prev) => {
      const exists = prev.find((d) => d.id === doc.id);
      if (exists) return prev.map((d) => (d.id === doc.id ? doc : d));
      return [doc, ...prev];
    });
  };

  const filtered = search
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.content.toLowerCase().includes(search.toLowerCase())
      )
    : docs;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по документам..."
            className="pl-8 h-8 text-sm bg-card"
          />
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setEditorOpen(true)}>
          <Icon name="Plus" size={14} />
          Новый
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
          <Icon name={CATEGORY_ICONS[category]} size={48} className="mb-3 opacity-20" />
          <p className="text-sm">{search ? "Ничего не найдено" : "Документов пока нет"}</p>
          {!search && (
            <Button variant="ghost" size="sm" className="mt-3 gap-1.5" onClick={() => setEditorOpen(true)}>
              <Icon name="Plus" size={14} />
              Создать первый документ
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors group"
            >
              <div className="mt-0.5 p-1.5 rounded bg-muted">
                <Icon name={CATEGORY_ICONS[category]} size={16} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onEdit(doc)}
                    className="text-sm font-medium hover:underline text-left truncate"
                  >
                    {doc.title}
                  </button>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDate(doc.updatedAt)}
                  </span>
                </div>
                {doc.content && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-wrap">
                    {doc.content}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(doc)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  Открыть
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
        defaultCategory={category}
      />
    </div>
  );
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>("letters");
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setEditorOpen(true);
  };

  const handleSaved = (doc: Document) => {
    setEditorOpen(false);
    setEditingDoc(null);
    // DocList компонент сам перезагрузится при следующем открытии вкладки
    // Принудительно обновить — перемонтировать через key нельзя, поэтому просто закрываем редактор
    // Данные актуализируются при следующем fetchDocuments
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocTab)}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 h-auto p-1 bg-muted/50">
          {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="gap-1.5 text-xs sm:text-sm">
              <Icon name={CATEGORY_ICONS[cat]} size={14} />
              {CATEGORY_LABELS[cat]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="recipients" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Users" size={14} />
            Адресаты
          </TabsTrigger>
        </TabsList>

        {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map((cat) => (
          <TabsContent key={cat} value={cat}>
            <DocList category={cat} onEdit={handleEdit} />
          </TabsContent>
        ))}

        <TabsContent value="recipients">
          <RecipientsTable />
        </TabsContent>
      </Tabs>

      <DocumentEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingDoc(null); }}
        onSaved={handleSaved}
        editing={editingDoc}
      />
    </div>
  );
}
