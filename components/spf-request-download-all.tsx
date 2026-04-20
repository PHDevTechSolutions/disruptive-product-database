"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, History, Database, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase";
import ExcelJS from "exceljs";
import saveAs from "file-saver";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SPFRequest = {
  id: string;
  spf_number: string;
  customer_name: string;
  special_instructions?: string;
  prepared_by?: string;
  approved_by?: string;
  status?: string;
  date_updated?: string;
  date_created?: string;
};

type VersionRecord = {
  id?: number;
  spf_number: string;
  version_number: number;
  version_label: string;
  created_at: string;
  edited_by?: string;
  status?: string;
  price_validity?: string;
  supplier_brand?: string;
  product_offer_image?: string;
  product_offer_qty?: string;
  product_offer_unit_cost?: string;
  product_offer_pcs_per_carton?: string;
  product_offer_packaging_details?: string;
  product_offer_factory_address?: string;
  product_offer_port_of_discharge?: string;
  product_offer_subtotal?: string;
  company_name?: string;
  contact_name?: string;
  contact_number?: string;
  proj_lead_time?: string;
  final_selling_cost?: string;
  final_unit_cost?: string;
  final_subtotal?: string;
  item_code?: string;
  tds?: string;
};

type DownloadOption = {
  type: "specific-history" | "all-history";
  format: "excel" | "pdf";
};

type SPFSelection = {
  spfNumber: string;
  customerName: string;
};

const ROW_SEP = "|ROW|";

function splitByRow(value: string | undefined): string[][] {
  if (!value) return [];
  return value.split(ROW_SEP).map((rowStr) => rowStr.split(",").map((v) => v.trim()));
}

