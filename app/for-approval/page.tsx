"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

type CurrentUser = {
  Role?: string;
};

type ApprovalItem = {
  id: string;
  requestType: string;
  requestedBy: string;
  dateRequested: string;
  status: string;
};

const SAMPLE_APPROVALS: ApprovalItem[] = [];

export default function ForApprovalPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    if (userId === null) return;
    const currentUserId = userId;

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    async function fetchCurrentUser() {
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(currentUserId)}`);
        if (!res.ok) {
          if (!cancelled) {
            setAccessDenied(true);
            setLoading(false);
          }
          return;
        }

        const data: CurrentUser = await res.json();
        if (cancelled) return;

        const isManager = data.Role === "Manager";

        if (!isManager) {
          setAccessDenied(true);
        }
      } catch {
        if (!cancelled) {
          setAccessDenied(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  const filteredItems = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return SAMPLE_APPROVALS;

    return SAMPLE_APPROVALS.filter((item) => {
      return (
        item.requestType.toLowerCase().includes(keyword) ||
        item.requestedBy.toLowerCase().includes(keyword) ||
        item.status.toLowerCase().includes(keyword)
      );
    });
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You do not have permission to access this page. Only Managers can view this page.
            </p>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <div className="hidden md:flex flex-col gap-3 px-6 pt-6 pb-3 shrink-0 bg-white/80 backdrop-blur-md border-b">
        <SidebarTrigger />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold shrink-0">For Approval</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              type="text"
              placeholder="Search approvals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 bg-white/70"
            />
            <Button variant="outline" className="gap-1" disabled>
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-white/70 backdrop-blur-md border-b shrink-0">
        <span className="text-sm text-gray-500">
          Page {currentPage} of {totalPages} · {filteredItems.length} items
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="hidden md:block flex-1 min-h-0 overflow-auto bg-white/60 backdrop-blur-sm">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-red-50/80 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              <th className="text-left font-bold px-3 py-3 border-b whitespace-nowrap">Request Type</th>
              <th className="text-left font-bold px-3 py-3 border-b whitespace-nowrap">Requested By</th>
              <th className="text-center font-bold px-3 py-3 border-b whitespace-nowrap">Date Requested</th>
              <th className="text-center font-bold px-3 py-3 border-b whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-muted-foreground">
                  No pending approvals yet.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-white/60 align-middle">
                  <td className="px-3 py-3">{item.requestType}</td>
                  <td className="px-3 py-3">{item.requestedBy}</td>
                  <td className="px-3 py-3 text-center">{item.dateRequested}</td>
                  <td className="px-3 py-3 text-center">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white/50">
        {paginatedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-center text-sm text-gray-500">
            No pending approvals yet.
          </div>
        ) : (
          paginatedItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm space-y-1.5">
              <p className="text-sm font-semibold text-gray-900">{item.requestType}</p>
              <p className="text-xs text-gray-500">{item.requestedBy}</p>
              <p className="text-xs text-gray-500">{item.dateRequested}</p>
              <p className="text-xs font-medium text-gray-700">{item.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}