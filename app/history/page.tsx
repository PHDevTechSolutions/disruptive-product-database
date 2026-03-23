"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Search, RefreshCw, Eye, Building2, Package, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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
  performedBy?: string;         // referenceID
  performedByName?: string;     // full name
  referenceID?: string;
  // Supplier-specific
  supplierId?: string;
  supplierbrandId?: string;
  company?: string;
  supplierBrand?: string;
  // Product-specific
  productId?: string;
  productReferenceID?: string;
  productClass?: string;
  pricePoint?: string;
  supplier?: { company?: string; supplierBrand?: string };
  // Bulk upload
  inserted?: number;
  reactivated?: number;
  skipped?: number;
  overwritten?: number;
  // Meta
  date_updated?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Raw snapshot for detail view
  _raw?: Record<string, any>;
};

type CollectionTab = "suppliers" | "products";

const PAGE_SIZE = 20;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const ACTION_COLORS: Record<string, string> = {
  "Supplier Added":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Supplier Edited":  "bg-blue-100 text-blue-700 border-blue-200",
  "Supplier Deleted": "bg-red-100 text-red-700 border-red-200",
  "Supplier Reactivated": "bg-amber-100 text-amber-700 border-amber-200",
  "Product Added":    "bg-violet-100 text-violet-700 border-violet-200",
  "Product Edited":   "bg-sky-100 text-sky-700 border-sky-200",
  "Product Deleted":  "bg-rose-100 text-rose-700 border-rose-200",
};

const formatTimestamp = (ts?: Timestamp): string => {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleString("en-PH", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return "—";
  }
};

const getDisplayTime = (log: AuditLog): Timestamp | undefined =>
  log.date_updated ?? log.updatedAt ?? log.createdAt;

