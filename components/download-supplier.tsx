"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Supplier = {
  id: string;
  company: string;
  supplierBrand?: string;
  addresses?: string[];
  emails?: string[];
  website?: string[];
  contacts?: {
    name: string;
    phone: string;
  }[];
  forteProducts?: string[];
  products?: string[];
  certificates?: string[];
  // New fields
  hasMultipleBranches?: boolean;
  address?: string;
  country?: string;
  countries?: string[];
  branches?: {
    address: string;
    country: string;
    contacts: { name: string; phone: string; type: string }[];
    emails: string[];
  }[];
};

type DownloadSupplierProps = {
  suppliers: Supplier[];
  iconOnly?: boolean; // when true, renders a compact icon-only button (used on mobile)
};

/* ---------------- Helpers ---------------- */

/**
 * Ensures a phone string is stored/exported with its leading +.
 * e.g. "8613800138000" → "+8613800138000"
 *      "+8613800138000" → "+8613800138000"  (no change)
 *      "WeChat: john"  → "WeChat: john"     (non-numeric, untouched)
 */
const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;

  // Already has + prefix → return as-is
  if (trimmed.startsWith("+")) return trimmed;

  // Pure digits (or digits with spaces/dashes) → prepend +
  if (/^[\d\s\-().]+$/.test(trimmed)) return `+${trimmed.replace(/\s+/g, "")}`;

  // Non-numeric (WeChat, TikTok, etc.) → return untouched
  return trimmed;
};

export default function DownloadSupplier({ suppliers, iconOnly = false }: DownloadSupplierProps) {
  const handleDownloadCSV = () => {
    if (suppliers.length === 0) return;

    const headers = [
      "Company Name",
      "Supplier Brand",
      "Addresses",
      "Emails",
      "Website",
      "Contact Name(s)",
      "Phone Number(s)",
      "Forte Product(s)",
      "Product(s)",
      "Certificate(s)",
    ];

    const rows = suppliers.map((s) => {
      let addresses: string[] = [];
      let emails: string[] = [];
      let contactNames: string[] = [];
      let contactPhones: string[] = [];

      // Handle new data structure
      if (s.hasMultipleBranches && s.branches?.length) {
        // Multiple branches mode - include branch labels
        addresses = s.branches.map((b, idx) => `Branch ${idx + 1}: ${b.address} (${b.country})`);
        emails = s.branches.map((b, idx) => {
          const emailStr = b.emails?.join(", ") || "";
          return emailStr ? `Branch ${idx + 1}: ${emailStr}` : "";
        }).filter(Boolean);
        s.branches.forEach((b, idx) => {
          (b.contacts || []).forEach(c => {
            contactNames.push(`Branch ${idx + 1}: ${c.name}`);
            contactPhones.push(normalizePhone(c.phone));
          });
        });
      } else if (s.address && s.country) {
        // Single branch mode (new structure)
        addresses = [`${s.address} (${s.country})`];
        emails = s.emails || [];
        contactNames = s.contacts?.map(c => c.name).filter(Boolean) ?? [];
        contactPhones = s.contacts?.map(c => normalizePhone(c.phone)).filter(Boolean) ?? [];
      } else if (s.addresses?.length) {
        // Old structure (backward compatibility)
        addresses = s.addresses;
        emails = s.emails || [];
        contactNames = s.contacts?.map(c => c.name).filter(Boolean) ?? [];
        contactPhones = s.contacts?.map(c => normalizePhone(c.phone)).filter(Boolean) ?? [];
      }

      return [
        s.company ?? "",
        s.supplierBrand ?? "",
        addresses.join(" | "),
        emails.join(" | "),
        s.website?.join(" | ") ?? "",
        contactNames.join(" | "),
        contactPhones.join(" | "),
        s.forteProducts?.join(" | ") ?? "",
        s.products?.join(" | ") ?? "",
        s.certificates?.join(" | ") ?? "",
      ];
    });

    let table = `<table border="1">`;

    // HEADER
    table += `<tr style="background:#f4cccc;font-weight:bold;">`;
    headers.forEach((h) => {
      table += `<th>${h}</th>`;
    });
    table += `</tr>`;

    // ROWS
    rows.forEach((row) => {
      table += `<tr>`;
      row.forEach((cell) => {
        table += `<td style="mso-number-format:'\\@'">${cell}</td>`;
      });
      table += `</tr>`;
    });

    table += `</table>`;

    const blob = new Blob([table], {
      type: "application/vnd.ms-excel",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "suppliers.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Mobile icon-only button ──
  if (iconOnly) {
    return (
      <button
        onClick={handleDownloadCSV}
        disabled={suppliers.length === 0}
        className="h-8 w-8 rounded-full border border-gray-200 bg-white/80 flex items-center justify-center disabled:opacity-40"
        title="Download XLS"
      >
        <Download className="h-4 w-4 text-gray-600" />
      </button>
    );
  }

  // ── Desktop full button ──
  return (
    <Button
      onClick={handleDownloadCSV}
      disabled={suppliers.length === 0}
      className="w-full md:w-auto cursor-pointer bg-green-600 hover:bg-green-700 text-white"
    >
      Download CSV
    </Button>
  );
}
