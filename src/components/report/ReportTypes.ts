import * as XLSX from "xlsx";

export const MONTH_NAMES: Record<number, string> = {
  1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
  5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
  9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
};

export interface ReportRow {
  id: number;
  serviceName: string;
  operation: string;
  group: string;
  executor: string;
  unit: string;
  result: string;
  comment: string;
}

export interface SavedReport {
  id: number;
  name: string;
  month_label: string;
  department: string;
  employee_name: string;
  created_at: string;
  updated_at: string;
}

// year → monthKey → reports[]
export type ReportsTree = Record<string, Record<string, SavedReport[]>>;

// Full report with rows data (for department export)
export interface FullReport extends SavedReport {
  report_year: number;
  report_month: number;
  rows_data: ReportRow[];
}

export const DEFAULT_ROWS: ReportRow[] = [
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

export const COLUMNS = [
  { key: "serviceName", label: "Наименование услуг, работ, выполняемых по государственному заданию, государственному контракту и иные виды работ", wide: true },
  { key: "operation", label: "Операции (действия) в рамках выполняемой работы (деление работ на подгруппы)", wide: true },
  { key: "group", label: "Группа в отделе, выполняющая работу", wide: false },
  { key: "executor", label: "Исполнитель операции", wide: false },
  { key: "unit", label: "Единица измерения", wide: false },
  { key: "result", label: "Результат выполнения операции в количественном выражении", wide: false },
  { key: "comment", label: "Комментарий", wide: true },
];

export const COLUMN_SHORT: Record<string, string> = {
  serviceName: "Наименование услуг / работ",
  operation: "Операции (действия)",
  group: "Группа в отделе",
  executor: "Исполнитель",
  unit: "Единица измерения",
  result: "Результат",
  comment: "Комментарий",
};

export function parseMonthYear(label: string): { year: number; month: number } {
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

export function buildEmployeeSheet(
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
