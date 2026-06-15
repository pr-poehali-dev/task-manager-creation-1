import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import funcUrls from "../../backend/func2url.json";
import { authHeaders } from "@/lib/auth";
import { PaidService, CatalogItem, Applicant, Tag } from "./paid/PaidServiceTypes";
import { ServiceForm } from "./paid/PaidServiceForm";
import { CatalogManager, ApplicantsManager, TagsManager } from "./paid/PaidServiceDirectories";
import PaidServicesList from "./paid/PaidServicesList";

const API = funcUrls["paid-services-api"];

export default function PaidServicesPage() {
  const [services, setServices] = useState<PaidService[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("services");

  // Service list state
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<PaidService | null>(null);
  const [searchStr, setSearchStr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const headers = authHeaders();
    const [sRes, cRes, aRes, tRes] = await Promise.all([
      fetch(API, { headers }),
      fetch(`${API}/catalog`, { headers }),
      fetch(`${API}/applicants`, { headers }),
      fetch(`${API}/tags`, { headers }),
    ]);
    if (sRes.ok) setServices(await sRes.json());
    if (cRes.ok) setCatalog(await cRes.json());
    if (aRes.ok) setApplicants(await aRes.json());
    if (tRes.ok) setTags(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const reloadServices = async () => {
    const res = await fetch(API, { headers: authHeaders() });
    if (res.ok) setServices(await res.json());
  };

  const handleSaveService = async (data: Partial<PaidService>) => {
    const method = editingService ? "PUT" : "POST";
    const url = editingService ? `${API}/${editingService.id}` : API;
    await fetch(url, {
      method,
      headers: { ...(authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setFormOpen(false);
    setEditingService(null);
    await reloadServices();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить услугу?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE", headers: authHeaders() });
    setServices(p => p.filter(s => s.id !== id));
  };

  const openEdit = (s: PaidService) => {
    setEditingService(s);
    setFormOpen(true);
  };

  const handleFileUploaded = (serviceId: number, fileType: "draft" | "final", url: string) => {
    setServices(prev => prev.map(x => {
      if (x.id !== serviceId) return x;
      return fileType === "draft"
        ? { ...x, contractDraftUrl: url }
        : { ...x, contractFinalUrl: url };
    }));
  };

  // Filtered list
  const filtered = services.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (dateFrom && s.serviceDate && s.serviceDate < dateFrom) return false;
    if (dateTo && s.serviceDate && s.serviceDate > dateTo) return false;
    if (searchStr) {
      const q = searchStr.toLowerCase();
      return s.serviceName.toLowerCase().includes(q) || s.applicantName.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Icon name="Loader2" size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1 bg-muted/50">
          <TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Receipt" size={14} /> Услуги
            {services.length > 0 && (
              <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {services.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="BookOpen" size={14} /> Справочник услуг
          </TabsTrigger>
          <TabsTrigger value="applicants" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Building2" size={14} /> Заявители
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-1.5 text-xs sm:text-sm">
            <Icon name="Tag" size={14} /> Теги
          </TabsTrigger>
        </TabsList>

        {/* ── SERVICES TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="services" className="space-y-3 mt-4">
          <PaidServicesList
            filtered={filtered}
            tags={tags}
            searchStr={searchStr}
            statusFilter={statusFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onSearchChange={setSearchStr}
            onStatusFilterChange={setStatusFilter}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onNew={() => { setEditingService(null); setFormOpen(true); }}
            onEdit={openEdit}
            onDelete={handleDelete}
            onFileUploaded={handleFileUploaded}
          />
        </TabsContent>

        {/* ── CATALOG TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="catalog" className="mt-4">
          <CatalogManager catalog={catalog} onRefresh={async () => {
            const res = await fetch(`${API}/catalog`, { headers: authHeaders() });
            if (res.ok) setCatalog(await res.json());
          }} />
        </TabsContent>

        {/* ── APPLICANTS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="applicants" className="mt-4">
          <ApplicantsManager applicants={applicants} onRefresh={async () => {
            const res = await fetch(`${API}/applicants`, { headers: authHeaders() });
            if (res.ok) setApplicants(await res.json());
          }} />
        </TabsContent>

        {/* ── TAGS TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="tags" className="mt-4">
          <TagsManager tags={tags} onRefresh={async () => {
            const res = await fetch(`${API}/tags`, { headers: authHeaders() });
            if (res.ok) setTags(await res.json());
          }} />
        </TabsContent>
      </Tabs>

      {/* Service Form Dialog */}
      {formOpen && (
        <Dialog open onOpenChange={() => { setFormOpen(false); setEditingService(null); }}>
          <ServiceForm
            service={editingService}
            catalog={catalog}
            applicants={applicants}
            tags={tags}
            onSave={handleSaveService}
            onClose={() => { setFormOpen(false); setEditingService(null); }}
          />
        </Dialog>
      )}
    </div>
  );
}
