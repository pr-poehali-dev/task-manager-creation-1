import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import TaskCard from "@/components/TaskCard";
import TaskForm from "@/components/TaskForm";
import StatsPanel from "@/components/StatsPanel";
import CalendarView from "@/components/CalendarView";
import AuthScreen from "@/components/AuthScreen";
import type { Task, Priority } from "@/lib/task-store";
import {
  fetchTasks,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  getStats,
} from "@/lib/task-store";
import { checkAuth, clearToken } from "@/lib/auth";
import type { User } from "@/lib/auth";

type Tab = "active" | "completed" | "priority" | "deadlines" | "stats" | "archive";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().then((u) => {
      setUser(u);
      setAuthChecked(true);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchTasks();
    setTasks(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setTasks([]);
  };

  const handleCreate = async (data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
  }) => {
    if (editingTask) {
      const updated = await updateTaskApi({ id: editingTask.id, ...data });
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      setEditingTask(null);
    } else {
      const created = await createTaskApi(data);
      setTasks((prev) => [created, ...prev]);
    }
  };

  const handleToggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "active" : "completed";
    const updated = await updateTaskApi({ id, status: newStatus });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleDelete = async (id: string) => {
    await deleteTaskApi(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleArchive = async (id: string) => {
    const updated = await updateTaskApi({ id, status: "archived" });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    let list = tasks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, search]);

  const activeTasks = filtered.filter((t) => t.status === "active");
  const completedTasks = filtered.filter((t) => t.status === "completed");
  const archivedTasks = filtered.filter((t) => t.status === "archived");

  const byPriority = useMemo(() => {
    const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return [...activeTasks].sort((a, b) => order[a.priority] - order[b.priority]);
  }, [activeTasks]);

  const stats = useMemo(() => getStats(tasks), [tasks]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  const renderTaskList = (list: Task[], emptyIcon: string, emptyText: string) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon name="Loader2" size={32} className="mb-4 opacity-40 animate-spin" />
          <p className="text-sm">Загрузка задач...</p>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon name={emptyIcon} size={48} className="mb-4 opacity-20" />
          <p className="text-sm">{emptyText}</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {list.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <Icon name="ListChecks" size={22} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Менеджер задач</h1>
                <p className="text-xs text-muted-foreground">
                  {stats.active} активных · {stats.completed} выполнено
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setFormOpen(true);
                }}
                size="sm"
                className="gap-1.5"
              >
                <Icon name="Plus" size={16} />
                <span className="hidden sm:inline">Новая задача</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-muted-foreground"
              >
                <Icon name="LogOut" size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5">
          <div className="relative">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск задач..."
              className="pl-9 bg-card"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 h-auto p-1 bg-muted/50">
            <TabsTrigger value="active" className="gap-1.5 text-xs sm:text-sm">
              <Icon name="CircleDot" size={14} />
              Активные
              {activeTasks.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {activeTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5 text-xs sm:text-sm">
              <Icon name="CheckCircle2" size={14} />
              Завершённые
            </TabsTrigger>
            <TabsTrigger value="priority" className="gap-1.5 text-xs sm:text-sm">
              <Icon name="ArrowUpDown" size={14} />
              Приоритет
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="gap-1.5 text-xs sm:text-sm">
              <Icon name="Calendar" size={14} />
              Сроки
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 text-xs sm:text-sm">
              <Icon name="BarChart3" size={14} />
              Статистика
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-1.5 text-xs sm:text-sm">
              <Icon name="Archive" size={14} />
              Архив
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {renderTaskList(activeTasks, "Inbox", "Нет активных задач. Создайте первую!")}
          </TabsContent>

          <TabsContent value="completed">
            {renderTaskList(completedTasks, "CheckCircle2", "Пока нет завершённых задач")}
          </TabsContent>

          <TabsContent value="priority">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Icon name="Loader2" size={32} className="mb-4 opacity-40 animate-spin" />
                <p className="text-sm">Загрузка...</p>
              </div>
            ) : byPriority.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Icon name="ArrowUpDown" size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Нет задач для сортировки</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(["high", "medium", "low"] as Priority[]).map((p) => {
                  const group = byPriority.filter((t) => t.priority === p);
                  if (group.length === 0) return null;
                  return (
                    <div key={p}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p === "high"
                              ? "bg-red-500"
                              : p === "medium"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />
                        {p === "high" ? "Высокий" : p === "medium" ? "Средний" : "Низкий"} приоритет
                        <span className="text-[10px] font-normal">({group.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {group.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={handleToggle}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onArchive={handleArchive}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deadlines">
            <CalendarView tasks={tasks} onEdit={handleEdit} />
          </TabsContent>

          <TabsContent value="stats">
            <StatsPanel stats={stats} />
          </TabsContent>

          <TabsContent value="archive">
            {renderTaskList(archivedTasks, "Archive", "Архив пуст")}
          </TabsContent>
        </Tabs>
      </main>

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSave={handleCreate}
        task={editingTask}
      />
    </div>
  );
};

export default Index;