/* ─────────────────────────────────────────────
   Detail Sheet
───────────────────────────────────────────── */
function LogDetailSheet({
  log,
  open,
  onClose,
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
            <Badge
              variant="outline"
              className={cn("text-xs", ACTION_COLORS[log.whatHappened] ?? "bg-gray-100 text-gray-700")}
            >
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

          {/* Dump remaining raw fields */}
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
   Main Page
───────────────────────────────────────────── */
export default function HistoryPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState<CollectionTab>("suppliers");

  /* ── Logs ── */
  const [supplierLogs, setSupplierLogs] = useState<AuditLog[]>([]);
  const [productLogs, setProductLogs] = useState<AuditLog[]>([]);

  /* ── Pagination cursors ── */
  const [supplierCursor, setSupplierCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [productCursor, setProductCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [supplierHasMore, setSupplierHasMore] = useState(true);
  const [productHasMore, setProductHasMore] = useState(true);
  const [supplierPage, setSupplierPage] = useState(1);
  const [productPage, setProductPage] = useState(1);

  /* ── Filters ── */
  const [supplierSearch, setSupplierSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [supplierActionFilter, setSupplierActionFilter] = useState("all");
  const [productActionFilter, setProductActionFilter] = useState("all");

  /* ── Detail sheet ── */
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* ── Fetching state ── */
  const [fetching, setFetching] = useState(false);

  /* ─────────────────────────────────────────
     Fetch User
  ───────────────────────────────────────── */
  useEffect(() => {
    if (userId === null) return;
    if (!userId) { router.push("/login"); return; }

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUser(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, router]);

  /* ─────────────────────────────────────────
     Fetch Logs — generic
  ───────────────────────────────────────── */
  const fetchLogs = useCallback(async (
    col: CollectionTab,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    actionFilter: string,
  ): Promise<{ logs: AuditLog[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> => {
    const colName = col === "suppliers" ? "auditLogs_suppliers" : "auditLogs_products";

    let q = query(
      collection(db, colName),
      orderBy("date_updated", "desc"),
      limit(PAGE_SIZE + 1),
    );

    if (actionFilter !== "all") {
      q = query(
        collection(db, colName),
        where("whatHappened", "==", actionFilter),
        orderBy("date_updated", "desc"),
        limit(PAGE_SIZE + 1),
      );
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
      return {
        id: d.id,
        whatHappened: raw.whatHappened ?? "Unknown",
        performedBy: raw.referenceID ?? raw.performedBy ?? raw.updatedByReferenceID ?? "",
        performedByName: raw.performedByName ?? "",
        referenceID: raw.referenceID ?? "",
        supplierId: raw.supplierId ?? "",
        supplierbrandId: raw.supplierbrandId ?? "",
        company: raw.company ?? "",
        supplierBrand: raw.supplierBrand ?? "",
        productId: raw.productId ?? "",
        productReferenceID: raw.productReferenceID ?? "",
        productClass: raw.productClass ?? "",
        pricePoint: raw.pricePoint ?? "",
        supplier: raw.supplier ?? null,
        inserted: raw.inserted,
        reactivated: raw.reactivated,
        skipped: raw.skipped,
        overwritten: raw.overwritten,
        date_updated: raw.date_updated,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        _raw: raw,
      };
    });

    return { logs, lastDoc, hasMore };
  }, []);

  /* ─────────────────────────────────────────
     Initial load
  ───────────────────────────────────────── */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setFetching(true);
      try {
        const { logs, lastDoc, hasMore } = await fetchLogs("suppliers", null, supplierActionFilter);
        setSupplierLogs(logs);
        setSupplierCursor(lastDoc);
        setSupplierHasMore(hasMore);
        setSupplierPage(1);
      } finally { setFetching(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supplierActionFilter]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setFetching(true);
      try {
        const { logs, lastDoc, hasMore } = await fetchLogs("products", null, productActionFilter);
        setProductLogs(logs);
        setProductCursor(lastDoc);
        setProductHasMore(hasMore);
        setProductPage(1);
      } finally { setFetching(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, productActionFilter]);

  /* ─────────────────────────────────────────
     Load Next Page
  ───────────────────────────────────────── */
  const loadNextPage = async (col: CollectionTab) => {
    setFetching(true);
    try {
      const cursor = col === "suppliers" ? supplierCursor : productCursor;
      const actionFilter = col === "suppliers" ? supplierActionFilter : productActionFilter;
      const { logs, lastDoc, hasMore } = await fetchLogs(col, cursor, actionFilter);
      if (col === "suppliers") {
        setSupplierLogs(logs);
        setSupplierCursor(lastDoc);
        setSupplierHasMore(hasMore);
        setSupplierPage((p) => p + 1);
      } else {
        setProductLogs(logs);
        setProductCursor(lastDoc);
        setProductHasMore(hasMore);
        setProductPage((p) => p + 1);
      }
    } finally { setFetching(false); }
  };

  /* ─────────────────────────────────────────
     Filtered (client-side search on current page)
  ───────────────────────────────────────── */
  const filteredSuppliers = supplierLogs.filter((l) => {
    const q = supplierSearch.toLowerCase();
    if (!q) return true;
    return (
      l.company?.toLowerCase().includes(q) ||
      l.supplierBrand?.toLowerCase().includes(q) ||
      l.whatHappened?.toLowerCase().includes(q) ||
      l.performedBy?.toLowerCase().includes(q) ||
      l.supplierId?.toLowerCase().includes(q)
    );
  });

  const filteredProducts = productLogs.filter((l) => {
    const q = productSearch.toLowerCase();
    if (!q) return true;
    return (
      l.productReferenceID?.toLowerCase().includes(q) ||
      l.whatHappened?.toLowerCase().includes(q) ||
      l.supplier?.company?.toLowerCase().includes(q) ||
      l.productClass?.toLowerCase().includes(q) ||
      l.performedBy?.toLowerCase().includes(q)
    );
  });

  /* ─────────────────────────────────────────
     Render helpers
  ───────────────────────────────────────── */
  const ActionBadge = ({ action }: { action: string }) => (
    <Badge
      variant="outline"
      className={cn("text-xs whitespace-nowrap", ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700 border-gray-200")}
    >
      {action}
    </Badge>
  );

  const renderSupplierRows = () =>
    filteredSuppliers.map((log) => (
      <TableRow key={log.id} className="bg-white hover:bg-gray-100 transition-colors">
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTimestamp(getDisplayTime(log))}
        </TableCell>
        <TableCell><ActionBadge action={log.whatHappened} /></TableCell>
        <TableCell className="font-medium text-sm">{log.company || "—"}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{log.supplierBrand || "—"}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{log.performedBy || "—"}</TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { setSelectedLog(log); setDetailOpen(true); }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      </TableRow>
    ));

  const renderProductRows = () =>
    filteredProducts.map((log) => (
      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTimestamp(getDisplayTime(log))}
        </TableCell>
        <TableCell><ActionBadge action={log.whatHappened} /></TableCell>
        <TableCell className="font-medium text-xs font-mono">{log.productReferenceID || "—"}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{log.supplier?.company || "—"}</TableCell>
        <TableCell className="text-xs">
          {log.productClass && (
            <Badge variant="secondary" className="text-xs">{log.productClass}</Badge>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{log.performedBy || "—"}</TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { setSelectedLog(log); setDetailOpen(true); }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      </TableRow>
    ));

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSupplierActionFilter("all");
              setProductActionFilter("all");
            }}
            disabled={fetching}
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
            </TabsList>

            {/* ════ SUPPLIERS TAB ════ */}
            <TabsContent value="suppliers">
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder="Search company, brand, ID…"
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <Select value={supplierActionFilter} onValueChange={setSupplierActionFilter}>
                      <SelectTrigger className="h-9 w-44">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="Supplier Added">Supplier Added</SelectItem>
                        <SelectItem value="Supplier Edited">Supplier Edited</SelectItem>
                        <SelectItem value="Supplier Deleted">Supplier Deleted</SelectItem>
                        <SelectItem value="Supplier Reactivated">Supplier Reactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table */}
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
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredSuppliers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                            No audit logs found.
                          </TableCell>
                        </TableRow>
                      ) : renderSupplierRows()}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Page {supplierPage}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={supplierPage === 1 || fetching}
                      onClick={() => {
                        setSupplierCursor(null);
                        setSupplierPage(1);
                        setSupplierActionFilter(supplierActionFilter);
                      }}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> First
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!supplierHasMore || fetching}
                      onClick={() => loadNextPage("suppliers")}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ════ PRODUCTS TAB ════ */}
            <TabsContent value="products">
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search ref ID, company, class…"
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <Select value={productActionFilter} onValueChange={setProductActionFilter}>
                      <SelectTrigger className="h-9 w-44">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="Product Added">Product Added</SelectItem>
                        <SelectItem value="Product Edited">Product Edited</SelectItem>
                        <SelectItem value="Product Deleted">Product Deleted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table */}
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
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                            No audit logs found.
                          </TableCell>
                        </TableRow>
                      ) : renderProductRows()}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Page {productPage}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={productPage === 1 || fetching}
                      onClick={() => {
                        setProductCursor(null);
                        setProductPage(1);
                        setProductActionFilter(productActionFilter);
                      }}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> First
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!productHasMore || fetching}
                      onClick={() => loadNextPage("products")}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* ── DETAIL SHEET ── */}
      <LogDetailSheet
        log={selectedLog}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
