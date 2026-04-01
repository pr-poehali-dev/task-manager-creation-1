import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

interface ReportEditorToolbarProps {
  month: string;
  department: string;
  employeeName: string;
  reportName: string;
  currentId: number | null;
  viewMode: "table" | "form";
  saving: boolean;
  saveMessage: string;
  saveDialogOpen: boolean;
  addEmployeeOpen: boolean;
  newEmployeeName: string;
  onMonthChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onEmployeeNameChange: (v: string) => void;
  onReportNameChange: (v: string) => void;
  onViewModeChange: (v: "table" | "form") => void;
  onOpenSaveDialog: () => void;
  onCloseSaveDialog: () => void;
  onSaveReport: () => void;
  onExportToExcel: () => void;
  onCloseAddEmployee: () => void;
  onNewEmployeeNameChange: (v: string) => void;
  onCreateEmployeeReport: () => void;
}

export default function ReportEditorToolbar({
  month,
  department,
  employeeName,
  reportName,
  currentId,
  viewMode,
  saving,
  saveMessage,
  saveDialogOpen,
  addEmployeeOpen,
  newEmployeeName,
  onMonthChange,
  onDepartmentChange,
  onEmployeeNameChange,
  onReportNameChange,
  onViewModeChange,
  onOpenSaveDialog,
  onCloseSaveDialog,
  onSaveReport,
  onExportToExcel,
  onCloseAddEmployee,
  onNewEmployeeNameChange,
  onCreateEmployeeReport,
}: ReportEditorToolbarProps) {
  return (
    <>
      {/* Тулбар */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Период</label>
            <Input value={month} onChange={(e) => onMonthChange(e.target.value)} placeholder="март 2026" className="h-8 text-sm w-[160px]" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-muted-foreground font-medium">Отдел / организация</label>
            <Input value={department} onChange={(e) => onDepartmentChange(e.target.value)} placeholder="Название отдела" className="h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-1 w-[200px]">
            <label className="text-xs text-muted-foreground font-medium">Сотрудник</label>
            <Input value={employeeName} onChange={(e) => onEmployeeNameChange(e.target.value)} placeholder="ФИО сотрудника" className="h-8 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveMessage && <span className="text-xs text-green-600 font-medium">{saveMessage}</span>}

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            <button
              onClick={() => onViewModeChange("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "table"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Режим таблицы"
            >
              <Icon name="Table" size={13} />
              Таблица
            </button>
            <button
              onClick={() => onViewModeChange("form")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "form"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Режим карточек"
            >
              <Icon name="LayoutList" size={13} />
              Карточки
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={onOpenSaveDialog} className="gap-1.5 h-8">
            <Icon name="Save" size={14} />
            {currentId ? "Обновить" : "Сохранить"}
          </Button>
          <Button size="sm" onClick={onExportToExcel} className="gap-1.5 h-8">
            <Icon name="Download" size={14} />
            Excel
          </Button>
        </div>
      </div>

      {/* Диалог сохранения */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCloseSaveDialog}>
          <div className="bg-card rounded-xl border shadow-lg p-5 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold mb-1">Сохранение отчёта</h3>
              <p className="text-xs text-muted-foreground">Укажите название и сотрудника</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Название отчёта</label>
                <Input
                  value={reportName}
                  onChange={(e) => onReportNameChange(e.target.value)}
                  placeholder="Отчёт за март"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") onSaveReport(); if (e.key === "Escape") onCloseSaveDialog(); }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Сотрудник (ФИО)</label>
                <Input
                  value={employeeName}
                  onChange={(e) => onEmployeeNameChange(e.target.value)}
                  placeholder="Иванов И.И."
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCloseSaveDialog}>Отмена</Button>
              <Button size="sm" onClick={onSaveReport} disabled={saving} className="gap-1.5">
                {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Диалог добавления сотрудника */}
      {addEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCloseAddEmployee}>
          <div className="bg-card rounded-xl border shadow-lg p-5 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold mb-1">Новый сотрудник</h3>
              <p className="text-xs text-muted-foreground">Создать новый отчёт для сотрудника за период <strong>{month}</strong></p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">ФИО сотрудника</label>
              <Input
                value={newEmployeeName}
                onChange={(e) => onNewEmployeeNameChange(e.target.value)}
                placeholder="Иванов И.И."
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") onCreateEmployeeReport(); if (e.key === "Escape") onCloseAddEmployee(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCloseAddEmployee}>Отмена</Button>
              <Button size="sm" onClick={onCreateEmployeeReport} disabled={!newEmployeeName.trim()} className="gap-1.5">
                <Icon name="UserPlus" size={13} />
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
