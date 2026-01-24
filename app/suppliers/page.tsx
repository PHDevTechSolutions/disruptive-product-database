"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  addresses: string[];
  emails?: string[];
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
    null,
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
  const DESKTOP_ITEMS_PER_PAGE = 10;
  const MOBILE_ITEMS_PER_PAGE = 3;

  const [itemsPerPage, setItemsPerPage] = useState(DESKTOP_ITEMS_PER_PAGE);
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
    const q = query(collection(db, "suppliers"), orderBy("createdAt", "desc"));

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

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(
        window.innerWidth < 768
          ? MOBILE_ITEMS_PER_PAGE
          : DESKTOP_ITEMS_PER_PAGE,
      );
    };

    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------------- Search + Filter Logic ---------------- */
  const filteredSuppliers = suppliers.filter((s) => {
    const keyword = search.toLowerCase();

    const searchMatch =
      s.company.toLowerCase().includes(keyword) ||
      s.internalCode?.toLowerCase().includes(keyword) ||
      s.addresses?.some((a) => a.toLowerCase().includes(keyword)) ||
      s.emails?.some((e) => e.toLowerCase().includes(keyword)) ||
      s.contacts?.some(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          c.phone.toLowerCase().includes(keyword),
      );

    const filterMatch =
      (!filters.company ||
        s.company.toLowerCase().includes(filters.company.toLowerCase())) &&
      (!filters.internalCode ||
        s.internalCode
          ?.toLowerCase()
          .includes(filters.internalCode.toLowerCase())) &&
      (!filters.email ||
        s.emails?.some((e) =>
          e.toLowerCase().includes(filters.email.toLowerCase()),
        )) &&
      (filters.hasContacts === null ||
        (filters.hasContacts
          ? s.contacts && s.contacts.length > 0
          : !s.contacts || s.contacts.length === 0));

    return searchMatch && filterMatch;
  });

  /* ---------------- Pagination ---------------- */
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ---------------- Clamp Invalid Page on Resize / Pagination ---------------- */
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [itemsPerPage, totalPages]);

  /* ---------------- Download CSV ---------------- */
  const handleDownloadCSV = () => {
    if (filteredSuppliers.length === 0) return;

    const headers = [
      "Company",
      "Internal Code",
      "Addresses",
      "Emails",
      "Website",
      "Contact Names",
      "Contact Phones",
      "Forte Products",
      "Products",
      "Certificates",
    ];

    const rows = filteredSuppliers.map((s) => [
      s.company,
      s.internalCode ?? "",
      s.addresses?.join(" | ") ?? "",
      s.emails?.join(" | ") ?? "",
      s.website ?? "",
      s.contacts?.map((c) => c.name).join(" | ") ?? "",
      s.contacts?.map((c) => c.phone).join(" | ") ?? "",
      s.forteProducts?.join(" | ") ?? "",
      s.products?.join(" | ") ?? "",
      s.certificates?.join(" | ") ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "suppliers.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Suppliers</h1>

        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Search supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full md:w-64 rounded-md border px-3 text-sm"
          />

          <Button
            onClick={() => setAddSupplierOpen(true)}
            className="w-full md:w-auto cursor-pointer"
          >
            + Add Supplier
          </Button>

          <Button
            variant="outline"
            onClick={() => setFilterOpen(true)}
            className="gap-1 w-full md:w-auto cursor-pointer"
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>

          <Button
            onClick={handleDownloadCSV}
            className="w-full md:w-auto cursor-pointer bg-green-600 hover:bg-green-700 text-white"
          >
            Download CSV
          </Button>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actions</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Internal Code</TableHead>
              <TableHead>Addresses</TableHead>
              <TableHead>Emails</TableHead>
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
                  {/* ACTIONS */}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSupplier(s);
                          setEditSupplierOpen(true);
                        }}
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* COMPANY */}
                  <TableCell className="whitespace-normal break-words">
                    {s.company}
                  </TableCell>

                  {/* INTERNAL CODE */}
                  <TableCell className="whitespace-normal break-words">
                    {s.internalCode || "-"}
                  </TableCell>

                  {/* ADDRESSES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.addresses?.length
                      ? s.addresses.length === 1
                        ? s.addresses[0]
                        : s.addresses.map((item, i) => (
                            <div key={i}>{`${i + 1}. ${item}`}</div>
                          ))
                      : "-"}
                  </TableCell>

                  {/* EMAILS */}
                  <TableCell className="whitespace-normal break-words">
                    {s.emails?.length
                      ? s.emails.length === 1
                        ? s.emails[0]
                        : s.emails.map((item, i) => (
                            <div key={i}>{`${i + 1}. ${item}`}</div>
                          ))
                      : "-"}
                  </TableCell>

                  {/* WEBSITE */}
                  <TableCell className="whitespace-normal break-words">
                    {s.website || "-"}
                  </TableCell>

                  {/* CONTACT NAMES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.contacts?.length
                      ? s.contacts.length === 1
                        ? s.contacts[0].name
                        : s.contacts.map((c, i) => (
                            <div key={i}>{`${i + 1}. ${c.name}`}</div>
                          ))
                      : "-"}
                  </TableCell>

                  {/* CONTACT PHONES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.contacts?.length
                      ? s.contacts.length === 1
                        ? s.contacts[0].phone
                        : s.contacts.map((c, i) => (
                            <div key={i}>{`${i + 1}. ${c.phone}`}</div>
                          ))
                      : "-"}
                  </TableCell>

                  {/* FORTE PRODUCTS */}
                  <TableCell className="whitespace-normal break-words">
                    {s.forteProducts?.length
                      ? s.forteProducts.length === 1
                        ? s.forteProducts[0]
                        : s.forteProducts.map((item, i) => (
                            <div key={i}>{`${i + 1}. ${item}`}</div>
                          ))
                      : "-"}
                  </TableCell>

                  {/* PRODUCTS */}
                  <TableCell className="whitespace-normal break-words">
                    {s.products?.length
                      ? s.products.length === 1
                        ? s.products[0]
                        : s.products.map((item, i) => (
                            <div key={i}>{`${i + 1}. ${item}`}</div>
                          ))
                      : "-"}
                  </TableCell>

                  {/* CERTIFICATES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.certificates?.length
                      ? s.certificates.length === 1
                        ? s.certificates[0]
                        : s.certificates.map((item, i) => (
                            <div key={i}>{`${i + 1}. ${item}`}</div>
                          ))
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-8 border rounded-md text-sm text-muted-foreground">
            No suppliers found.
          </div>
        ) : (
          paginatedSuppliers.map((s) => (
            <div
              key={s.id}
              className="border rounded-lg p-4 space-y-4 shadow-sm"
            >
              {/* COMPANY NAME */}
              <h3 className="text-lg font-semibold underline">{s.company}</h3>

              {/* FIELDS */}
              <div className="text-sm space-y-3">
                {/* INTERNAL CODE */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Internal Code
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.internalCode || "-"}
                  </div>
                </div>

                {/* ADDRESSES */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Addresses
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.addresses?.length ? (
                      s.addresses.length === 1 ? (
                        <div>{s.addresses[0]}</div>
                      ) : (
                        s.addresses.map((item, i) => (
                          <div key={i}>{`${i + 1}. ${item}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* EMAILS */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Emails
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.emails?.length ? (
                      s.emails.length === 1 ? (
                        <div>{s.emails[0]}</div>
                      ) : (
                        s.emails.map((item, i) => (
                          <div key={i}>{`${i + 1}. ${item}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* WEBSITE */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Website
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.website || "-"}
                  </div>
                </div>

                {/* CONTACT NAMES */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Contact Name(s)
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.contacts?.length ? (
                      s.contacts.length === 1 ? (
                        <div>{s.contacts[0].name}</div>
                      ) : (
                        s.contacts.map((c, i) => (
                          <div key={i}>{`${i + 1}. ${c.name}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* PHONE NUMBERS */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Phone Number(s)
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.contacts?.length ? (
                      s.contacts.length === 1 ? (
                        <div>{s.contacts[0].phone}</div>
                      ) : (
                        s.contacts.map((c, i) => (
                          <div key={i}>{`${i + 1}. ${c.phone}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* FORTE PRODUCTS */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Forte Product(s)
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.forteProducts?.length ? (
                      s.forteProducts.length === 1 ? (
                        <div>{s.forteProducts[0]}</div>
                      ) : (
                        s.forteProducts.map((item, i) => (
                          <div key={i}>{`${i + 1}. ${item}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* PRODUCTS */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Product(s)
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.products?.length ? (
                      s.products.length === 1 ? (
                        <div>{s.products[0]}</div>
                      ) : (
                        s.products.map((item, i) => (
                          <div key={i}>{`${i + 1}. ${item}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* CERTIFICATES */}
                <div>
                  <div className="font-semibold text-muted-foreground">
                    Certificate(s)
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {s.certificates?.length ? (
                      s.certificates.length === 1 ? (
                        <div>{s.certificates[0]}</div>
                      ) : (
                        s.certificates.map((item, i) => (
                          <div key={i}>{`${i + 1}. ${item}`}</div>
                        ))
                      )
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION (OUTSIDE SCROLL) */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-md">
        <span className="text-xs sm:text-sm text-center sm:text-left">
          Page {currentPage} of {totalPages || 1}
        </span>

        <div className="flex gap-2 justify-center sm:justify-end">
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
    </div>
  );
}
