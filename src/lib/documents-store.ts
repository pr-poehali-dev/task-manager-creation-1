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

// ── Doc Attachments ────────────────────────────────────

const FILES_API = (funcUrls as Record<string, string>)["files-api"];

export interface DocAttachment {
  id: string;
  docId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  cdnUrl: string;
  createdAt: string;
}

export async function fetchDocAttachments(docId: string): Promise<DocAttachment[]> {
  const res = await fetch(`${FILES_API}?doc_id=${docId}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function uploadDocAttachment(docId: string, file: File): Promise<DocAttachment> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));
  const res = await fetch(FILES_API, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ docId, fileName: file.name, contentType: file.type || "application/octet-stream", fileData: base64 }),
  });
  if (!res.ok) throw new Error("Ошибка загрузки файла");
  return res.json();
}

export async function deleteDocAttachment(id: string): Promise<void> {
  await fetch(`${FILES_API}?id=${id}`, { method: "DELETE", headers: authHeaders() });
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