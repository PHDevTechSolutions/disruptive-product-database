"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

import AddSupplier from "@/components/add-supplier";
import UploadSupplier from "@/components/upload-supplier";
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

import { Pencil, Trash2, Filter, Upload } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getCountryCallingCode, CountryCode } from "libphonenumber-js";

import { db } from "@/lib/firebase";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

const highlightText = (text: string, keyword: string) => {
  if (!keyword) return text;

  const regex = new RegExp(`(${keyword})`, "gi");
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};
const formatWebsite = (url?: string) => {
  if (!url) return undefined;
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
};

type Supplier = {
  id: string;
  company: string;
  internalCode?: string[]; // ✅ ARRAY
  addresses: string[];
  emails?: string[];
  website?: string[]; // ✅ ARRAY
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
  const [uploadSupplierOpen, setUploadSupplierOpen] = useState(false);
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
    sortAlpha: "",
    phoneCountry: "",
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
        .map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,

            // ✅ NORMALIZE internalCode
            internalCode: Array.isArray(data.internalCode)
              ? data.internalCode
              : data.internalCode
                ? [data.internalCode]
                : [],

            // ✅ NORMALIZE website
            website: Array.isArray(data.website)
              ? data.website
              : data.website
                ? [data.website]
                : [],
          };
        })
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
  const filteredSuppliers = suppliers
    .filter((s) => {
      const keyword = search.toLowerCase();

      const searchMatch =
        s.company?.toLowerCase().includes(keyword) ||
        // Internal Codes
        s.internalCode?.some((v) => v.toLowerCase().includes(keyword)) ||
        // Addresses
        s.addresses?.some((v) => v.toLowerCase().includes(keyword)) ||
        // Emails
        s.emails?.some((v) => v.toLowerCase().includes(keyword)) ||
        // Websites ✅
        s.website?.some((v) => v.toLowerCase().includes(keyword)) ||
        // Contacts (name + phone)
        s.contacts?.some(
          (c) =>
            c.name?.toLowerCase().includes(keyword) ||
            c.phone?.toLowerCase().includes(keyword),
        ) ||
        // Forte Products
        s.forteProducts?.some((v) => v.toLowerCase().includes(keyword)) ||
        // Products
        s.products?.some((v) => v.toLowerCase().includes(keyword)) ||
        // Certificates
        s.certificates?.some((v) => v.toLowerCase().includes(keyword));

      const filterMatch =
        (!filters.company ||
          s.company.toLowerCase().includes(filters.company.toLowerCase())) &&
        (!filters.internalCode ||
          s.internalCode?.some((code) =>
            code.toLowerCase().includes(filters.internalCode.toLowerCase()),
          )) &&
        (!filters.email ||
          s.emails?.some((e) =>
            e.toLowerCase().includes(filters.email.toLowerCase()),
          )) &&
        (filters.hasContacts === null ||
          (filters.hasContacts
            ? s.contacts && s.contacts.length > 0
            : !s.contacts || s.contacts.length === 0)) &&
        (!filters.phoneCountry ||
          s.contacts?.some((c) => {
            try {
              const callingCode = getCountryCallingCode(
                filters.phoneCountry as CountryCode,
              );
              return c.phone?.startsWith("+" + callingCode);
            } catch {
              return false;
            }
          }));

      return searchMatch && filterMatch;
    })
    .sort((a, b) => {
      if (!filters.sortAlpha) return 0;
      return filters.sortAlpha === "asc"
        ? a.company.localeCompare(b.company)
        : b.company.localeCompare(a.company);
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
      "Company Name",
      "Internal Code",
      "Addresses",
      "Emails",
      "Website",
      "Contact Name(s)",
      "Phone Number(s)",
      "Forte Product(s)",
      "Product(s)",
      "Certificate(s)",
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
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-">
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
            className="w-full md:w-auto cursor-pointer gap-1"
            onClick={() => setUploadSupplierOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload
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
                        className="cursor-pointer"
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
                        className="cursor-pointer"
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
                    <span className="text-base font-semibold">
                      {highlightText(s.company, search)}
                    </span>
                  </TableCell>

                  {/* INTERNAL CODE */}
                  <TableCell className="whitespace-normal break-words">
                    {s.internalCode?.length
                      ? s.internalCode.map((item, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(item, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* ADDRESSES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.addresses?.length
                      ? s.addresses.map((item, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(item, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* EMAILS */}
                  <TableCell className="whitespace-normal break-words">
                    {s.emails?.length
                      ? s.emails.map((item, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(item, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* WEBSITE */}
                  <TableCell className="whitespace-normal break-words">
                    {s.website?.length
                      ? s.website.map((site, i) => (
                          <div key={i}>
                            <a
                              href={formatWebsite(site)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800 break-all"
                            >
                              {highlightText(site, search)}
                            </a>
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* CONTACT NAMES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.contacts?.length
                      ? s.contacts.map((c, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(c.name, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* CONTACT PHONES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.contacts?.length
                      ? s.contacts.map((c, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(c.phone, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* FORTE PRODUCTS */}
                  <TableCell className="whitespace-normal break-words">
                    {s.forteProducts?.length
                      ? s.forteProducts.map((item, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(item, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* PRODUCTS */}
                  <TableCell className="whitespace-normal break-words">
                    {s.products?.length
                      ? s.products.map((item, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(item, search)}
                          </div>
                        ))
                      : "-"}
                  </TableCell>

                  {/* CERTIFICATES */}
                  <TableCell className="whitespace-normal break-words">
                    {s.certificates?.length
                      ? s.certificates.map((item, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(item, search)}
                          </div>
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
              className="border rounded-lg p-4 space-y-3 shadow-sm"
            >
              {/* HEADER */}
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold underline leading-tight">
                  {highlightText(s.company, search)}
                </h3>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedSupplier(s);
                      setEditSupplierOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setSelectedSupplier(s);
                      setDeleteSupplierOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* BODY */}
              <div className="text-sm space-y-2">
                {/* INTERNAL CODE */}
                <div>
                  <strong>Internal Code:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.internalCode?.length
                      ? s.internalCode.map((c, i) => (
                          <div key={i}>
                            {i + 1}. {highlightText(c, search)}
                          </div>
                        ))
                      : "-"}
                  </div>
                </div>

                {/* ADDRESSES */}
                <div>
                  <strong>Addresses:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.addresses?.length ? (
                      s.addresses.map((item, i) => (
                        <div key={i}>
                          {i + 1}. {highlightText(item, search)}
                        </div>
                      ))
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* EMAILS */}
                <div>
                  <strong>Emails:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.emails?.length ? (
                      s.emails.map((item, i) => (
                        <div key={i}>
                          {i + 1}. {highlightText(item, search)}
                        </div>
                      ))
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* WEBSITE */}
                <div>
                  <strong>Website:</strong>
                  <div className="ml-2">
                    {s.website?.length ? (
                      s.website.map((site, i) => (
                        <a
                          key={i}
                          href={formatWebsite(site)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline block break-all"
                        >
                          {highlightText(site, search)}
                        </a>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                {/* CONTACTS */}
                <div>
                  <strong>Contacts:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.contacts?.length ? (
                      s.contacts.map((c, i) => (
                        <div key={i}>
                          {i + 1}. {highlightText(c.name, search)} (
                          {highlightText(c.phone, search)})
                        </div>
                      ))
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* FORTE PRODUCTS */}
                <div>
                  <strong>Forte Products:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.forteProducts?.length ? (
                      s.forteProducts.map((item, i) => (
                        <div key={i}>
                          {i + 1}. {highlightText(item, search)}
                        </div>
                      ))
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* PRODUCTS */}
                <div>
                  <strong>Products:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.products?.length ? (
                      s.products.map((item, i) => (
                        <div key={i}>
                          {i + 1}. {highlightText(item, search)}
                        </div>
                      ))
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                </div>

                {/* CERTIFICATES */}
                <div>
                  <strong>Certificates:</strong>
                  <div className="ml-2 text-muted-foreground">
                    {s.certificates?.length ? (
                      s.certificates.map((item, i) => (
                        <div key={i}>
                          {i + 1}. {highlightText(item, search)}
                        </div>
                      ))
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
            className="cursor-pointer"
          >
            Previous
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="cursor-pointer"
          >
            Next
          </Button>
        </div>
      </div>

      <AddSupplier open={addSupplierOpen} onOpenChange={setAddSupplierOpen} />
      <UploadSupplier
        open={uploadSupplierOpen}
        onOpenChange={setUploadSupplierOpen}
      />

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
