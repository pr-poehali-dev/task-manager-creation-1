import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import * as XLSX from "xlsx";
import funcUrls from "../../backend/func2url.json";
import { authHeaders } from "@/lib/auth";

const API = funcUrls["reports-api"];

const MONTH_NAMES: Record<number, string> = {
  1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
  5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
  9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
};

interface ReportRow {
  id: number;
  serviceName: string;
  operation: string;
  group: string;
  executor: string;
  unit: string;
  result: string;
  comment: string;
}

interface SavedReport {
  id: number;
  name: string;
  month_label: string;
  department: string;
  employee_name: string;
  created_at: string;
  updated_at: string;
}

// year → monthKey → reports[]
type ReportsTree = Record<string, Record<string, SavedReport[]>>;

// Full report with rows data (for department export)
interface FullReport extends SavedReport {
  report_year: number;
  report_month: number;
  rows_data: ReportRow[];
}

const DEFAULT_ROWS: ReportRow[] = [
  {
    id: 1,
    serviceName:
      "4.1.2.1 Обеспечение сохранности и учет архивных документов\n\n4.1.2.2 Мероприятия по сбору, обработке, использованию геологической информации о недрах\n\nИсполнение запросов Роснедр и их территориальных органов, ФГКУ «Росгеолэкспертиза» и др. органов власти по подготовке Справок, исполнение запросов пользователей недр по подготовке Справок на платной основе (вне государственного задания)",
    operation: '1. Работа в СЭД "Дело" по запросам, договорам, совместным ответам',
    group: "Начальник отдела",
    executor: "Жилка О.В.",
    unit: "час",
    result: "50",
    comment: "",
  },
  { id: 2, serviceName: "", operation: "2. Проверка и визирование бумажных справок, расчетов, иных писем", group: "", executor: "", unit: "справка/письмо", result: "148", comment: "" },
  { id: 3, serviceName: "", operation: "3. Составление проектов писем, редактура, распечатывание", group: "", executor: "", unit: "письмо", result: "7", comment: "" },
  { id: 4, serviceName: "", operation: "4. Совещания", group: "", executor: "", unit: "час", result: "6", comment: "" },
  { id: 5, serviceName: "", operation: '5. Составление договоров на платные услуги, выгрузка их в СЭД "Дело", работа с замечаниями по ним', group: "", executor: "", unit: "Договор", result: "3 договора в разработке", comment: "" },
  { id: 6, serviceName: "", operation: "6. Консультации по телефону и рабочей электронной почте по деятельности отдела", group: "", executor: "", unit: "час", result: "80", comment: "" },
  { id: 7, serviceName: "", operation: "7. Создание и обсуждение задач по доработке модуля по подготовке справок, решение локальных проблем и ошибок", group: "", executor: "", unit: "Задача/ошибка", result: "4/3", comment: "Ведется регулярное общение с разработчиками по доработке модуля и решению возникающих проблем" },
  { id: 8, serviceName: "", operation: "8. Внесение запросов и подготовка справок (по срочным и иным нестандартным запросам), подготовка справок о представлении, непредставлении и (или) нарушении представления геологической информации", group: "", executor: "", unit: "запрос/справка", result: "5/2", comment: "Совместные справки, справки для подготовки платного мониторинга и др" },
  { id: 9, serviceName: "", operation: "9. Проверка данных по платному мониторингу", group: "", executor: "", unit: "Таблица", result: "0", comment: "Пока работ не было" },
  { id: 10, serviceName: "", operation: "10. Оценка и составление плана по работам на сопоставление отчетов в ЕФГИ, разработка регламента и тестирование принципов работы", group: "", executor: "", unit: "час", result: "20", comment: "" },
  { id: 11, serviceName: "", operation: "11. Ведение таблиц по взаимодействию с отделами", group: "", executor: "", unit: "час", result: "4", comment: "Внесение данных о возможных ошибках в каталог, анализ таблицы бухгалтерии по оплаченным счетам, проверка внесенных" },
];

