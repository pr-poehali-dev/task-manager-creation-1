import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import type { Task } from "@/lib/task-store";
import { priorityColors, priorityLabels } from "@/lib/task-store";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export default function CalendarView({ tasks, onEdit }: CalendarViewProps) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const tasksWithDates = tasks.filter((t) => t.dueDate && t.status !== "archived");

  const datesWithTasks = tasksWithDates.reduce<Record<string, Task[]>>((acc, task) => {
    if (!task.dueDate) return acc;
    const key = format(new Date(task.dueDate), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const selectedDayTasks = selected
    ? tasksWithDates.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selected))
    : [];

  const modifiers = {
    hasTasks: Object.keys(datesWithTasks).map((d) => new Date(d)),
  };

  const modifiersStyles = {
    hasTasks: {
      fontWeight: 700,
      textDecoration: "underline",
      textDecorationColor: "hsl(220, 60%, 35%)",
      textUnderlineOffset: "3px",
    },
  };

  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-6 animate-fade-in">
      <div className="border rounded-lg bg-card p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          locale={ru}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {selected
            ? format(selected, "d MMMM yyyy", { locale: ru })
            : "Выберите дату"}
        </h3>

        {selectedDayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Icon name="CalendarX" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Нет задач на эту дату</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onEdit(task)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === "high"
                      ? "bg-red-500"
                      : task.priority === "medium"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      task.status === "completed"
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${priorityColors[task.priority]}`}
                >
                  {priorityLabels[task.priority]}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
