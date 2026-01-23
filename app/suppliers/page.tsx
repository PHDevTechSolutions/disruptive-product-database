"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarBottom } from "@/components/sidebar-bottom";
import { Button } from "@/components/ui/button";
import AddSupplier from "@/components/add-supplier";
import EditSupplier from "@/components/edit-supplier";
import DeleteSupplier from "@/components/delete-supplier";
import FilterSupplier, {
  SupplierFilterValues,
} from "@/components/filter-supplier";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Pencil, Trash2, Filter } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

type Supplier = {
  id: string;
  company: string;
  internalCode?: string;
  address: string;
  email?: string;
  website?: string;
  contacts?: {
    name: string;
    phone: string;
  }[];
  forteProducts?: string[];
  products?: string[];
  certificates?: string[];
  createdBy?: string | null;
  referenceID?: string | null;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

/* ---------------- Component ---------------- */
export default function Suppliers() {
  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [editSupplierOpen, setEditSupplierOpen] = useState(false);
  const [deleteSupplierOpen, setDeleteSupplierOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  /* 🔍 Search */
  const [search, setSearch] = useState("");

  /* 🧰 Filters */
  const [filters, setFilters] = useState<SupplierFilterValues>({
    company: "",
    internalCode: "",
    email: "",
    hasContacts: null,
  });

  /* 📄 Pagination */
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------- Auth / User ---------------- */
  useEffect(() => {
    if (userId === null) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    async function fetchUser() {
      try {
        const res = await fetch(`/api/users?id=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        setUser(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId, router]);

  /* ---------------- Fetch Suppliers (Realtime) ---------------- */
  useEffect(() => {
    const q = query(
      collection(db, "suppliers"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((s: any) => s.isActive !== false);

      setSuppliers(list as Supplier[]);
    });

    return () => unsub();
  }, []);

  /* ---------------- Reset Page on Search / Filter ---------------- */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters]);

  /* ---------------- Search + Filter Logic ---------------- */
  const filteredSuppliers = suppliers.filter((s) => {
    const keyword = search.toLowerCase();

    const searchMatch =
      s.company.toLowerCase().includes(keyword) ||
      s.internalCode?.toLowerCase().includes(keyword) ||
      s.address.toLowerCase().includes(keyword) ||
      s.email?.toLowerCase().includes(keyword) ||
      s.contacts?.some(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          c.phone.toLowerCase().includes(keyword)
      );

    const filterMatch =
      (!filters.company ||
        s.company.toLowerCase().includes(filters.company.toLowerCase())) &&
      (!filters.internalCode ||
        s.internalCode
          ?.toLowerCase()
          .includes(filters.internalCode.toLowerCase())) &&
      (!filters.email ||
        s.email?.toLowerCase().includes(filters.email.toLowerCase())) &&
      (filters.hasContacts === null ||
        (filters.hasContacts
          ? s.contacts && s.contacts.length > 0
          : !s.contacts || s.contacts.length === 0));

    return searchMatch && filterMatch;
  });

  /* ---------------- Pagination ---------------- */
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);

  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <SidebarLeft />
        <SidebarBottom />

        <main className="flex-1 p-6 space-y-6">
          <SidebarTrigger className="hidden md:flex" />

          {/* HEADER */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-semibold">Suppliers</h1>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 rounded-md border px-3 text-sm"
              />

              <Button
                variant="outline"
                onClick={() => setFilterOpen(true)}
                className="gap-1 cursor-pointer"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>

              <Button onClick={() => setAddSupplierOpen(true)} className="cursor-pointer">
                + Add Supplier
              </Button>
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded-md border overflow-x-auto">
            <div className="min-w-[1400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actions</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Internal Code</TableHead>
                    <TableHead>Full Address</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Contact Name(s)</TableHead>
                    <TableHead>Phone Number(s)</TableHead>
                    <TableHead>Forte Product(s)</TableHead>
                    <TableHead>Product(s)</TableHead>
                    <TableHead>Certificate(s)</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        No suppliers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSuppliers.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setEditSupplierOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setDeleteSupplierOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell>{s.company}</TableCell>
                        <TableCell>{s.internalCode || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {s.address}
                        </TableCell>
                        <TableCell>{s.email || "-"}</TableCell>
                        <TableCell>{s.website || "-"}</TableCell>
                        <TableCell>
                          {s.contacts?.map((c) => c.name).join(", ") || "-"}
                        </TableCell>
                        <TableCell>
                          {s.contacts?.map((c) => c.phone).join(", ") || "-"}
                        </TableCell>
                        <TableCell>
                          {s.forteProducts?.join(", ") || "-"}
                        </TableCell>
                        <TableCell>{s.products?.join(", ") || "-"}</TableCell>
                        <TableCell>
                          {s.certificates?.join(", ") || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* PAGINATION */}
              <div className="flex items-center justify-between p-4">
                <span className="text-sm">
                  Page {currentPage} of {totalPages || 1}
                </span>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODALS */}
      <AddSupplier open={addSupplierOpen} onOpenChange={setAddSupplierOpen} />

      <FilterSupplier
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onApply={setFilters}
      />

      {selectedSupplier && (
        <EditSupplier
          open={editSupplierOpen}
          onOpenChange={setEditSupplierOpen}
          supplier={selectedSupplier}
        />
      )}

      {selectedSupplier && (
        <DeleteSupplier
          open={deleteSupplierOpen}
          onOpenChange={setDeleteSupplierOpen}
          supplier={selectedSupplier}
        />
      )}
    </SidebarProvider>
  );
}
