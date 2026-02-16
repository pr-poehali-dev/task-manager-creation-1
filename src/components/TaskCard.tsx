import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/task-store";
import { priorityLabels, priorityColors } from "@/lib/task-store";
import { format, isPast, isToday } from "date-fns";
import { ru } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

export default function TaskCard({ task, onToggle, onEdit, onDelete, onArchive }: TaskCardProps) {
  const isOverdue =
    task.status === "active" && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-lg border bg-card transition-all hover:shadow-sm animate-fade-in ${
        task.status === "completed" ? "opacity-60" : ""
      } ${isOverdue ? "border-red-200 bg-red-50/30" : ""}`}
    >
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => onToggle(task.id)}
        className="mt-1 shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium text-sm leading-tight ${
              task.status === "completed" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </span>
          <Badge variant="outline" className={`text-[11px] px-2 py-0 ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {task.dueDate && (
          <div
            className={`flex items-center gap-1 mt-2 text-xs ${
              isOverdue
                ? "text-red-600 font-medium"
                : isDueToday
                ? "text-amber-600 font-medium"
                : "text-muted-foreground"
            }`}
          >
            <Icon name="Calendar" size={12} />
            <span>
              {isOverdue
                ? "Просрочено: "
                : isDueToday
                ? "Сегодня: "
                : ""}
              {format(new Date(task.dueDate), "d MMM yyyy", { locale: ru })}
            </span>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Icon name="MoreVertical" size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Icon name="Pencil" size={14} />
            <span className="ml-2">Редактировать</span>
          </DropdownMenuItem>
          {task.status !== "archived" && (
            <DropdownMenuItem onClick={() => onArchive(task.id)}>
              <Icon name="Archive" size={14} />
              <span className="ml-2">В архив</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDelete(task.id)}
            className="text-red-600 focus:text-red-600"
          >
            <Icon name="Trash2" size={14} />
            <span className="ml-2">Удалить</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
