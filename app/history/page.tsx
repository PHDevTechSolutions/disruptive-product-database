"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Search, RefreshCw, Eye, Building2, Package, Filter,
  ChevronLeft, ChevronRight, Layers, Tag,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
  Timestamp,
} from "firebase/firestore";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

type AuditLog = {
  id: string;
  whatHappened: string;
  performedBy?: string;
  performedByName?: string;
  referenceID?: string;
  // Supplier
  supplierId?: string;
  supplierbrandId?: string;
  company?: string;
  supplierBrand?: string;
  // Product
  productId?: string;
  productReferenceID?: string;
  productClass?: string;
  pricePoint?: string;
  supplier?: { company?: string; supplierBrand?: string };
  // Product Family
  productFamilyId?: string;
  productFamilyName?: string;
  productUsageId?: string;
  // Product Usage
  productUsageName?: string;
  // Bulk
  inserted?: number;
  reactivated?: number;
  skipped?: number;
  overwritten?: number;
  // Meta
  date_updated?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  _raw?: Record<string, any>;
};

type CollectionTab = "suppliers" | "products" | "productFamilies" | "productUsages";

const PAGE_SIZE = 20;

/* ─────────────────────────────────────────────
   Collection map
───────────────────────────────────────────── */
const COL_MAP: Record<CollectionTab, string> = {
  suppliers     : "auditLogs_suppliers",
  products      : "auditLogs_products",
  productFamilies: "auditLogs_productFamilies",
  productUsages : "auditLogs_productUsages",
};

/* ─────────────────────────────────────────────
   Action color map
───────────────────────────────────────────── */
const ACTION_COLORS: Record<string, string> = {
  "Supplier Added"         : "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Supplier Edited"        : "bg-blue-100 text-blue-700 border-blue-200",
  "Supplier Deleted"       : "bg-red-100 text-red-700 border-red-200",
  "Supplier Reactivated"   : "bg-amber-100 text-amber-700 border-amber-200",
  "Supplier Bulk Upload"   : "bg-orange-100 text-orange-700 border-orange-200",
  "Product Added"          : "bg-violet-100 text-violet-700 border-violet-200",
  "Product Edited"         : "bg-sky-100 text-sky-700 border-sky-200",
  "Product Deleted"        : "bg-rose-100 text-rose-700 border-rose-200",
  "Product Bulk Upload"    : "bg-purple-100 text-purple-700 border-purple-200",
  "Product Family Added"   : "bg-teal-100 text-teal-700 border-teal-200",
  "Product Family Edited"  : "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Product Family Deleted" : "bg-pink-100 text-pink-700 border-pink-200",
  "Product Usage Added"    : "bg-lime-100 text-lime-700 border-lime-200",
  "Product Usage Edited"   : "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Product Usage Deleted"  : "bg-red-100 text-red-700 border-red-200",
};

