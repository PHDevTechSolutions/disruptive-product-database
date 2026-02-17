"use client";
import *as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import saveAs from "file-saver";
type Props = { products: any[] };
export default function DownloadProduct({ products }: Props) {
  const [open, setOpen] = React.useState(false);
  const getSpecValue = (spec: any) => {
    if (!spec) return "";
    return spec.value || "";
  };
  const urlToBuffer = async (url: string) => {
    const res = await fetch(url, { mode: "cors" });
    return await res.arrayBuffer();
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
      let maxGallery = 0;
      groupProducts.forEach(p => {
        if (p.gallery?.length > maxGallery) maxGallery = p.gallery.length;
      });
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Products");
      const header1: any[] = [];
      const header2: any[] = [];
      header1.push("Model No."); header2.push("");
      header1.push("Supplier Company"); header2.push("");
      header1.push("Main Image"); header2.push("");
      const galleryStart = header1.length + 1;
      if (maxGallery > 0) {
        header1.push("Gallery"); header2.push("Image 1");
        for (let i = 1; i < maxGallery; i++) {
          header1.push(""); header2.push(`Image ${i + 1}`);
        }
      }
      specGroups.forEach((specs, group) => {
        const arr = Array.from(specs);
        header1.push(group); header2.push(arr[0] || "");
        for (let i = 1; i < arr.length; i++) {
          header1.push(""); header2.push(arr[i]);
        }
      });
      const logisticsStart = header1.length + 1;
      header1.push("Pricing / Logistics");
      const logisticsCols = ["Unit Cost", "Landed Cost", "SRP", "MOQ", "Warranty"];
      header2.push(logisticsCols[0]);
      for (let i = 1; i < logisticsCols.length; i++) {
        header1.push(""); header2.push(logisticsCols[i]);
      }
      ws.addRow(header1);
      ws.addRow(header2);
      ws.columns?.forEach(col => { col.width = 18; });
      if (maxGallery > 0) ws.mergeCells(1, galleryStart, 1, galleryStart + maxGallery - 1);
      ws.mergeCells(1, logisticsStart, 1, logisticsStart + logisticsCols.length - 1);
      for (let r = 0; r < groupProducts.length; r++) {
        const p = groupProducts[r];
        const row: any[] = [];
        row.push(p.productName || "");
        row.push(p.supplier?.company || "");
        row.push("");
        for (let i = 0; i < maxGallery; i++)row.push("");
        specGroups.forEach((specs, group) => {
          Array.from(specs).forEach(specId => {
            const g = p.technicalSpecifications?.find((x: any) => x.title === group);
            const s = g?.specs?.find((x: any) => x.specId === specId);
            row.push(getSpecValue(s));
          });
        });
        row.push(p.logistics?.unitCost || "", p.logistics?.landedCost || "", p.logistics?.srp || "", p.logistics?.moq || "", `${p.logistics?.warranty?.value || ""} ${p.logistics?.warranty?.unit || ""}`);
        const excelRow = ws.addRow(row);
        excelRow.height = 90;
        if (p.mainImage?.url) {
          const buffer = await urlToBuffer(p.mainImage.url);
          const ext = p.mainImage.url.split(".").pop();
          const img = wb.addImage({ buffer, extension: ext });
          ws.addImage(img, { tl: { col: 2.2, row: r + 3.15 }, ext: { width: 75, height: 75 } });
        }
        if (p.gallery?.length) {
          for (let g = 0; g < p.gallery.length; g++) {
            const buffer = await urlToBuffer(p.gallery[g].url);
            const ext = p.gallery[g].url.split(".").pop();
            const img = wb.addImage({ buffer, extension: ext });
            ws.addImage(img, { tl: { col: 3 + g + 0.2, row: r + 3.15 }, ext: { width: 75, height: 75 } });
          }
        }
      }
      const buffer = await wb.xlsx.writeBuffer();
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
