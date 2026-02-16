import funcUrls from "../../backend/func2url.json";
import { authHeaders } from "./auth";

export type Priority = "high" | "medium" | "low";
export type TaskStatus = "active" | "completed" | "archived";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

const API = funcUrls["tasks-api"];

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(API, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function createTaskApi(data: {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
}): Promise<Task> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTaskApi(task: Partial<Task> & { id: string }): Promise<Task> {
  const res = await fetch(API, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function deleteTaskApi(id: string): Promise<void> {
  await fetch(`${API}?id=${id}`, { method: "DELETE", headers: authHeaders() });
}

export function getStats(tasks: Task[]) {
  const active = tasks.filter((t) => t.status === "active");
  const completed = tasks.filter((t) => t.status === "completed");
  const archived = tasks.filter((t) => t.status === "archived");
  const overdue = active.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  );
  const highPriority = active.filter((t) => t.priority === "high");

  const last7days = completed.filter((t) => {
    if (!t.completedAt) return false;
    const diff = Date.now() - new Date(t.completedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  return {
    total: tasks.length,
    active: active.length,
    completed: completed.length,
    archived: archived.length,
    overdue: overdue.length,
    highPriority: highPriority.length,
    completedThisWeek: last7days.length,
  };
}

export const priorityLabels: Record<Priority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export const priorityColors: Record<Priority, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  cdnUrl: string;
  createdAt: string;
}

const FILES_API = funcUrls["files-api"];

export async function fetchAttachments(taskId: string): Promise<Attachment[]> {
  const res = await fetch(`${FILES_API}?task_id=${taskId}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function uploadAttachment(
  taskId: string,
  file: File
): Promise<Attachment> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  const res = await fetch(FILES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      taskId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      fileData: base64,
    }),
  });
  return res.json();
}

export async function deleteAttachment(id: string): Promise<void> {
  await fetch(`${FILES_API}?id=${id}`, { method: "DELETE", headers: authHeaders() });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "FileText",
  "application/msword": "FileText",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "FileText",
  "application/vnd.ms-excel": "FileSpreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "FileSpreadsheet",
  "application/vnd.ms-powerpoint": "FileText",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "FileText",
  "image/png": "Image",
  "image/jpeg": "Image",
  "image/gif": "Image",
  "image/webp": "Image",
  "text/plain": "FileText",
  "application/zip": "FileArchive",
  "application/x-rar-compressed": "FileArchive",
};

export function getFileIcon(contentType: string): string {
  return FILE_ICONS[contentType] || "File";
}

export default { fetchTasks, createTaskApi, updateTaskApi, deleteTaskApi, getStats };
