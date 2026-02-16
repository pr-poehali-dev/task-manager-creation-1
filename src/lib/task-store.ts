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

const STORAGE_KEY = "task-manager-tasks";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function createTask(data: {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
}): Task {
  return {
    id: generateId(),
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: "active",
    dueDate: data.dueDate,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
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

export default { loadTasks, saveTasks, createTask, getStats };