const ACTION_OPTIONS: Record<CollectionTab, string[]> = {
  suppliers: [
    "Supplier Added", "Supplier Edited", "Supplier Deleted",
    "Supplier Reactivated", "Supplier Bulk Upload",
  ],
  products: [
    "Product Added", "Product Edited", "Product Deleted", "Product Bulk Upload",
  ],
  productFamilies: [
    "Product Family Added", "Product Family Edited", "Product Family Deleted",
  ],
  productUsages: [
    "Product Usage Added", "Product Usage Edited", "Product Usage Deleted",
  ],
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const formatTimestamp = (ts?: Timestamp): string => {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleString("en-PH", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return "—"; }
};

const getDisplayTime = (log: AuditLog): Timestamp | undefined =>
  log.date_updated ?? log.updatedAt ?? log.createdAt;

/* ─────────────────────────────────────────────
   Name cache
───────────────────────────────────────────── */
const nameCache = new Map<string, string>();

async function resolveNames(referenceIDs: string[]): Promise<void> {
  const unresolved = referenceIDs.filter((id) => id && !nameCache.has(id));
  if (!unresolved.length) return;

  await Promise.allSettled(
    unresolved.map(async (refId) => {
      try {
        let user: any = null;

        const r1 = await fetch(`/api/users?referenceID=${encodeURIComponent(refId)}`);
        if (r1.ok) {
          const d1 = await r1.json();
          const c1 = Array.isArray(d1) ? d1[0] : d1;
          if (c1?.Firstname) user = c1;
        }

        if (!user) {
          const r2 = await fetch(`/api/users?ReferenceID=${encodeURIComponent(refId)}`);
          if (r2.ok) {
            const d2 = await r2.json();
            const c2 = Array.isArray(d2) ? d2[0] : d2;
            if (c2?.Firstname) user = c2;
          }
        }

        nameCache.set(
          refId,
          user?.Firstname
            ? `${user.Firstname} ${user.Lastname ?? ""}`.trim()
            : refId,
        );
      } catch {
        nameCache.set(refId, refId);
      }
    }),
  );
}

/* ─────────────────────────────────────────────
   Detail Sheet
───────────────────────────────────────────── */
function LogDetailSheet({
  log, open, onClose,
}: {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!log) return null;
  const raw = log._raw ?? {};
  const skip = new Set(["_raw"]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit Log Detail</SheetTitle>
          <SheetDescription>Full snapshot of this event</SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium w-36 shrink-0 text-muted-foreground">Action</span>
            <Badge variant="outline" className={cn("text-xs", ACTION_COLORS[log.whatHappened] ?? "bg-gray-100 text-gray-700")}>
              {log.whatHappened}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium w-36 shrink-0 text-muted-foreground">Timestamp</span>
            <span>{formatTimestamp(getDisplayTime(log))}</span>
          </div>
          {log.performedBy && (
            <div className="flex items-center gap-2">
              <span className="font-medium w-36 shrink-0 text-muted-foreground">Performed By</span>
              <span>{log.performedByName || log.performedBy}</span>
            </div>
          )}
          <Separator />
          {Object.entries(raw)
            .filter(([k]) => !skip.has(k) && k !== "whatHappened" && k !== "date_updated" && k !== "createdAt" && k !== "updatedAt")
            .map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="font-medium w-36 shrink-0 text-muted-foreground capitalize">
                  {k.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span className="break-all text-xs text-gray-700">
                  {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                </span>
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Generic tab state
───────────────────────────────────────────── */
type TabState = {
  logs: AuditLog[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  page: number;
  search: string;
  actionFilter: string;
};

const initTabState = (): TabState => ({
  logs: [], cursor: null, hasMore: true, page: 1, search: "", actionFilter: "all",
});

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function HistoryPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CollectionTab>("suppliers");
  const [fetching, setFetching] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [nameVersion, setNameVersion] = useState(0);

  const [tabStates, setTabStates] = useState<Record<CollectionTab, TabState>>({
    suppliers     : initTabState(),
    products      : initTabState(),
    productFamilies: initTabState(),
    productUsages : initTabState(),
  });

  const updateTab = (tab: CollectionTab, patch: Partial<TabState>) =>
    setTabStates((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));

  /* ── Fetch user ── */
  useEffect(() => {
    if (userId === null) return;
    if (!userId) { router.push("/login"); return; }
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUser(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, router]);

  /* ── Generic fetch logs ── */
  const fetchLogs = useCallback(async (
    tab: CollectionTab,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    actionFilter: string,
  ): Promise<{ logs: AuditLog[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> => {
    const colName = COL_MAP[tab];

    let q = query(collection(db, colName), orderBy("date_updated", "desc"), limit(PAGE_SIZE + 1));

    if (actionFilter !== "all") {
      q = query(collection(db, colName), where("whatHappened", "==", actionFilter), orderBy("date_updated", "desc"), limit(PAGE_SIZE + 1));
    }

    if (cursor) {
      q = query(
        collection(db, colName),
        ...(actionFilter !== "all" ? [where("whatHappened", "==", actionFilter)] : []),
        orderBy("date_updated", "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE + 1),
      );
    }

    const snap = await getDocs(q);
    const docs = snap.docs;
    const hasMore = docs.length > PAGE_SIZE;
    const sliced = docs.slice(0, PAGE_SIZE);
    const lastDoc = sliced[sliced.length - 1] ?? null;

    const logs: AuditLog[] = sliced.map((d) => {
      const raw = d.data() as Record<string, any>;
      const refId = raw.referenceID ?? raw.performedBy ?? raw.updatedByReferenceID ?? "";
      return {
        id               : d.id,
        whatHappened     : raw.whatHappened ?? "Unknown",
        performedBy      : refId,
        performedByName  : nameCache.get(refId) ?? "",
        referenceID      : raw.referenceID ?? "",
        supplierId       : raw.supplierId ?? "",
        supplierbrandId  : raw.supplierbrandId ?? "",
        company          : raw.company ?? "",
        supplierBrand    : raw.supplierBrand ?? "",
        productId        : raw.productId ?? "",
        productReferenceID: raw.productReferenceID ?? "",
        productClass     : raw.productClass ?? "",
        pricePoint       : raw.pricePoint ?? "",
        supplier         : raw.supplier ?? null,
        productFamilyId  : raw.productFamilyId ?? "",
        productFamilyName: raw.productFamilyName ?? "",
        categoryTypeId   : raw.categoryTypeId ?? "",
        productUsageId   : raw.productUsageId ?? "",
        productUsageName : raw.productUsageName ?? "",
        inserted         : raw.inserted,
        reactivated      : raw.reactivated,
        skipped          : raw.skipped,
        overwritten      : raw.overwritten,
        date_updated     : raw.date_updated,
        createdAt        : raw.createdAt,
        updatedAt        : raw.updatedAt,
        _raw             : raw,
      };
    });

    const refIds = [...new Set(logs.map((l) => l.performedBy ?? "").filter(Boolean))];
    await resolveNames(refIds);
    logs.forEach((log) => {
      if (log.performedBy) log.performedByName = nameCache.get(log.performedBy) ?? log.performedBy;
    });

    return { logs, lastDoc, hasMore };
  }, []);

  /* ── Load tab on filter/mount ── */
  const loadTab = useCallback(async (tab: CollectionTab, actionFilter: string) => {
    if (!userId) return;
    setFetching(true);
    try {
      const { logs, lastDoc, hasMore } = await fetchLogs(tab, null, actionFilter);
      updateTab(tab, { logs, cursor: lastDoc, hasMore, page: 1 });
      setNameVersion((v) => v + 1);
    } finally { setFetching(false); }
  }, [userId, fetchLogs]);

  /* ── Auto-load each tab when filter changes ── */
  useEffect(() => { loadTab("suppliers", tabStates.suppliers.actionFilter); }, [userId, tabStates.suppliers.actionFilter]); // eslint-disable-line
  useEffect(() => { loadTab("products", tabStates.products.actionFilter); }, [userId, tabStates.products.actionFilter]); // eslint-disable-line
  useEffect(() => { loadTab("productFamilies", tabStates.productFamilies.actionFilter); }, [userId, tabStates.productFamilies.actionFilter]); // eslint-disable-line
  useEffect(() => { loadTab("productUsages", tabStates.productUsages.actionFilter); }, [userId, tabStates.productUsages.actionFilter]); // eslint-disable-line

  /* ── Next page ── */
  const loadNextPage = async (tab: CollectionTab) => {
    setFetching(true);
    try {
      const { cursor, actionFilter } = tabStates[tab];
      const { logs, lastDoc, hasMore } = await fetchLogs(tab, cursor, actionFilter);
      updateTab(tab, { logs, cursor: lastDoc, hasMore, page: tabStates[tab].page + 1 });
      setNameVersion((v) => v + 1);
    } finally { setFetching(false); }
  };

  /* ── Helpers ── */
  const ActionBadge = ({ action }: { action: string }) => (
    <Badge variant="outline" className={cn("text-xs whitespace-nowrap", ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700 border-gray-200")}>
      {action}
    </Badge>
  );

  const displayName = (log: AuditLog) => log.performedByName || log.performedBy || "—";

  const EyeButton = ({ log }: { log: AuditLog }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSelectedLog(log); setDetailOpen(true); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View details</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const PaginationBar = ({ tab }: { tab: CollectionTab }) => {
    const s = tabStates[tab];
    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Page {s.page}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={s.page === 1 || fetching}
            onClick={() => { updateTab(tab, { cursor: null, page: 1 }); loadTab(tab, s.actionFilter); }}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> First
          </Button>
          <Button size="sm" variant="outline" disabled={!s.hasMore || fetching} onClick={() => loadNextPage(tab)}>
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  const FilterBar = ({ tab, searchPlaceholder }: { tab: CollectionTab; searchPlaceholder: string }) => {
    const s = tabStates[tab];
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={s.search} onChange={(e) => updateTab(tab, { search: e.target.value })} placeholder={searchPlaceholder} className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={s.actionFilter} onValueChange={(v) => updateTab(tab, { actionFilter: v })}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTION_OPTIONS[tab].map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  /* ── Filtered logs per tab ── */
  const filtered = (tab: CollectionTab): AuditLog[] => {
    const { logs, search } = tabStates[tab];
    const q = search.toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      l.whatHappened?.toLowerCase().includes(q) ||
      l.performedByName?.toLowerCase().includes(q) ||
      l.performedBy?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.supplierBrand?.toLowerCase().includes(q) ||
      l.supplierId?.toLowerCase().includes(q) ||
      l.productReferenceID?.toLowerCase().includes(q) ||
      l.supplier?.company?.toLowerCase().includes(q) ||
      l.productClass?.toLowerCase().includes(q) ||
      l.productFamilyName?.toLowerCase().includes(q) ||
      l.productUsageName?.toLowerCase().includes(q),
    );
  };

  if (loading) return null;

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-y-auto">

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center gap-4">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-xl font-bold">Audit Trail</h1>
            <p className="text-xs text-muted-foreground">
              Welcome, {user?.Firstname} {user?.Lastname}
              <span className="ml-1 text-muted-foreground/70">({user?.Role})</span>
            </p>
          </div>
          <Button size="sm" variant="outline" disabled={fetching}
            onClick={() => {
              (["suppliers", "products", "productFamilies", "productUsages"] as CollectionTab[]).forEach((t) =>
                updateTab(t, { actionFilter: "all" }),
              );
            }}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", fetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* ── CONTENT ── */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CollectionTab)}>

            <TabsList className="mb-6">
              <TabsTrigger value="suppliers" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Products
              </TabsTrigger>
              <TabsTrigger value="productFamilies" className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Product Families
              </TabsTrigger>
              <TabsTrigger value="productUsages" className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Product Usage
              </TabsTrigger>
            </TabsList>

            {/* ════ SUPPLIERS ════ */}
            <TabsContent value="suppliers">
              <div className="space-y-4">
                <FilterBar tab="suppliers" searchPlaceholder="Search company, brand, name…" />
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100 border-b">
                        <TableHead className="text-xs w-44">Timestamp</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                        <TableHead className="text-xs">Company</TableHead>
                        <TableHead className="text-xs">Brand</TableHead>
                        <TableHead className="text-xs">Performed By</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetching ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
                      ) : filtered("suppliers").length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No audit logs found.</TableCell></TableRow>
                      ) : filtered("suppliers").map((log) => (
                        <TableRow key={log.id} className="bg-white hover:bg-gray-100 transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(getDisplayTime(log))}</TableCell>
                          <TableCell><ActionBadge action={log.whatHappened} /></TableCell>
                          <TableCell className="font-medium text-sm">{log.company || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.supplierBrand || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{displayName(log)}</TableCell>
                          <TableCell><EyeButton log={log} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar tab="suppliers" />
              </div>
            </TabsContent>

            {/* ════ PRODUCTS ════ */}
            <TabsContent value="products">
              <div className="space-y-4">
                <FilterBar tab="products" searchPlaceholder="Search ref ID, company, name…" />
                <div className="rounded-md border overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs w-44">Timestamp</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                        <TableHead className="text-xs">Ref ID</TableHead>
                        <TableHead className="text-xs">Supplier</TableHead>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-xs">Performed By</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetching ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
                      ) : filtered("products").length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No audit logs found.</TableCell></TableRow>
                      ) : filtered("products").map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(getDisplayTime(log))}</TableCell>
                          <TableCell><ActionBadge action={log.whatHappened} /></TableCell>
                          <TableCell className="font-medium text-xs font-mono">{log.productReferenceID || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.supplier?.company || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {log.productClass && <Badge variant="secondary" className="text-xs">{log.productClass}</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{displayName(log)}</TableCell>
                          <TableCell><EyeButton log={log} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar tab="products" />
              </div>
            </TabsContent>

            {/* ════ PRODUCT FAMILIES ════ */}
            <TabsContent value="productFamilies">
              <div className="space-y-4">
                <FilterBar tab="productFamilies" searchPlaceholder="Search family name…" />
                <div className="rounded-md border overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs w-44">Timestamp</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                        <TableHead className="text-xs">Family Name</TableHead>
                        <TableHead className="text-xs">Performed By</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetching ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
                      ) : filtered("productFamilies").length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No audit logs found.</TableCell></TableRow>
                      ) : filtered("productFamilies").map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(getDisplayTime(log))}</TableCell>
                          <TableCell><ActionBadge action={log.whatHappened} /></TableCell>
                          <TableCell className="font-medium text-sm">{log.productFamilyName || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{displayName(log)}</TableCell>
                          <TableCell><EyeButton log={log} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar tab="productFamilies" />
              </div>
            </TabsContent>

            {/* ════ CATEGORY TYPES ════ */}
            <TabsContent value="productUsages">
              <div className="space-y-4">
                <FilterBar tab="productUsages" searchPlaceholder="Search category name…" />
                <div className="rounded-md border overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs w-44">Timestamp</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                        <TableHead className="text-xs">Product Usage Name</TableHead>
                        <TableHead className="text-xs">Performed By</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetching ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
                      ) : filtered("productUsages").length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No audit logs found.</TableCell></TableRow>
                      ) : filtered("productUsages").map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(getDisplayTime(log))}</TableCell>
                          <TableCell><ActionBadge action={log.whatHappened} /></TableCell>
                          <TableCell className="font-medium text-sm">{log.productUsageName || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{displayName(log)}</TableCell>
                          <TableCell><EyeButton log={log} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar tab="productUsages" />
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      <LogDetailSheet log={selectedLog} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