const COLUMNS = [
  { key: "serviceName", label: "Наименование услуг, работ, выполняемых по государственному заданию, государственному контракту и иные виды работ", wide: true },
  { key: "operation", label: "Операции (действия) в рамках выполняемой работы (деление работ на подгруппы)", wide: true },
  { key: "group", label: "Группа в отделе, выполняющая работу", wide: false },
  { key: "executor", label: "Исполнитель операции", wide: false },
  { key: "unit", label: "Единица измерения", wide: false },
  { key: "result", label: "Результат выполнения операции в количественном выражении", wide: false },
  { key: "comment", label: "Комментарий", wide: true },
];

const COLUMN_SHORT: Record<string, string> = {
  serviceName: "Наименование услуг / работ",
  operation: "Операции (действия)",
  group: "Группа в отделе",
  executor: "Исполнитель",
  unit: "Единица измерения",
  result: "Результат",
  comment: "Комментарий",
};

function parseMonthYear(label: string): { year: number; month: number } {
  const months: Record<string, number> = {
    январ: 1, феврал: 2, март: 3, апрел: 4, май: 5, июн: 6,
    июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12,
  };
  const lower = label.toLowerCase();
  let month = 1;
  for (const [key, val] of Object.entries(months)) {
    if (lower.includes(key)) { month = val; break; }
  }
  const yearMatch = label.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  return { year, month };
}

function buildEmployeeSheet(
  ws: XLSX.WorkSheet,
  report: FullReport,
  startRow: number
): number {
  // Returns next available row
  const employeeTitle = report.employee_name
    ? `Сотрудник: ${report.employee_name}`
    : report.name;

  const titleRow = [employeeTitle];
  XLSX.utils.sheet_add_aoa(ws, [titleRow], { origin: { r: startRow, c: 0 } });
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r: startRow, c: 0 }, e: { r: startRow, c: 6 } });

  const headers = COLUMNS.map((c) => c.label);
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: startRow + 1, c: 0 } });

  const dataRows = report.rows_data.map((r) => [
    r.serviceName, r.operation, r.group, r.executor, r.unit, r.result, r.comment,
  ]);
  if (dataRows.length > 0) {
    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: { r: startRow + 2, c: 0 } });
  }

  return startRow + 2 + dataRows.length + 2; // +2 for gap between employees
}

