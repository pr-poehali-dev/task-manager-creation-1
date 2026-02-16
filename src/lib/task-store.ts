import funcUrls from "../../backend/func2url.json";

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
  const res = await fetch(API);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTaskApi(task: Partial<Task> & { id: string }): Promise<Task> {
  const res = await fetch(API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function deleteTaskApi(id: string): Promise<void> {
  await fetch(`${API}?id=${id}`, { method: "DELETE" });
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

export default { fetchTasks, createTaskApi, updateTaskApi, deleteTaskApi, getStats };
