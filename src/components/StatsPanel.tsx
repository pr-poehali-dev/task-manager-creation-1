import Icon from "@/components/ui/icon";

interface StatsPanelProps {
  stats: {
    total: number;
    active: number;
    completed: number;
    archived: number;
    overdue: number;
    highPriority: number;
    completedThisWeek: number;
  };
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const cards = [
    {
      label: "Всего задач",
      value: stats.total,
      icon: "LayoutList" as const,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Активные",
      value: stats.active,
      icon: "CircleDot" as const,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Выполнено",
      value: stats.completed,
      icon: "CheckCircle2" as const,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Просрочено",
      value: stats.overdue,
      icon: "AlertTriangle" as const,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Высокий приоритет",
      value: stats.highPriority,
      icon: "Flame" as const,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "За эту неделю",
      value: stats.completedThisWeek,
      icon: "TrendingUp" as const,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  const completionRate =
    stats.total > 0
      ? Math.round(((stats.completed + stats.archived) / stats.total) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 p-4 rounded-lg border bg-card"
          >
            <div className={`p-2.5 rounded-lg ${card.bg}`}>
              <Icon name={card.icon} size={20} className={card.color} />
            </div>
            <div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Прогресс выполнения</span>
          <span className="text-sm font-bold text-primary">{completionRate}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
