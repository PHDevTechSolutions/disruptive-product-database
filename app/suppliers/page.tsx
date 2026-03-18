"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import DownloadSupplier from "@/components/download-supplier";

/* 🔹 NEW: Supplier Products Modal */
import SupplierProducts from "@/components/company-x-supplier-brand-products";

import { Pencil, Trash2, Filter, Upload } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
  supplierBrand?: string;
  addresses: string[];
  emails?: string[];
  website?: string[];
  contacts?: { name: string; phone: string }[];
  forteProducts?: string[];
  products?: string[];
  certificates?: string[];
  createdBy?: string | null;
  referenceID?: string | null;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

/* Column definitions — single source of truth for widths */
const COL_WIDTHS = [
  "w-[100px]",   // Actions
  "w-[160px]",   // Company Name
  "w-[120px]",   // Supplier Brand
  "w-[220px]",   // Addresses
  "w-[180px]",   // Emails
  "w-[160px]",   // Website
  "w-[160px]",   // Contact
  "w-[140px]",   // Forte Product(s)
  "w-[140px]",   // Product(s)
  "w-[120px]",   // Certificate(s)
];

const HEADERS = [
  { label: "Actions",          align: "text-left"   },
  { label: "Company Name",     align: "text-left"   },
  { label: "Supplier Brand",   align: "text-center" },
  { label: "Addresses",        align: "text-center" },
  { label: "Emails",           align: "text-center" },
  { label: "Website",          align: "text-center" },
  { label: "Contact",          align: "text-center" },
  { label: "Forte Product(s)", align: "text-center" },
  { label: "Product(s)",       align: "text-center" },
  { label: "Certificate(s)",   align: "text-center" },
];

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

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SupplierFilterValues>({
    company: "",
    internalCode: "",
    email: "",
    hasContacts: null,
    sortAlpha: "",
    phoneCountry: "",
    addressCountry: "", // ← added
  });

  /* 🔹 Supplier Products Modal State */
  const [supplierProductsOpen, setSupplierProductsOpen] = useState(false);
  const [supplierProductsTarget, setSupplierProductsTarget] = useState<{
    supplierId: string;
    company: string;
    supplierBrand: string;
  } | null>(null);

  const DESKTOP_ITEMS_PER_PAGE = 10;
  const MOBILE_ITEMS_PER_PAGE = 3;
  const [itemsPerPage, setItemsPerPage] = useState(DESKTOP_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------- Auth / User ---------------- */
  useEffect(() => {
    if (userId === null) return;
    if (!userId) { router.push("/login"); return; }
    async function fetchUser() {
      try {
        const res = await fetch(`/api/users?id=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        setUser(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    fetchUser();
  }, [userId, router]);

  /* ---------------- Fetch Suppliers (Realtime) ---------------- */
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "suppliers"), where("isActive", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          website: Array.isArray(data.website)
            ? data.website
            : data.website ? [data.website] : [],
        };
      });
      setSuppliers(list as Supplier[]);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => { setCurrentPage(1); }, [search, filters]);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 768 ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* 🔹 Open supplier products modal */
  const openSupplierProducts = (s: Supplier) => {
    setSupplierProductsTarget({
      supplierId: s.id,
      company: s.company,
      supplierBrand: s.supplierBrand || "",
    });
    setSupplierProductsOpen(true);
  };

  /* ---------------- Search + Filter ---------------- */
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        const keyword = search.toLowerCase();
        const searchMatch =
          s.company?.toLowerCase().includes(keyword) ||
          s.addresses?.some((v) => v.toLowerCase().includes(keyword)) ||
          s.emails?.some((v) => v.toLowerCase().includes(keyword)) ||
          s.website?.some((v) => v.toLowerCase().includes(keyword)) ||
          s.contacts?.some(
            (c) =>
              c.name?.toLowerCase().includes(keyword) ||
              c.phone?.toLowerCase().includes(keyword),
          ) ||
          s.forteProducts?.some((v) => v.toLowerCase().includes(keyword)) ||
          s.products?.some((v) => v.toLowerCase().includes(keyword)) ||
          s.certificates?.some((v) => v.toLowerCase().includes(keyword));

        const filterMatch =
          (!filters.company ||
            s.company.toLowerCase().includes(filters.company.toLowerCase())) &&
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
            })) &&
          // ← added: addressCountry filter
          (!filters.addressCountry ||
            s.addresses?.some((addr) =>
              addr
                .toLowerCase()
                .endsWith(filters.addressCountry.toLowerCase()) ||
              addr
                .toLowerCase()
                .includes(`, ${filters.addressCountry.toLowerCase()}`),
            ));

        return searchMatch && filterMatch;
      })
      .sort((a, b) => {
        if (!filters.sortAlpha) return 0;
        return filters.sortAlpha === "asc"
          ? a.company.localeCompare(b.company)
          : b.company.localeCompare(a.company);
      });
  }, [suppliers, search, filters]);

  /* ---------------- Pagination ---------------- */
  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / itemsPerPage));

  const paginatedSuppliers = useMemo(() => {
    return filteredSuppliers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [itemsPerPage, totalPages]);

  return (
    <div className="h-dvh flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
      <SidebarTrigger className="hidden md:flex" />

      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
        <h1 className="text-xl md:text-2xl font-semibold">Suppliers</h1>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full md:w-64 rounded-md border px-3 text-sm"
          />
          <Button onClick={() => setAddSupplierOpen(true)} className="cursor-pointer">
            + Add Supplier
          </Button>
          <Button variant="outline" className="cursor-pointer gap-1" onClick={() => setUploadSupplierOpen(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button variant="outline" onClick={() => setFilterOpen(true)} className="gap-1 cursor-pointer">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <DownloadSupplier suppliers={filteredSuppliers} />
        </div>
      </div>

      {/* PAGINATION BAR */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-md shrink-0">
        <span className="text-xs sm:text-sm text-center sm:text-left">
          Page {currentPage} of {totalPages || 1}
        </span>
        <div className="flex gap-2 justify-center sm:justify-end">
          <Button
            size="sm" variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="cursor-pointer"
          >
            Previous
          </Button>
          <Button
            size="sm" variant="outline"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="cursor-pointer"
          >
            Next
          </Button>
        </div>
      </div>

      {/* ✅ DESKTOP TABLE */}
      <div className="hidden md:block flex-1 min-h-0 rounded-md border overflow-auto">
        <table className="w-full text-sm border-collapse">

          <thead className="bg-red-100 sticky top-0 z-10">
            <tr>
              {HEADERS.map((h, i) => (
                <th
                  key={h.label}
                  className={`${COL_WIDTHS[i]} ${h.align} font-bold px-3 py-3 border-b whitespace-nowrap`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground">
                  Loading suppliers...
                </td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground">
                  No suppliers found.
                </td>
              </tr>
            ) : (
              paginatedSuppliers.map((s) => (
                <tr key={s.id} className="border-b hover:bg-muted/40 align-middle">

                  {/* ACTIONS */}
                  <td className={`${COL_WIDTHS[0]} px-3 py-3`}>
                    <div className="flex gap-2 justify-start">
                      <Button
                        variant="outline" size="sm" className="cursor-pointer"
                        onClick={() => { setSelectedSupplier(s); setEditSupplierOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive" size="sm" className="cursor-pointer"
                        onClick={() => { setSelectedSupplier(s); setDeleteSupplierOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>

                  {/* 🔹 COMPANY NAME — clickable */}
                  <td className={`${COL_WIDTHS[1]} px-3 py-3 text-left`}>
                    <button
                      onClick={() => openSupplierProducts(s)}
                      className="font-semibold text-blue-600 hover:underline hover:text-blue-800 transition text-left cursor-pointer"
                    >
                      {highlightText(s.company, search)}
                    </button>
                  </td>

                  {/* 🔹 SUPPLIER BRAND — clickable */}
                  <td className={`${COL_WIDTHS[2]} px-3 py-3 text-center`}>
                    {s.supplierBrand ? (
                      <button
                        onClick={() => openSupplierProducts(s)}
                        className="font-semibold text-blue-600 hover:underline hover:text-blue-800 transition cursor-pointer"
                      >
                        {highlightText(s.supplierBrand, search)}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* ADDRESSES */}
                  <td className={`${COL_WIDTHS[3]} px-3 py-3 text-center`}>
                    {s.addresses?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.addresses.map((item, i) => (
                          <div key={i} className="break-words">{highlightText(item, search)}</div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>

                  {/* EMAILS */}
                  <td className={`${COL_WIDTHS[4]} px-3 py-3 text-center`}>
                    {s.emails?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.emails.map((item, i) => (
                          <div key={i} className="break-all">{highlightText(item, search)}</div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>

                  {/* WEBSITE */}
                  <td className={`${COL_WIDTHS[5]} px-3 py-3 text-center`}>
                    {s.website?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.website.map((site, i) => (
                          <a
                            key={i}
                            href={formatWebsite(site)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800 break-all"
                          >
                            {highlightText(site, search)}
                          </a>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>

                  {/* CONTACT */}
                  <td className={`${COL_WIDTHS[6]} px-3 py-3 text-center`}>
                    {s.contacts?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.contacts.map((c, i) => (
                          <div key={i}>
                            <div className="font-medium">{highlightText(c.name, search)}</div>
                            <div className="text-xs text-muted-foreground">{highlightText(c.phone, search)}</div>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>

                  {/* FORTE PRODUCTS */}
                  <td className={`${COL_WIDTHS[7]} px-3 py-3 text-center`}>
                    {s.forteProducts?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.forteProducts.map((item, i) => (
                          <div key={i}>{highlightText(item, search)}</div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>

                  {/* PRODUCTS */}
                  <td className={`${COL_WIDTHS[8]} px-3 py-3 text-center`}>
                    {s.products?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.products.map((item, i) => (
                          <div key={i}>{highlightText(item, search)}</div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>

                  {/* CERTIFICATES */}
                  <td className={`${COL_WIDTHS[9]} px-3 py-3 text-center`}>
                    {s.certificates?.length ? (
                      <div className="flex flex-col items-center gap-3">
                        {s.certificates.map((item, i) => (
                          <div key={i}>{highlightText(item, search)}</div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden flex-1 overflow-y-auto space-y-4 min-h-0">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-8 border rounded-md text-sm text-muted-foreground">No suppliers found.</div>
        ) : (
          paginatedSuppliers.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 space-y-4 shadow-sm">
              <div className="flex items-start justify-between">
                {/* 🔹 MOBILE: Company Name — clickable */}
                <button
                  onClick={() => openSupplierProducts(s)}
                  className="text-lg font-bold underline text-blue-600 hover:text-blue-800 leading-tight text-left cursor-pointer"
                >
                  {highlightText(s.company, search)}
                </button>

                {s.supplierBrand && (
                  /* 🔹 MOBILE: Supplier Brand — clickable */
                  <button
                    onClick={() => openSupplierProducts(s)}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Brand: {highlightText(s.supplierBrand, search)}
                  </button>
                )}
              </div>

              <div className="text-sm space-y-4 text-center">
                {[
                  { label: "Addresses", items: s.addresses },
                  { label: "Emails", items: s.emails },
                  { label: "Forte Products", items: s.forteProducts },
                  { label: "Products", items: s.products },
                  { label: "Certificates", items: s.certificates },
                ].map(({ label, items }) => (
                  <div key={label}>
                    <strong>{label}</strong>
                    <div className="flex flex-col space-y-4 text-muted-foreground">
                      {items?.length
                        ? items.map((item, i) => <div key={i}>{highlightText(item, search)}</div>)
                        : "-"}
                    </div>
                  </div>
                ))}

                <div>
                  <strong>Website</strong>
                  <div className="flex flex-col space-y-4">
                    {s.website?.length
                      ? s.website.map((site, i) => (
                          <a key={i} href={formatWebsite(site)} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 underline break-all">
                            {highlightText(site, search)}
                          </a>
                        ))
                      : "-"}
                  </div>
                </div>

                <div>
                  <strong>Contacts</strong>
                  <div className="flex flex-col space-y-4 text-muted-foreground">
                    {s.contacts?.length
                      ? s.contacts.map((c, i) => (
                          <div key={i}>{highlightText(c.name, search)} ({highlightText(c.phone, search)})</div>
                        ))
                      : "-"}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline" size="sm" className="flex-1 cursor-pointer"
                    onClick={() => { setSelectedSupplier(s); setEditSupplierOpen(true); }}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive" size="sm" className="flex-1 cursor-pointer"
                    onClick={() => { setSelectedSupplier(s); setDeleteSupplierOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALS */}
      <AddSupplier open={addSupplierOpen} onOpenChange={setAddSupplierOpen} />
      <UploadSupplier open={uploadSupplierOpen} onOpenChange={setUploadSupplierOpen} />
      <FilterSupplier
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onApply={setFilters}
        suppliers={suppliers} // ← added
      />
      {selectedSupplier && (
        <EditSupplier open={editSupplierOpen} onOpenChange={setEditSupplierOpen} supplier={selectedSupplier} />
      )}
      {selectedSupplier && (
        <DeleteSupplier open={deleteSupplierOpen} onOpenChange={setDeleteSupplierOpen} supplier={selectedSupplier} />
      )}

      {/* 🔹 Supplier Products Modal */}
      {supplierProductsTarget && (
        <SupplierProducts
          open={supplierProductsOpen}
          onOpenChange={setSupplierProductsOpen}
          supplierId={supplierProductsTarget.supplierId}
          company={supplierProductsTarget.company}
          supplierBrand={supplierProductsTarget.supplierBrand}
        />
      )}
    </div>
  );
}
