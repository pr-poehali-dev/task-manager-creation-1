import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { MONTH_NAMES, ReportsTree, SavedReport } from "./ReportTypes";

interface ReportArchiveSidebarProps {
  tree: ReportsTree;
  currentId: number | null;
  expandedYears: Set<string>;
  expandedMonths: Set<string>;
  exportingDept: boolean;
  onNewReport: () => void;
  onLoadReport: (id: number) => void;
  onDeleteReport: (id: number) => void;
  onToggleYear: (year: string) => void;
  onToggleMonth: (key: string) => void;
  onExportDepartmentExcel: (year: string, monthKey: string) => void;
  onOpenAddEmployee: (reportsInMonth: SavedReport[]) => void;
}

export default function ReportArchiveSidebar({
  tree,
  currentId,
  expandedYears,
  expandedMonths,
  exportingDept,
  onNewReport,
  onLoadReport,
  onDeleteReport,
  onToggleYear,
  onToggleMonth,
  onExportDepartmentExcel,
  onOpenAddEmployee,
}: ReportArchiveSidebarProps) {
  const hasReports = Object.keys(tree).length > 0;

  return (
    <div className="w-60 shrink-0 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Архив</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={onNewReport}>
          <Icon name="Plus" size={12} />
          Новый
        </Button>
      </div>

      <div className="rounded-lg border bg-card flex-1 overflow-y-auto">
        {!hasReports ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground px-3 text-center">
            <Icon name="FolderOpen" size={28} className="mb-2 opacity-20" />
            <p className="text-[11px]">Нет сохранённых отчётов</p>
          </div>
        ) : (
          <div className="py-1">
            {Object.keys(tree).sort((a, b) => Number(b) - Number(a)).map((year) => (
              <div key={year}>
                {/* Year */}
                <button
                  onClick={() => onToggleYear(year)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <Icon name={expandedYears.has(year) ? "ChevronDown" : "ChevronRight"} size={12} className="text-muted-foreground shrink-0" />
                  <span className="text-xs font-bold">{year}</span>
                </button>

                {expandedYears.has(year) && Object.keys(tree[year]).sort((a, b) => Number(b) - Number(a)).map((monthKey) => {
                  const treeKey = `${year}-${monthKey}`;
                  const monthNum = parseInt(monthKey);
                  const reportsInMonth = tree[year][monthKey];

                  return (
                    <div key={monthKey}>
                      {/* Month row with export button */}
                      <div className="flex items-center group/month">
                        <button
                          onClick={() => onToggleMonth(treeKey)}
                          className="flex-1 flex items-center gap-1.5 pl-6 pr-2 py-1 hover:bg-muted/50 transition-colors"
                        >
                          <Icon name={expandedMonths.has(treeKey) ? "ChevronDown" : "ChevronRight"} size={11} className="text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground">{MONTH_NAMES[monthNum] || monthKey}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/60">{reportsInMonth.length}</span>
                        </button>
                        {/* Export department button */}
                        <button
                          onClick={() => onExportDepartmentExcel(year, monthKey)}
                          disabled={exportingDept}
                          className="opacity-0 group-hover/month:opacity-100 transition-opacity mr-2 text-muted-foreground hover:text-primary shrink-0"
                          title="Экспорт Excel по отделу за этот месяц"
                        >
                          {exportingDept
                            ? <Icon name="Loader2" size={11} className="animate-spin" />
                            : <Icon name="Download" size={11} />
                          }
                        </button>
                      </div>

                      {expandedMonths.has(treeKey) && (
                        <>
                          {/* Employee reports */}
                          {reportsInMonth.map((r) => (
                            <div
                              key={r.id}
                              className={`group flex items-center gap-1 pl-9 pr-2 py-1 cursor-pointer transition-colors ${
                                currentId === r.id
                                  ? "bg-primary/8 border-l-2 border-l-primary"
                                  : "hover:bg-muted/40"
                              }`}
                              onClick={() => onLoadReport(r.id)}
                            >
                              <Icon name="User" size={11} className="text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] truncate block">
                                  {r.employee_name || r.name}
                                </span>
                                {r.employee_name && (
                                  <span className="text-[9px] text-muted-foreground/60 truncate block">{r.name}</span>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteReport(r.id); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                              >
                                <Icon name="X" size={11} />
                              </button>
                            </div>
                          ))}

                          {/* Add employee button */}
                          <button
                            onClick={() => onOpenAddEmployee(reportsInMonth)}
                            className="w-full flex items-center gap-1.5 pl-9 pr-3 py-1 text-[11px] text-muted-foreground hover:text-primary hover:bg-muted/30 transition-colors"
                          >
                            <Icon name="UserPlus" size={11} />
                            Добавить сотрудника
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
