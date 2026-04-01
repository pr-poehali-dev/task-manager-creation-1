import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import * as XLSX from "xlsx";

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
  {
    id: 2,
    serviceName: "",
    operation: "2. Проверка и визирование бумажных справок, расчетов, иных писем",
    group: "",
    executor: "",
    unit: "справка/письмо",
    result: "148",
    comment: "",
  },
  {
    id: 3,
    serviceName: "",
    operation: "3. Составление проектов писем, редактура, распечатывание",
    group: "",
    executor: "",
    unit: "письмо",
    result: "7",
    comment: "",
  },
  {
    id: 4,
    serviceName: "",
    operation: "4. Совещания",
    group: "",
    executor: "",
    unit: "час",
    result: "6",
    comment: "",
  },
  {
    id: 5,
    serviceName: "",
    operation: '5. Составление договоров на платные услуги, выгрузка их в СЭД "Дело", работа с замечаниями по ним',
    group: "",
    executor: "",
    unit: "Договор",
    result: "3 договора в разработке",
    comment: "",
  },
  {
    id: 6,
    serviceName: "",
    operation: "6. Консультации по телефону и рабочей электронной почте по деятельности отдела",
    group: "",
    executor: "",
    unit: "час",
    result: "80",
    comment: "",
  },
  {
    id: 7,
    serviceName: "",
    operation: "7. Создание и обсуждение задач по доработке модуля по подготовке справок, решение локальных проблем и ошибок",
    group: "",
    executor: "",
    unit: "Задача/ошибка",
    result: "4/3",
    comment: "Ведется регулярное общение с разработчиками по доработке модуля и решению возникающих проблем",
  },
  {
    id: 8,
    serviceName: "",
    operation:
      "8. Внесение запросов и подготовка справок (по срочным и иным нестандартным запросам), подготовка справок о представлении, непредставлении и (или) нарушении представления геологической информации",
    group: "",
    executor: "",
    unit: "запрос/справка",
    result: "5/2",
    comment: "Совместные справки, справки для подготовки платного мониторинга и др",
  },
  {
    id: 9,
    serviceName: "",
    operation: "9. Проверка данных по платному мониторингу",
    group: "",
    executor: "",
    unit: "Таблица",
    result: "0",
    comment: "Пока работ не было",
  },
  {
    id: 10,
    serviceName: "",
    operation: "10. Оценка и составление плана по работам на сопоставление отчетов в ЕФГИ, разработка регламента и тестирование принципов работы",
    group: "",
    executor: "",
    unit: "час",
    result: "20",
    comment: "",
  },
  {
    id: 11,
    serviceName: "",
    operation: "11. Ведение таблиц по взаимодействию с отделами",
    group: "",
    executor: "",
    unit: "час",
    result: "4",
    comment: "Внесение данных о возможных ошибках в каталог, анализ таблицы бухгалтерии по оплаченным счетам, проверка внесенных",
  },
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

export default function ReportPage() {
  const [rows, setRows] = useState<ReportRow[]>(DEFAULT_ROWS);
  const [month, setMonth] = useState("март 2026");
  const [department, setDepartment] = useState(
    "отдела мониторинга геологической информации Управления архива и фондов ФГБУ «Росгеолфонд»"
  );

  const updateCell = (id: number, field: keyof ReportRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    const newId = Math.max(...rows.map((r) => r.id)) + 1;
    setRows((prev) => [
      ...prev,
      { id: newId, serviceName: "", operation: "", group: "", executor: "", unit: "", result: "", comment: "" },
    ]);
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const exportToExcel = () => {
    const title = `Отчет к плану выполнения работ ${department} за ${month}`;

    const headers = COLUMNS.map((c) => c.label);

    const dataRows = rows.map((r) => [
      r.serviceName,
      r.operation,
      r.group,
      r.executor,
      r.unit,
      r.result,
      r.comment,
    ]);

    const wsData = [[title], [], headers, ...dataRows];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

    ws["!cols"] = [
      { wch: 35 },
      { wch: 40 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 35 },
    ];

    ws["!rows"] = [{ hpt: 30 }, { hpt: 6 }, { hpt: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Отчёт");
    XLSX.writeFile(wb, `Отчёт_${month.replace(" ", "_")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-muted-foreground font-medium">Период</label>
            <Input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="март 2026"
              className="h-8 text-sm max-w-[180px]"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-muted-foreground font-medium">Отдел / организация</label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Название отдела"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button onClick={exportToExcel} className="gap-2 shrink-0 self-end" size="sm">
          <Icon name="Download" size={15} />
          Скачать Excel
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-sm">
        <div className="px-4 py-2.5 border-b bg-muted/30">
          <p className="text-[11px] text-muted-foreground text-center font-medium">
            Отчет к плану выполнения работ {department} за {month}
          </p>
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
                          <Textarea
                            value={row.serviceName}
                            onChange={(e) => updateCell(row.id, "serviceName", e.target.value)}
                            className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                            placeholder="Наименование..."
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Textarea
                            value={row.operation}
                            onChange={(e) => updateCell(row.id, "operation", e.target.value)}
                            className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                            placeholder="Операция..."
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            value={row.group}
                            onChange={(e) => updateCell(row.id, "group", e.target.value)}
                            className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Группа..."
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            value={row.executor}
                            onChange={(e) => updateCell(row.id, "executor", e.target.value)}
                            className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Исполнитель..."
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            value={row.unit}
                            onChange={(e) => updateCell(row.id, "unit", e.target.value)}
                            className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Ед. изм..."
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            value={row.result}
                            onChange={(e) => updateCell(row.id, "result", e.target.value)}
                            className="h-auto min-h-[60px] text-xs border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Результат..."
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Textarea
                            value={row.comment}
                            onChange={(e) => updateCell(row.id, "comment", e.target.value)}
                            className="min-h-[60px] text-xs resize-none border-0 bg-transparent p-1 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                            placeholder="Комментарий..."
                          />
                        </td>
                  </>
                  <td className="border border-border p-1 align-middle text-center">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
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
    </div>
  );
}