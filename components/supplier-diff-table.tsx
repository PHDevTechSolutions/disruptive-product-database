"use client";

type SupplierSnapshot = {
  company?: string;
  supplierBrand?: string;
  addresses?: string[];
  emails?: string[];
  website?: string | string[];
  contacts?: { name: string; phone: string }[];
  forteProducts?: string[];
  products?: string[];
  certificates?: string[];
};

type Props = {
  oldData: SupplierSnapshot;
  newData: SupplierSnapshot;
};

const joinArr = (v?: string[]) => (v?.length ? v.join(" | ") : "—");
const joinContacts = (v?: { name: string; phone: string }[]) =>
  v?.length ? v.map((c) => `${c.name} · ${c.phone}`).join("\n") : "—";
const joinWebsite = (v?: string | string[]) =>
  Array.isArray(v) ? v.join(" | ") : (v ?? "—");

type FieldRow = { label: string; old: string; new: string };

export default function SupplierDiffTable({ oldData, newData }: Props) {
  const fields: FieldRow[] = [
    { label: "Company name",   old: oldData.company ?? "—",          new: newData.company ?? "—" },
    { label: "Supplier brand", old: oldData.supplierBrand ?? "—",    new: newData.supplierBrand ?? "—" },
    { label: "Addresses",      old: joinArr(oldData.addresses),       new: joinArr(newData.addresses) },
    { label: "Emails",         old: joinArr(oldData.emails),          new: joinArr(newData.emails) },
    { label: "Website",        old: joinWebsite(oldData.website),     new: joinWebsite(newData.website) },
    { label: "Contact",        old: joinContacts(oldData.contacts),   new: joinContacts(newData.contacts) },
    { label: "Forte products", old: joinArr(oldData.forteProducts),   new: joinArr(newData.forteProducts) },
    { label: "Products",       old: joinArr(oldData.products),        new: joinArr(newData.products) },
    { label: "Certificates",   old: joinArr(oldData.certificates),    new: joinArr(newData.certificates) },
  ];

  const changedCount = fields.filter((f) => f.old !== f.new).length;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="text-left px-3 py-2 border-b w-36">Field</th>
              <th className="text-left px-3 py-2 border-b">Current</th>
              <th className="text-left px-3 py-2 border-b">Incoming</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const changed = f.old !== f.new;
              return (
                <tr key={f.label} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${
                        changed ? "bg-red-500" : "bg-gray-300"
                      }`}
                    />
                    {f.label}
                  </td>
                  <td
                    className={`px-3 py-2 whitespace-pre-wrap align-top ${
                      changed ? "bg-red-50 text-red-800" : "text-gray-500"
                    }`}
                  >
                    {f.old}
                  </td>
                  <td
                    className={`px-3 py-2 whitespace-pre-wrap align-top ${
                      changed ? "bg-green-50 text-green-800" : "text-gray-500"
                    }`}
                  >
                    {f.new}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        {changedCount} field{changedCount !== 1 ? "s" : ""} changed ·{" "}
        {fields.length - changedCount} unchanged
      </p>
    </div>
  );
}