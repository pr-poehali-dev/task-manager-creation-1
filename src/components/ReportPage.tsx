import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import funcUrls from "../../backend/func2url.json";
import { authHeaders } from "@/lib/auth";
import {
  ReportRow,
  SavedReport,
  ReportsTree,
  FullReport,
  DEFAULT_ROWS,
  COLUMNS,
  MONTH_NAMES,
  parseMonthYear,
} from "./report/ReportTypes";
import ReportArchiveSidebar from "./report/ReportArchiveSidebar";
import ReportEditorToolbar from "./report/ReportEditorToolbar";
import ReportEditorContent from "./report/ReportEditorContent";

const API = funcUrls["reports-api"];

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

  const handleOpenAddEmployee = (reportsInMonth: SavedReport[]) => {
    // Pre-fill month from the first report in this period
    if (reportsInMonth.length > 0) {
      setMonth(reportsInMonth[0].month_label);
      setDepartment(reportsInMonth[0].department);
    }
    setAddEmployeeOpen(true);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* ── Боковая панель — архив отчётов ─────────────────────────────────── */}
      <ReportArchiveSidebar
        tree={tree}
        currentId={currentId}
        expandedYears={expandedYears}
        expandedMonths={expandedMonths}
        exportingDept={exportingDept}
        onNewReport={newReport}
        onLoadReport={loadReport}
        onDeleteReport={deleteReport}
        onToggleYear={toggleYear}
        onToggleMonth={toggleMonth}
        onExportDepartmentExcel={exportDepartmentExcel}
        onOpenAddEmployee={handleOpenAddEmployee}
      />

      {/* ── Основная область — редактор отчёта ─────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        <ReportEditorToolbar
          month={month}
          department={department}
          employeeName={employeeName}
          reportName={reportName}
          currentId={currentId}
          viewMode={viewMode}
          saving={saving}
          saveMessage={saveMessage}
          saveDialogOpen={saveDialogOpen}
          addEmployeeOpen={addEmployeeOpen}
          newEmployeeName={newEmployeeName}
          onMonthChange={setMonth}
          onDepartmentChange={setDepartment}
          onEmployeeNameChange={setEmployeeName}
          onReportNameChange={setReportName}
          onViewModeChange={setViewMode}
          onOpenSaveDialog={() => setSaveDialogOpen(true)}
          onCloseSaveDialog={() => setSaveDialogOpen(false)}
          onSaveReport={saveReport}
          onExportToExcel={exportToExcel}
          onCloseAddEmployee={() => setAddEmployeeOpen(false)}
          onNewEmployeeNameChange={setNewEmployeeName}
          onCreateEmployeeReport={createEmployeeReport}
        />

        <ReportEditorContent
          rows={rows}
          department={department}
          month={month}
          employeeName={employeeName}
          currentId={currentId}
          reportName={reportName}
          viewMode={viewMode}
          loading={loading}
          onUpdateCell={updateCell}
          onAddRow={addRow}
          onRemoveRow={removeRow}
        />
      </div>
    </div>
  );
}
