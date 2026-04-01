"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, X, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [roles, setRoles] = useState<any[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [cardScale, setCardScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("roleCardScale");
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [columns, setColumns] = useState(6);

  useEffect(() => {
    const saved = localStorage.getItem("roleCardScale");
    if (saved) setCardScale(parseFloat(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("roleCardScale", cardScale.toString());
  }, [cardScale]);

  useEffect(() => {
    const updateGridPagination = () => {
      if (!gridRef.current) return;

      const containerWidth = gridRef.current.offsetWidth;

      if (!containerWidth) return;

      const cardMinWidth = 220 * cardScale;
      const cols = Math.max(1, Math.floor(containerWidth / cardMinWidth));

      setColumns(cols);
      setItemsPerPage(cols * 4);
    };

    updateGridPagination();

    const timeout = setTimeout(updateGridPagination, 50);

    window.addEventListener("resize", updateGridPagination);

    return () => {
      window.removeEventListener("resize", updateGridPagination);
      clearTimeout(timeout);
    };
  }, [cardScale]);

  useEffect(() => {
    const handleFocus = () => {
      if (!gridRef.current) return;

      const containerWidth = gridRef.current.offsetWidth;
      if (!containerWidth) return;

      const cardMinWidth = 220 * cardScale;
      const cols = Math.max(1, Math.floor(containerWidth / cardMinWidth));

      setColumns(cols);
      setItemsPerPage(cols * 4);
    };

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [cardScale]);

  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    // TODO: Add roles data fetching logic here
    setLoading(false);
  }, [userId, router]);

  const searchedRoles = useMemo(() => {
    if (!searchTerm.trim()) return filteredRoles;
    const lower = searchTerm.toLowerCase();
    return filteredRoles.filter((role) =>
      role.name?.toLowerCase().includes(lower) ||
      role.description?.toLowerCase().includes(lower)
    );
  }, [searchTerm, filteredRoles]);

  const totalPages = Math.max(1, Math.ceil(searchedRoles.length / itemsPerPage));

  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchedRoles.slice(start, start + itemsPerPage);
  }, [searchedRoles, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filteredRoles]);

  const isFiltered = filteredRoles.length !== roles.length;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">

      {/* ── DESKTOP HEADER ── */}
      <div className="hidden md:flex flex-col gap-3 px-6 pt-6 pb-3 shrink-0 bg-white/80 backdrop-blur-md border-b">
        <SidebarTrigger />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Roles</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/add-role")}>+ Add Role</Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-white/70"
          />
          <div className="flex items-center gap-2 ml-auto text-sm text-gray-500">
            <button onClick={() => setCardScale(p => Math.max(p - 0.1, 0.6))} className="text-lg font-bold px-1">−</button>
            <span className="w-10 text-center text-xs">{(cardScale * 100).toFixed(0)}%</span>
            <button onClick={() => setCardScale(p => Math.min(p + 0.1, 1.6))} className="text-lg font-bold px-1">+</button>
          </div>
        </div>
      </div>

      {/* ── MOBILE HEADER ── */}
      <div className="md:hidden shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Roles</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/add-role")}
              className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white/70 border-gray-200 rounded-xl text-sm"
            />
          </div>
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="relative h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {isFiltered && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{searchedRoles.length} roles</span>
          <div className="flex items-center gap-2 bg-white/60 rounded-lg px-2.5 py-1">
            <button onClick={() => setCardScale(p => Math.max(p - 0.1, 0.6))} className="text-gray-600 font-bold text-sm">−</button>
            <span className="text-xs text-gray-500 w-7 text-center">{(cardScale * 100).toFixed(0)}%</span>
            <button onClick={() => setCardScale(p => Math.min(p + 0.1, 1.6))} className="text-gray-600 font-bold text-sm">+</button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">

        {/* ── ROLES GRID AREA ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
            </div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 py-3 border-t bg-white/70 backdrop-blur-sm shrink-0 px-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-600">{currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-3 md:px-6 pt-3 pb-24 md:pb-4">
                {paginatedRoles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-14 w-14 rounded-full bg-white/60 flex items-center justify-center mb-3">
                      <Search className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No roles found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div
                    ref={gridRef}
                    className="grid gap-3 md:gap-4 w-full"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                  >
                    {/* TODO: Add role cards here */}
                    <div className="text-center py-10 text-gray-400">
                      Role cards will be displayed here
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>


        {/* ── MOBILE FILTER — RIGHT SIDE DRAWER ── */}
        <div
          className={`
            md:hidden absolute inset-0 z-30
            bg-black/30 backdrop-blur-[1px]
            transition-opacity duration-300
            ${mobileFilterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
          onClick={() => setMobileFilterOpen(false)}
        />

        <div
          className={`
            md:hidden absolute top-0 right-0 bottom-0 z-40
            w-[82%] flex flex-col
            bg-white shadow-2xl
            transition-transform duration-300 ease-in-out
            ${mobileFilterOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-600" />
              <h2 className="font-bold text-sm">Filters</h2>
              {isFiltered && (
                <span className="text-[10px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                  ON
                </span>
              )}
            </div>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scrollable filter body */}
          <div className="flex-1 overflow-y-auto">
            {/* TODO: Add mobile role filtering component */}
            <div className="text-center text-gray-400 py-10">
              Mobile role filters will be displayed here
            </div>
          </div>

          {/* Footer: results count + close */}
          <div
            className="px-3 py-3 border-t bg-white shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="w-full h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold"
            >
              Show {filteredRoles.length} Role{filteredRoles.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}