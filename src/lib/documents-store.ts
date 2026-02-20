import funcUrls from "../../backend/func2url.json";
import { authHeaders } from "./auth";

const DOCS_API = (funcUrls as Record<string, string>)["documents-api"];
const RCPT_API = (funcUrls as Record<string, string>)["recipients-api"];

export type DocCategory = "letters" | "internal" | "other";

export interface Document {
  id: string;
  title: string;
  content: string;
  category: DocCategory;
  createdAt: string;
  updatedAt: string;
}

export interface Recipient {
  id: string;
  fullName: string;
  position: string;
  address: string;
  emails: string[];
  createdAt: string;
}

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  letters: "Письма",
  internal: "Внутренние",
  other: "Прочие",
};

// ── Documents ──────────────────────────────────────────

export async function fetchDocuments(category?: DocCategory): Promise<Document[]> {
  const url = category ? `${DOCS_API}?category=${category}` : DOCS_API;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function createDocument(data: {
  title: string;
  content: string;
  category: DocCategory;
}): Promise<Document> {
  const res = await fetch(DOCS_API, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка создания документа");
  return res.json();
}

export async function updateDocument(data: {
  id: string;
  title?: string;
  content?: string;
  category?: DocCategory;
}): Promise<Document> {
  const res = await fetch(DOCS_API, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления документа");
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  await fetch(`${DOCS_API}?id=${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ── Recipients ─────────────────────────────────────────

export async function fetchRecipients(): Promise<Recipient[]> {
  const res = await fetch(RCPT_API, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function createRecipient(data: Omit<Recipient, "id" | "createdAt">): Promise<Recipient> {
  const res = await fetch(RCPT_API, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка создания адресата");
  return res.json();
}

export async function updateRecipient(data: Partial<Recipient> & { id: string }): Promise<Recipient> {
  const res = await fetch(RCPT_API, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления адресата");
  return res.json();
}

export async function deleteRecipient(id: string): Promise<void> {
  await fetch(`${RCPT_API}?id=${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}