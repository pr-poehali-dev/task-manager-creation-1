import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import type { Recipient } from "@/lib/documents-store";
import {
  fetchRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
} from "@/lib/documents-store";

const EMPTY: Omit<Recipient, "id" | "createdAt"> = {
  fullName: "",
  position: "",
  address: "",
  email: "",
};

export default function RecipientsTable() {
  const [rows, setRows] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Recipient, "id" | "createdAt">>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<Omit<Recipient, "id" | "createdAt">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecipients().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  const startEdit = (r: Recipient) => {
    setEditing(r.id);
    setDraft({ fullName: r.fullName, position: r.position, address: r.address, email: r.email });
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async (id: string) => {
    if (!draft.fullName.trim()) return;
    setSaving(true);
    const updated = await updateRecipient({ id, ...draft });
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setEditing(null);
    setSaving(false);
  };

  const saveNew = async () => {
    if (!newRow.fullName.trim()) return;
    setSaving(true);
    const created = await createRecipient(newRow);
    setRows((prev) => [created, ...prev]);
    setNewRow(EMPTY);
    setAdding(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteRecipient(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const cols = [
    { key: "fullName" as const, label: "ФИО", flex: "flex-[2]" },
    { key: "position" as const, label: "Должность", flex: "flex-[2]" },
    { key: "address" as const, label: "Адрес", flex: "flex-[3]" },
    { key: "email" as const, label: "Email", flex: "flex-[2]" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {rows.length} {rows.length === 1 ? "адресат" : rows.length < 5 ? "адресата" : "адресатов"}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => { setAdding(true); setEditing(null); }}
          disabled={adding}
        >
          <Icon name="UserPlus" size={14} />
          Добавить
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
          {cols.map((c) => (
            <span key={c.key} className={`${c.flex} text-xs font-semibold text-muted-foreground uppercase tracking-wide`}>
              {c.label}
            </span>
          ))}
          <span className="w-16" />
        </div>

        {/* Add row */}
        {adding && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 border-b">
            {cols.map((c) => (
              <Input
                key={c.key}
                className={`${c.flex} h-7 text-xs`}
                placeholder={c.label}
                value={newRow[c.key]}
                onChange={(e) => setNewRow((p) => ({ ...p, [c.key]: e.target.value }))}
              />
            ))}
            <div className="w-16 flex gap-1">
              <button
                onClick={saveNew}
                disabled={saving || !newRow.fullName.trim()}
                className="px-2 py-1 rounded text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-40"
              >
                {saving ? "..." : "OK"}
              </button>
              <button
                onClick={() => { setAdding(false); setNewRow(EMPTY); }}
                className="px-2 py-1 rounded text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Rows */}
        {rows.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Icon name="Users" size={36} className="mb-2 opacity-20" />
            <p className="text-sm">Список адресатов пуст</p>
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={row.id}
              className={`flex items-center gap-2 px-3 py-2 ${i < rows.length - 1 ? "border-b" : ""} hover:bg-muted/30 transition-colors group`}
            >
              {editing === row.id ? (
                <>
                  {cols.map((c) => (
                    <Input
                      key={c.key}
                      className={`${c.flex} h-7 text-xs`}
                      value={draft[c.key]}
                      onChange={(e) => setDraft((p) => ({ ...p, [c.key]: e.target.value }))}
                    />
                  ))}
                  <div className="w-16 flex gap-1">
                    <button
                      onClick={() => saveEdit(row.id)}
                      disabled={saving || !draft.fullName.trim()}
                      className="px-2 py-1 rounded text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-40"
                    >
                      {saving ? "..." : "OK"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 rounded text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {cols.map((c) => (
                    <span key={c.key} className={`${c.flex} text-sm truncate`} title={row[c.key]}>
                      {row[c.key] || <span className="text-muted-foreground/40">—</span>}
                    </span>
                  ))}
                  <div className="w-16 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(row)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      Ред.
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