// ─── Form card for a single row ───────────────────────────────────────────────
function RowFormCard({
  row,
  index,
  onUpdate,
  onRemove,
}: {
  row: ReportRow;
  index: number;
  onUpdate: (id: number, field: keyof ReportRow, value: string) => void;
  onRemove: (id: number) => void;
}) {
  const textareaFields: (keyof ReportRow)[] = ["serviceName", "operation", "comment"];

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
        <span className="text-xs font-semibold text-muted-foreground">Запись #{index + 1}</span>
        <button
          onClick={() => onRemove(row.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Удалить запись"
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLUMNS.map((col) => {
          const key = col.key as keyof ReportRow;
          const isTextarea = textareaFields.includes(key);
          return (
            <div key={col.key} className={col.wide ? "md:col-span-2" : ""}>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1 leading-snug">
                {COLUMN_SHORT[col.key]}
              </label>
              {isTextarea ? (
                <Textarea
                  value={row[key]}
                  onChange={(e) => onUpdate(row.id, key, e.target.value)}
                  className="text-sm resize-none min-h-[72px]"
                  placeholder={COLUMN_SHORT[col.key] + "..."}
                />
              ) : (
                <Input
                  value={row[key]}
                  onChange={(e) => onUpdate(row.id, key, e.target.value)}
                  className="text-sm h-9"
                  placeholder={COLUMN_SHORT[col.key] + "..."}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ReportPage() {
  // Current report data
  const [rows, setRows] = useState<ReportRow[]>(DEFAULT_ROWS);
  const [month, setMonth] = useState("март 2026");
  const [department, setDepartment] = useState("отдела мониторинга геологической информации Управления архива и фондов ФГБУ «Росгеолфонд»");
  const [reportName, setReportName] = useState("Отчёт за март");
  const [employeeName, setEmployeeName] = useState("");
  const [currentId, setCurrentId] = useState<number | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "form">("table");

  // Archive tree
  const [tree, setTree] = useState<ReportsTree>({});
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // UI state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportingDept, setExportingDept] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Add employee dialog
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");

  const loadTree = useCallback(async () => {
    const res = await fetch(API, { headers: await authHeaders() });
    if (res.ok) {
      const data: ReportsTree = await res.json();
      setTree(data);
      const years = Object.keys(data);
      setExpandedYears(new Set(years.slice(0, 1)));
      if (years.length > 0) {
        const firstYear = years[0];
        const months = Object.keys(data[firstYear]);
        setExpandedMonths(new Set(months.slice(0, 1).map((m) => `${firstYear}-${m}`)));
      }
    }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const updateCell = (id: number, field: keyof ReportRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    const maxId = rows.length > 0 ? Math.max(...rows.map((r) => r.id)) : 0;
    setRows((prev) => [...prev, { id: maxId + 1, serviceName: "", operation: "", group: "", executor: "", unit: "", result: "", comment: "" }]);
  };

  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));

  const newReport = () => {
    setRows(DEFAULT_ROWS);
    setMonth("март 2026");
    setDepartment("отдела мониторинга геологической информации Управления архива и фондов ФГБУ «Росгеолфонд»");
    setReportName("Отчёт за март");
    setEmployeeName("");
    setCurrentId(null);
  };

  const loadReport = async (id: number) => {
    setLoading(true);
    const res = await fetch(`${API}/${id}`, { headers: await authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows_data);
      setMonth(data.month_label);
      setDepartment(data.department);
      setReportName(data.name);
      setEmployeeName(data.employee_name || "");
      setCurrentId(id);
    }
    setLoading(false);
  };

  const saveReport = async () => {
    setSaving(true);
    const { year, month: monthNum } = parseMonthYear(month);
    const body = {
      name: reportName,
      report_year: year,
      report_month: monthNum,
      month_label: month,
      department,
      employee_name: employeeName,
      rows_data: rows,
    };
    const method = currentId ? "PUT" : "POST";
    const url = currentId ? `${API}/${currentId}` : API;
    const res = await fetch(url, {
      method,
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (!currentId) {
        const data = await res.json();
        setCurrentId(data.id);
      }
      setSaveMessage("Сохранено!");
      await loadTree();
    } else {
      setSaveMessage("Ошибка сохранения");
    }
    setSaving(false);
    setSaveDialogOpen(false);
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const deleteReport = async (id: number) => {
    await fetch(`${API}/${id}`, { method: "DELETE", headers: await authHeaders() });
    if (currentId === id) newReport();
    await loadTree();
  };

  // Export single employee report to Excel
  const exportToExcel = () => {
    const empLabel = employeeName ? ` — ${employeeName}` : "";
    const title = `Отчет к плану выполнения работ ${department} за ${month}${empLabel}`;
    const headers = COLUMNS.map((c) => c.label);
    const dataRows = rows.map((r) => [r.serviceName, r.operation, r.group, r.executor, r.unit, r.result, r.comment]);
    const wsData = [[title], [], headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    ws["!cols"] = [{ wch: 35 }, { wch: 40 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 35 }];
    ws["!rows"] = [{ hpt: 30 }, { hpt: 6 }, { hpt: 60 }];
    const wb = XLSX.utils.book_new();
    const sheetName = employeeName ? employeeName.slice(0, 31) : "Отчёт";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = employeeName
      ? `Отчёт_${employeeName.replace(/\s+/g, "_")}_${month.replace(" ", "_")}.xlsx`
      : `Отчёт_${month.replace(" ", "_")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export ALL employees for a given period (one sheet per employee)
  const exportDepartmentExcel = async (year: string, monthKey: string) => {
    setExportingDept(true);
    try {
      const yearNum = parseInt(year);
      const monthNum = parseInt(monthKey);
      const res = await fetch(`${API}/by-period?year=${yearNum}&month=${monthNum}`, {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        setSaveMessage("Ошибка загрузки данных для экспорта");
        setTimeout(() => setSaveMessage(""), 3000);
        return;
      }
      const reports: FullReport[] = await res.json();
      if (reports.length === 0) {
        setSaveMessage("Нет отчётов для экспорта");
        setTimeout(() => setSaveMessage(""), 3000);
        return;
      }

      const wb = XLSX.utils.book_new();
      const monthLabel = reports[0]?.month_label || `${MONTH_NAMES[monthNum]} ${year}`;
      const dept = reports[0]?.department || "";

      for (const report of reports) {
        const empName = report.employee_name || report.name;
        const sheetName = empName.slice(0, 31) || `Лист${reports.indexOf(report) + 1}`;

        const title = `Отчет к плану выполнения работ ${dept} за ${monthLabel}`;
        const empLine = report.employee_name ? `Сотрудник: ${report.employee_name}` : report.name;
        const headers = COLUMNS.map((c) => c.label);
        const dataRows = (report.rows_data || []).map((r) => [
          r.serviceName, r.operation, r.group, r.executor, r.unit, r.result, r.comment,
        ]);

        const wsData = [[title], [empLine], [], headers, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        ];
        ws["!cols"] = [{ wch: 35 }, { wch: 40 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 35 }];
        ws["!rows"] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 6 }, { hpt: 60 }];

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const fileName = `Отчёт_отдел_${monthLabel.replace(" ", "_")}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } finally {
      setExportingDept(false);
    }
  };

  // Create new employee report for existing period/department
  const createEmployeeReport = () => {
    if (!newEmployeeName.trim()) return;
    setRows(DEFAULT_ROWS.map((r) => ({ ...r, executor: newEmployeeName.trim() })));
    setEmployeeName(newEmployeeName.trim());
    setReportName(`Отчёт ${newEmployeeName.trim()} за ${month}`);
    setCurrentId(null);
    setAddEmployeeOpen(false);
    setNewEmployeeName("");
  };

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const s = new Set(prev);
      if (s.has(year)) { s.delete(year); } else { s.add(year); }
      return s;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const s = new Set(prev);
      if (s.has(key)) { s.delete(key); } else { s.add(key); }
      return s;
    });
  };

  const hasReports = Object.keys(tree).length > 0;

  return (
    <div className="flex gap-4 h-full">
      {/* ── Боковая панель — архив отчётов ─────────────────────────────────── */}
      <div className="w-60 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Архив</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={newReport}>
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
                    onClick={() => toggleYear(year)}
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
                            onClick={() => toggleMonth(treeKey)}
                            className="flex-1 flex items-center gap-1.5 pl-6 pr-2 py-1 hover:bg-muted/50 transition-colors"
                          >
                            <Icon name={expandedMonths.has(treeKey) ? "ChevronDown" : "ChevronRight"} size={11} className="text-muted-foreground shrink-0" />
                            <span className="text-[11px] text-muted-foreground">{MONTH_NAMES[monthNum] || monthKey}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground/60">{reportsInMonth.length}</span>
                          </button>
                          {/* Export department button */}
                          <button
                            onClick={() => exportDepartmentExcel(year, monthKey)}
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
                                onClick={() => loadReport(r.id)}
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
                                  onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                >
                                  <Icon name="X" size={11} />
                                </button>
                              </div>
                            ))}

                            {/* Add employee button */}
                            <button
                              onClick={() => {
                                // Pre-fill month from the first report in this period
                                if (reportsInMonth.length > 0) {
                                  setMonth(reportsInMonth[0].month_label);
                                  setDepartment(reportsInMonth[0].department);
                                }
                                setAddEmployeeOpen(true);
                              }}
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

      {/* ── Основная область — редактор отчёта ─────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Тулбар */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Период</label>
              <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="март 2026" className="h-8 text-sm w-[160px]" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted-foreground font-medium">Отдел / организация</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Название отдела" className="h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1 w-[200px]">
              <label className="text-xs text-muted-foreground font-medium">Сотрудник</label>
              <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="ФИО сотрудника" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveMessage && <span className="text-xs text-green-600 font-medium">{saveMessage}</span>}

            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("table")}
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
                onClick={() => setViewMode("form")}
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

            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} className="gap-1.5 h-8">
              <Icon name="Save" size={14} />
              {currentId ? "Обновить" : "Сохранить"}
            </Button>
            <Button size="sm" onClick={exportToExcel} className="gap-1.5 h-8">
              <Icon name="Download" size={14} />
              Excel
            </Button>
          </div>
        </div>

        {/* Диалог сохранения */}
        {saveDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSaveDialogOpen(false)}>
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
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Отчёт за март"
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveReport(); if (e.key === "Escape") setSaveDialogOpen(false); }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Сотрудник (ФИО)</label>
                  <Input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Иванов И.И."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSaveDialogOpen(false)}>Отмена</Button>
                <Button size="sm" onClick={saveReport} disabled={saving} className="gap-1.5">
                  {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
                  Сохранить
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Диалог добавления сотрудника */}
        {addEmployeeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAddEmployeeOpen(false)}>
            <div className="bg-card rounded-xl border shadow-lg p-5 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="text-sm font-semibold mb-1">Новый сотрудник</h3>
                <p className="text-xs text-muted-foreground">Создать новый отчёт для сотрудника за период <strong>{month}</strong></p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">ФИО сотрудника</label>
                <Input
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="Иванов И.И."
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") createEmployeeReport(); if (e.key === "Escape") setAddEmployeeOpen(false); }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAddEmployeeOpen(false)}>Отмена</Button>
                <Button size="sm" onClick={createEmployeeReport} disabled={!newEmployeeName.trim()} className="gap-1.5">
                  <Icon name="UserPlus" size={13} />
                  Создать
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Employee badge */}
        {employeeName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 w-fit">
            <Icon name="User" size={13} className="text-primary" />
            <span className="text-xs font-medium text-primary">{employeeName}</span>
            {currentId && (
              <span className="text-[10px] text-muted-foreground ml-1">— {reportName}</span>
            )}
          </div>
        )}

        {/* ── TABLE MODE ─────────────────────────────────────────────────────── */}
        {viewMode === "table" && (
          <div className="rounded-lg border bg-card text-sm">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Отчет к плану выполнения работ {department} за {month}
                {employeeName && ` — ${employeeName}`}
              </p>
              {loading && <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground shrink-0 ml-2" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-muted/40">
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="border border-border px-2 py-2 text-[11px] font-semibold text-center align-middle leading-tight text-muted-foreground"
                        style={{ minWidth: col.wide ? 200 : 110 }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="border border-border px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                      <>
                        <td className="border border-border p-1 align-top">
                          <Textarea value={row.serviceName} onChange={(e) => updateCell(row.id, "serviceName", e.target.value)} className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full" placeholder="Наименование..." />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Textarea value={row.operation} onChange={(e) => updateCell(row.id, "operation", e.target.value)} className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full" placeholder="Операция..." />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input value={row.group} onChange={(e) => updateCell(row.id, "group", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Группа..." />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input value={row.executor} onChange={(e) => updateCell(row.id, "executor", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Исполнитель..." />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input value={row.unit} onChange={(e) => updateCell(row.id, "unit", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ед. изм..." />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input value={row.result} onChange={(e) => updateCell(row.id, "result", e.target.value)} className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Результат..." />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Textarea value={row.comment} onChange={(e) => updateCell(row.id, "comment", e.target.value)} className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full" placeholder="Комментарий..." />
                        </td>
                      </>
                      <td className="border border-border p-1 align-middle text-center">
                        <button onClick={() => removeRow(row.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                          <Icon name="X" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 border-t">
              <Button variant="ghost" size="sm" onClick={addRow} className="gap-1.5 text-xs h-7">
                <Icon name="Plus" size={13} />
                Добавить строку
              </Button>
            </div>
          </div>
        )}

        {/* ── FORM / CARDS MODE ──────────────────────────────────────────────── */}
        {viewMode === "form" && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 px-4 py-2.5 flex items-center gap-2">
              {loading && <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground" />}
              <p className="text-[11px] text-muted-foreground">
                Отчет к плану выполнения работ <strong>{department}</strong> за <strong>{month}</strong>
                {employeeName && <> — <strong>{employeeName}</strong></>}
              </p>
            </div>

            {rows.map((row, index) => (
              <RowFormCard
                key={row.id}
                row={row}
                index={index}
                onUpdate={updateCell}
                onRemove={removeRow}
              />
            ))}

            <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 text-xs w-full border-dashed">
              <Icon name="Plus" size={13} />
              Добавить запись
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