export default function SPFRequestDownloadAll({ requests }: { requests: SPFRequest[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DownloadOption | null>(null);
  const [selectedSPF, setSelectedSPF] = useState<string>("");

  const fetchSPFHistory = async (spfNumber: string): Promise<VersionRecord[]> => {
    const { data, error } = await supabase
      .from("spf_creation_history")
      .select("*")
      .eq("spf_number", spfNumber)
      .order("version_number", { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const fetchSPFRequestData = async (spfNumber: string) => {
    const { data } = await supabase
      .from("spf_request")
      .select("item_description,item_photo,item_code,customer_name,special_instructions,prepared_by,approved_by,status,date_updated,date_created")
      .eq("spf_number", spfNumber)
      .maybeSingle();
    return data;
  };

  const fetchSPFCreation = async (spfNumber: string) => {
    const { data } = await supabase
      .from("spf_creation")
      .select("*")
      .eq("spf_number", spfNumber)
      .maybeSingle();
    return data;
  };

  const flattenHistoryToRows = (history: VersionRecord[], spfRequest: any) => {
    const rows: any[] = [];

    for (const record of history) {
      const rowImages = splitByRow(record.product_offer_image);
      const rowQtys = splitByRow(record.product_offer_qty);
      const rowUnitCosts = splitByRow(record.product_offer_unit_cost);
      const rowPcsPerCartons = splitByRow(record.product_offer_pcs_per_carton);
      const rowPackaging = splitByRow(record.product_offer_packaging_details);
      const rowFactories = splitByRow(record.product_offer_factory_address);
      const rowPorts = splitByRow(record.product_offer_port_of_discharge);
      const rowSubtotals = splitByRow(record.product_offer_subtotal);
      const rowBrands = splitByRow(record.supplier_brand);
      const rowItemCodes = splitByRow(record.item_code);
      const rowCompanyNames = splitByRow(record.company_name);
      const rowContactNames = splitByRow(record.contact_name);
      const rowContactNumbers = splitByRow(record.contact_number);
      const rowLeadTimes = splitByRow(record.proj_lead_time);
      const rowSellingCosts = splitByRow(record.final_selling_cost);
      const rowFinalUnitCosts = splitByRow(record.final_unit_cost);
      const rowFinalSubtotals = splitByRow(record.final_subtotal);
      const rowTdsBrands = splitByRow(record.tds);
      const rowPriceValidities = splitByRow(record.price_validity);

      const descriptions = (spfRequest?.item_description || "").split(",").map((s: string) => s.trim());

      for (let rowIdx = 0; rowIdx < rowImages.length; rowIdx++) {
        for (let optIdx = 0; optIdx < (rowImages[rowIdx]?.length || 0); optIdx++) {
          if (rowImages[rowIdx][optIdx] && rowImages[rowIdx][optIdx] !== "-") {
            rows.push({
              version: record.version_number,
              versionLabel: record.version_label || `${record.spf_number}_v${record.version_number}`,
              dateCreated: record.created_at ? new Date(record.created_at).toLocaleString("en-PH") : "-",
              editedBy: record.edited_by || "-",
              status: record.status || "-",
              spfNumber: record.spf_number,
              customerName: spfRequest?.customer_name || "-",
              itemDescription: descriptions[rowIdx] || "-",
              itemCode: rowItemCodes[rowIdx]?.[optIdx] || "-",
              supplierBrand: rowBrands[rowIdx]?.[optIdx] || "-",
              qty: rowQtys[rowIdx]?.[optIdx] || "-",
              unitCost: rowUnitCosts[rowIdx]?.[optIdx] || "-",
              pcsPerCarton: rowPcsPerCartons[rowIdx]?.[optIdx] || "-",
              packaging: rowPackaging[rowIdx]?.[optIdx] || "-",
              factory: rowFactories[rowIdx]?.[optIdx] || "-",
              port: rowPorts[rowIdx]?.[optIdx] || "-",
              subtotal: rowSubtotals[rowIdx]?.[optIdx] || "-",
              companyName: rowCompanyNames[rowIdx]?.[optIdx] || "-",
              contactName: rowContactNames[rowIdx]?.[optIdx] || "-",
              contactNumber: rowContactNumbers[rowIdx]?.[optIdx] || "-",
              leadTime: rowLeadTimes[rowIdx]?.[optIdx] || "-",
              sellingCost: rowSellingCosts[rowIdx]?.[optIdx] || "-",
              finalUnitCost: rowFinalUnitCosts[rowIdx]?.[optIdx] || "-",
              finalSubtotal: rowFinalSubtotals[rowIdx]?.[optIdx] || "-",
              tdsBrand: rowTdsBrands[rowIdx]?.[optIdx] || "-",
              priceValidity: rowPriceValidities[rowIdx]?.[optIdx]
                ? new Date(rowPriceValidities[rowIdx][optIdx]).toLocaleDateString("en-PH")
                : "-",
            });
          }
        }
      }
    }
    return rows;
  };

  const downloadSpecificHistoryExcel = async (spfNumber: string) => {
    const history = await fetchSPFHistory(spfNumber);
    if (history.length === 0) {
      toast.error(`No history found for ${spfNumber}`);
      return;
    }

    const spfRequest = await fetchSPFRequestData(spfNumber);
    const rows = flattenHistoryToRows(history, spfRequest);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(spfNumber);

    const headers = [
      "Version", "Version Label", "Date Created", "Edited By", "Status",
      "SPF Number", "Customer", "Item Description", "Item Code", "Supplier Brand",
      "Qty", "Unit Cost", "PCS/Carton", "Packaging", "Factory", "Port",
      "Subtotal", "Company", "Contact Name", "Contact Number", "Lead Time",
      "Selling Cost", "Final Unit Cost", "Final Subtotal", "TDS Brand", "Price Validity"
    ];

    ws.addRow(headers);
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    rows.forEach((row) => {
      ws.addRow([
        row.version, row.versionLabel, row.dateCreated, row.editedBy, row.status,
        row.spfNumber, row.customerName, row.itemDescription, row.itemCode, row.supplierBrand,
        row.qty, row.unitCost, row.pcsPerCarton, row.packaging, row.factory, row.port,
        row.subtotal, row.companyName, row.contactName, row.contactNumber, row.leadTime,
        row.sellingCost, row.finalUnitCost, row.finalSubtotal, row.tdsBrand, row.priceValidity
      ]);
    });

    ws.columns.forEach((column) => {
      let max = 15;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value?.toString().length || 0;
        if (len > max) max = len;
      });
      column.width = Math.min(max + 4, 50);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${spfNumber}_History.xlsx`);
  };

  const downloadSpecificHistoryPDF = async (spfNumber: string) => {
    const history = await fetchSPFHistory(spfNumber);
    if (history.length === 0) {
      toast.error(`No history found for ${spfNumber}`);
      return;
    }

    const spfRequest = await fetchSPFRequestData(spfNumber);
    const rows = flattenHistoryToRows(history, spfRequest);

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`SPF History: ${spfNumber}`, 14, 20);

    const headers = [
      "Ver", "Date", "Status", "Item", "Brand", "Qty", "Unit Cost", "Subtotal", "Final Subtotal"
    ];

    const data = rows.map((r) => [
      r.version.toString(),
      r.dateCreated.slice(0, 10),
      r.status,
      r.itemDescription.slice(0, 30),
      r.supplierBrand,
      r.qty,
      r.unitCost,
      r.subtotal,
      r.finalSubtotal,
    ]);

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [68, 114, 196] },
    });

    doc.save(`${spfNumber}_History.pdf`);
  };

  const downloadAllHistoryExcel = async () => {
    const wb = new ExcelJS.Workbook();

    for (const req of requests) {
      const history = await fetchSPFHistory(req.spf_number);
      if (history.length === 0) continue;

      const spfRequest = await fetchSPFRequestData(req.spf_number);
      const rows = flattenHistoryToRows(history, spfRequest);

      // Sanitize sheet name (max 31 chars, no special chars)
      const sheetName = req.spf_number.replace(/[*?:\/\\\[\]]/g, "").slice(0, 31);
      const ws = wb.addWorksheet(sheetName);

      const headers = [
        "Version", "Version Label", "Date Created", "Edited By", "Status",
        "SPF Number", "Customer", "Item Description", "Item Code", "Supplier Brand",
        "Qty", "Unit Cost", "PCS/Carton", "Packaging", "Factory", "Port",
        "Subtotal", "Company", "Contact Name", "Contact Number", "Lead Time",
        "Selling Cost", "Final Unit Cost", "Final Subtotal", "TDS Brand", "Price Validity"
      ];

      ws.addRow(headers);
      ws.getRow(1).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      rows.forEach((row) => {
        ws.addRow([
          row.version, row.versionLabel, row.dateCreated, row.editedBy, row.status,
          row.spfNumber, row.customerName, row.itemDescription, row.itemCode, row.supplierBrand,
          row.qty, row.unitCost, row.pcsPerCarton, row.packaging, row.factory, row.port,
          row.subtotal, row.companyName, row.contactName, row.contactNumber, row.leadTime,
          row.sellingCost, row.finalUnitCost, row.finalSubtotal, row.tdsBrand, row.priceValidity
        ]);
      });

      ws.columns.forEach((column) => {
        let max = 12;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const len = cell.value?.toString().length || 0;
          if (len > max) max = len;
        });
        column.width = Math.min(max + 2, 40);
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `All_SPF_History_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const downloadAllHistoryPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    let currentY = 20;

    doc.setFontSize(18);
    doc.text("All SPF History Report", 14, currentY);
    currentY += 15;

    for (const req of requests) {
      const history = await fetchSPFHistory(req.spf_number);
      if (history.length === 0) continue;

      const spfRequest = await fetchSPFRequestData(req.spf_number);
      const rows = flattenHistoryToRows(history, spfRequest);

      // Check if we need a new page
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.text(`${req.spf_number} - ${req.customer_name}`, 14, currentY);
      currentY += 8;

      const headers = ["Ver", "Date", "Status", "Item", "Brand", "Qty", "Unit Cost", "Subtotal"];
      const data = rows.slice(0, 10).map((r) => [
        r.version.toString(),
        r.dateCreated.slice(0, 10),
        r.status.slice(0, 20),
        r.itemDescription.slice(0, 25),
        r.supplierBrand,
        r.qty,
        r.unitCost,
        r.subtotal,
      ]);

      autoTable(doc, {
        head: [headers],
        body: data,
        startY: currentY,
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [68, 114, 196] },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 40;
    }

    doc.save(`All_SPF_History_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleDownload = async () => {
    if (!selectedOption) return;

    setLoading(true);
    try {
      if (selectedOption.type === "specific-history") {
        // For specific history, use selected SPF or first request
        const spfNumber = selectedSPF || (requests.length > 0 ? requests[0].spf_number : "");
        if (!spfNumber) {
          toast.error("Please select an SPF number");
          return;
        }
        if (selectedOption.format === "excel") {
          await downloadSpecificHistoryExcel(spfNumber);
        } else {
          await downloadSpecificHistoryPDF(spfNumber);
        }
      } else {
        // All history
        if (selectedOption.format === "excel") {
          await downloadAllHistoryExcel();
        } else {
          await downloadAllHistoryPDF();
        }
      }
      toast.success("Download completed successfully");
      setOpen(false);
      setSelectedOption(null);
      setSelectedSPF("");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download");
    } finally {
      setLoading(false);
    }
  };

  const getOptionLabel = () => {
    if (!selectedOption) return "";
    const typeLabel = selectedOption.type === "specific-history" ? "Specific SPF History" : "All SPF History";
    const formatLabel = selectedOption.format === "excel" ? "Excel" : "PDF";
    return `${typeLabel} (${formatLabel})`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 shrink-0 gap-1 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            SPF History Options
          </div>
          <DropdownMenuItem
            onClick={() => {
              setSelectedOption({ type: "specific-history", format: "excel" });
              setOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <History className="h-4 w-4 text-blue-600" />
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span className="font-medium">Specific SPF History</span>
              <span className="text-xs text-muted-foreground">Current record - Excel</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSelectedOption({ type: "specific-history", format: "pdf" });
              setOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <History className="h-4 w-4 text-blue-600" />
            <FileText className="h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span className="font-medium">Specific SPF History</span>
              <span className="text-xs text-muted-foreground">Current record - PDF</span>
            </div>
          </DropdownMenuItem>
          <div className="h-px bg-gray-200 my-1" />
          <DropdownMenuItem
            onClick={() => {
              setSelectedOption({ type: "all-history", format: "excel" });
              setOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <Database className="h-4 w-4 text-purple-600" />
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span className="font-medium">All SPF History</span>
              <span className="text-xs text-muted-foreground">All records - 1 SPF/sheet - Excel</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSelectedOption({ type: "all-history", format: "pdf" });
              setOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <Database className="h-4 w-4 text-purple-600" />
            <FileText className="h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span className="font-medium">All SPF History</span>
              <span className="text-xs text-muted-foreground">All records combined - PDF</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Download</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium">{getOptionLabel()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedOption?.type === "specific-history"
                  ? `Download history for selected SPF with all versions (v1, v2, etc.)`
                  : `Download all ${requests.length} SPF records, 1 SPF per sheet`}
              </p>
            </div>

            {/* SPF Selection dropdown for Specific History */}
            {selectedOption?.type === "specific-history" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select SPF Number:</label>
                <Select value={selectedSPF} onValueChange={setSelectedSPF}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose SPF number..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {requests.map((req) => (
                      <SelectItem key={req.id} value={req.spf_number}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{req.spf_number}</span>
                          <span className="text-xs text-muted-foreground">{req.customer_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedSPF && requests.length > 0 && (
                  <p className="text-xs text-amber-600">
                    Default: {requests[0].spf_number} (first in list). Select another above to change.
                  </p>
                )}
              </div>
            )}

            {selectedOption?.format === "excel" && selectedOption?.type === "all-history" && (
              <p className="text-xs text-blue-600">
                Excel format: Each SPF will be in its own sheet within the workbook.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelectedOption(null);
                setSelectedSPF("");
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download {selectedOption?.format === "excel" ? "Excel" : "PDF"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
