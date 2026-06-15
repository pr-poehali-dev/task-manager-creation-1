export interface ExtraCost {
  label: string;
  amount: number;
}

export interface PaidService {
  id: number;
  serviceName: string;
  applicantName: string;
  applicantId: number | null;
  serviceCatalogId: number | null;
  hours: number;
  hourlyRate: number;
  isFixedPrice: boolean;
  fixedPrice: number | null;
  extraCosts: ExtraCost[];
  tagIds: number[];
  status: string;
  notes: string;
  contractDraftUrl: string | null;
  contractFinalUrl: string | null;
  serviceDate: string | null;
  total: number;
  createdAt: string;
}

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  isFixedPrice: boolean;
  fixedPrice: number | null;
  hourlyRate: number;
}

export interface Applicant {
  id: number;
  name: string;
  address: string;
  inn: string;
  contact: string;
}

export interface Tag {
  id: number;
  name: string;
}

export function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const VAT_RATE = 0.22;

export function calcTotal(s: Pick<PaidService, "isFixedPrice" | "fixedPrice" | "hours" | "hourlyRate" | "extraCosts">): number {
  const extra = (s.extraCosts || []).reduce((a, c) => a + Number(c.amount), 0);
  if (s.isFixedPrice) return Number(s.fixedPrice || 0) + extra;
  return Number(s.hours) * Number(s.hourlyRate) + extra;
}

export function calcVat(total: number): number {
  return total * VAT_RATE;
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  active: "Активна",
  completed: "Выполнена",
  cancelled: "Отменена",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};
