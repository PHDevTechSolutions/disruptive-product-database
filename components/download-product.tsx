"use client";
import *as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import *as XLSX from "xlsx";
import JSZip from "jszip";
import saveAs from "file-saver";
type Props = { products: any[] };
export default function DownloadProduct({ products }: Props) {
  const [open, setOpen] = React.useState(false);
  const getSpecValue = (spec: any) => {
    if (!spec) return "";
    if (spec.isRating) return `IP${spec.ipFirst}${spec.ipSecond}`;
    if (spec.isRanging) return `${spec.rangeFrom}-${spec.rangeTo}`;
    if (spec.isDimension) return `${spec.length} x ${spec.width} x ${spec.height}`;
    if (spec.isSlashing) return spec.slashValues?.join(" / ");
    return spec.value || "";
  };
  const handleDownload = async () => {
    if (!products.length) return;
    const zip = new JSZip();
    const grouped: Record<string, any[]> = {};
    products.forEach(p => {
      const sister = p.sisterCompanyName || "No Sister";
      const classification = p.classificationName || "No Classification";
      const category = p.categoryTypes?.[0]?.categoryTypeName || "No Category";
      const productType = p.productTypes?.[0]?.productTypeName || "No Product";
      const key = `${sister}|${classification}|${category}|${productType}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    for (const key in grouped) {
      const [sister, classification, category, productType] = key.split("|");
      const groupProducts = grouped[key];
      const specGroups = new Map<string, Set<string>>();
      groupProducts.forEach(p => {
        p.technicalSpecifications?.forEach((g: any) => {
          if (!specGroups.has(g.title)) specGroups.set(g.title, new Set());
          g.specs?.forEach((s: any) => specGroups.get(g.title)!.add(s.specId));
        });
      });
      const baseCols = ["Model No.", "Supplier Company"];
      const logisticsCols = ["Unit Cost", "Landed Cost", "SRP", "MOQ", "Warranty"];
      const header1: any[] = [];
      const header2: any[] = [];
      const merges: any[] = [];
      let colIndex = 0;
      baseCols.forEach(col => {
        header1.push(col);
        header2.push("");
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 1, c: colIndex } });
        colIndex++;
      });
      specGroups.forEach((specs, group) => {
        const start = colIndex;
        const specArray = Array.from(specs);
        header1.push(group);
        header2.push(specArray[0] || "");
        colIndex++;
        for (let i = 1; i < specArray.length; i++) {
          header1.push("");
          header2.push(specArray[i]);
          colIndex++;
        }
        merges.push({ s: { r: 0, c: start }, e: { r: 0, c: colIndex - 1 } });
      });
      const logStart = colIndex;
      header1.push("Pricing / Logistics");
      header2.push(logisticsCols[0]);
      colIndex++;
      for (let i = 1; i < logisticsCols.length; i++) {
        header1.push("");
        header2.push(logisticsCols[i]);
        colIndex++;
      }
      merges.push({ s: { r: 0, c: logStart }, e: { r: 0, c: colIndex - 1 } });
      const dataRows = groupProducts.map(p => {
        const row: any[] = [];
        row.push(p.productName || "");
        row.push(p.supplier?.company || "");
        specGroups.forEach((specs, group) => {
          const specArray = Array.from(specs);
          specArray.forEach(specId => {
            const groupData = p.technicalSpecifications?.find((g: any) => g.title === group);
            const spec = groupData?.specs?.find((s: any) => s.specId === specId);
            row.push(getSpecValue(spec));
          });
        });
        row.push(
          p.logistics?.unitCost || "",
          p.logistics?.landedCost || "",
          p.logistics?.srp || "",
          p.logistics?.moq || "",
          `${p.logistics?.warranty?.value || ""} ${p.logistics?.warranty?.unit || ""}`
        );
        return row;
      });
      const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...dataRows]);
      ws["!merges"] = merges;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      zip.folder(sister)!.folder(classification)!.folder(category)!.folder(productType)!.file("Products.xlsx", buffer);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "Products.zip");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Download className="w-4 h-4 mr-2" />Download</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Download Products</DialogTitle></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleDownload}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
