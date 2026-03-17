"use client";

import { Button } from "@/components/ui/button";

type Supplier = {
  id: string;
  company: string;
  supplierBrand?: string;
  addresses: string[];
  emails?: string[];
  website?: string[];
  contacts?: {
    name: string;
    phone: string;
  }[];
  forteProducts?: string[];
  products?: string[];
  certificates?: string[];
};

type DownloadSupplierProps = {
  suppliers: Supplier[];
};

export default function DownloadSupplier({ suppliers }: DownloadSupplierProps) {
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
      const contactNames = s.contacts?.map((c) => c.name).filter(Boolean) ?? [];
      const contactPhones = s.contacts?.map((c) => c.phone).filter(Boolean) ?? [];

      return [
        s.company ?? "",
        s.supplierBrand ?? "",
        s.addresses?.join(" | ") ?? "",
        s.emails?.join(" | ") ?? "",
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
        table += `<td>${cell}</td>`;
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
