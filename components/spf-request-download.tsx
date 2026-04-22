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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, History, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase";
import ExcelJS from "exceljs";
import saveAs from "file-saver";
import { toast } from "sonner";

type Props = {
  spfNumber: string;
};

type VersionRecord = {
  id?: number;
  spf_number: string;
  version_number: number;
  version_label: string;
  created_at: string;
  edited_by?: string;
  item_added_author?: string;
  status?: string;
  spf_creation_start_time?: string;
  spf_creation_end_time?: string;
  price_validity?: string;
  supplier_brand?: string;
  product_offer_image?: string;
  product_offer_qty?: string;
  product_offer_technical_specification?: string;
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
  dimensional_drawing?: string;
  illuminance_drawing?: string;
};

type SPFRequestData = {
  item_description: string;
  item_photo: string;
  item_code?: string;
};

const ROW_SEP = "|ROW|";

function splitByRow(value: string | undefined): string[][] {
  if (!value) return [];
  return value
    .split(ROW_SEP)
    .map((rowStr) => rowStr.split(",").map((v) => v.trim()));
}

export default function SPFRequestDownload({ spfNumber }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadType, setDownloadType] = useState<"history" | "records" | null>(null);

  const fetchSPFHistory = async (): Promise<VersionRecord[]> => {
    const { data, error } = await supabase
      .from("spf_creation_history")
      .select("*")
      .eq("spf_number", spfNumber)
      .order("version_number", { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const fetchSPFCurrent = async () => {
    const { data: creation, error } = await supabase
      .from("spf_creation")
      .select("*")
      .eq("spf_number", spfNumber)
      .maybeSingle();

    if (error) throw error;

    const { data: request } = await supabase
      .from("spf_request")
      .select("item_description,item_photo,item_code")
      .eq("spf_number", spfNumber)
      .maybeSingle();

    return { creation, request };
  };

  const downloadHistory = async () => {
    const history = await fetchSPFHistory();
    if (history.length === 0) {
      toast.error("No history found for this SPF");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("SPF History");

    // Headers
    const headers = [
      "Version",
      "Version Label",
      "Date Created",
      "Edited By",
      "Status",
      "SPF Number",
      "Item Code",
      "Supplier Brand",
      "Qty",
      "Unit Cost",
      "PCS/Carton",
      "Packaging",
      "Factory Address",
      "Port of Discharge",
      "Subtotal",
      "Company Name",
      "Contact Name",
      "Contact Number",
      "Project Lead Time",
      "Final Selling Cost",
      "Final Unit Cost",
      "Final Subtotal",
      "TDS Brand",
      "Price Validity",
    ];

    ws.addRow(headers);

    // Style header
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Data rows - flatten all versions
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

      // Get max number of options across all rows
      const maxOptions = Math.max(
        ...rowImages.map((arr) => arr.length),
        1
      );

      for (let rowIdx = 0; rowIdx < rowImages.length; rowIdx++) {
        for (let optIdx = 0; optIdx < (rowImages[rowIdx]?.length || 0); optIdx++) {
          if (rowImages[rowIdx][optIdx] && rowImages[rowIdx][optIdx] !== "-") {
            ws.addRow([
              record.version_number,
              record.version_label || `${spfNumber}_v${record.version_number}`,
              record.created_at ? new Date(record.created_at).toLocaleString("en-PH") : "-",
              record.edited_by || "-",
              record.status || "-",
              record.spf_number,
              rowItemCodes[rowIdx]?.[optIdx] || "-",
              rowBrands[rowIdx]?.[optIdx] || "-",
              rowQtys[rowIdx]?.[optIdx] || "-",
              rowUnitCosts[rowIdx]?.[optIdx] || "-",
              rowPcsPerCartons[rowIdx]?.[optIdx] || "-",
              rowPackaging[rowIdx]?.[optIdx] || "-",
              rowFactories[rowIdx]?.[optIdx] || "-",
              rowPorts[rowIdx]?.[optIdx] || "-",
              rowSubtotals[rowIdx]?.[optIdx] || "-",
              rowCompanyNames[rowIdx]?.[optIdx] || "-",
              rowContactNames[rowIdx]?.[optIdx] || "-",
              rowContactNumbers[rowIdx]?.[optIdx] || "-",
              rowLeadTimes[rowIdx]?.[optIdx] || "-",
              rowSellingCosts[rowIdx]?.[optIdx] || "-",
              rowFinalUnitCosts[rowIdx]?.[optIdx] || "-",
              rowFinalSubtotals[rowIdx]?.[optIdx] || "-",
              rowTdsBrands[rowIdx]?.[optIdx] || "-",
              rowPriceValidities[rowIdx]?.[optIdx]
                ? new Date(rowPriceValidities[rowIdx][optIdx]).toLocaleString("en-PH")
                : "-",
            ]);
          }
        }
      }
    }

    // Auto column width
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
    toast.success("History downloaded successfully");
  };

  const downloadRecords = async () => {
    const { creation, request } = await fetchSPFCurrent();
    if (!creation) {
      toast.error("No SPF creation record found");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("SPF Records");

    // Headers
    const headers = [
      "SPF Number",
      "Item Description",
      "Item Code",
      "Supplier Brand",
      "Product Image",
      "Qty",
      "Unit Cost",
      "PCS/Carton",
      "Packaging Details",
      "Factory Address",
      "Port of Discharge",
      "Subtotal",
      "Company Name",
      "Contact Name",
      "Contact Number",
      "Project Lead Time",
      "Final Selling Cost",
      "Final Unit Cost",
      "Final Subtotal",
      "TDS Brand",
      "Dimensional Drawing",
      "Illuminance Drawing",
      "Price Validity",
      "Status",
      "Technical Specification",
    ];

    ws.addRow(headers);

    // Style header
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "70AD47" } };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const rowImages = splitByRow(creation.product_offer_image);
    const rowQtys = splitByRow(creation.product_offer_qty);
    const rowUnitCosts = splitByRow(creation.product_offer_unit_cost);
    const rowPcsPerCartons = splitByRow(creation.product_offer_pcs_per_carton);
    const rowPackaging = splitByRow(creation.product_offer_packaging_details);
    const rowFactories = splitByRow(creation.product_offer_factory_address);
    const rowPorts = splitByRow(creation.product_offer_port_of_discharge);
    const rowSubtotals = splitByRow(creation.product_offer_subtotal);
    const rowBrands = splitByRow(creation.supplier_brand);
    const rowItemCodes = splitByRow(creation.item_code);
    const rowCompanyNames = splitByRow(creation.company_name);
    const rowContactNames = splitByRow(creation.contact_name);
    const rowContactNumbers = splitByRow(creation.contact_number);
    const rowLeadTimes = splitByRow(creation.proj_lead_time);
    const rowSellingCosts = splitByRow(creation.final_selling_cost);
    const rowFinalUnitCosts = splitByRow(creation.final_unit_cost);
    const rowFinalSubtotals = splitByRow(creation.final_subtotal);
    const rowTdsBrands = splitByRow(creation.tds);
    const rowDimensionalDrawings = splitByRow(creation.dimensional_drawing);
    const rowIlluminanceDrawings = splitByRow(creation.illuminance_drawing);
    const rowPriceValidities = splitByRow(creation.price_validity);
    const rowTechSpecs = splitByRow(creation.product_offer_technical_specification);

    const descriptions = (request?.item_description || "")
      .split(",")
      .map((s: string) => s.trim());

    // Data rows
    for (let rowIdx = 0; rowIdx < rowImages.length; rowIdx++) {
      const desc = descriptions[rowIdx] || "-";
      const images = rowImages[rowIdx] || [];
      const qtys = rowQtys[rowIdx] || [];
      const unitCosts = rowUnitCosts[rowIdx] || [];
      const pcsPerCartons = rowPcsPerCartons[rowIdx] || [];
      const packaging = rowPackaging[rowIdx] || [];
      const factories = rowFactories[rowIdx] || [];
      const ports = rowPorts[rowIdx] || [];
      const subtotals = rowSubtotals[rowIdx] || [];
      const brands = rowBrands[rowIdx] || [];
      const itemCodes = rowItemCodes[rowIdx] || [];
      const companyNames = rowCompanyNames[rowIdx] || [];
      const contactNames = rowContactNames[rowIdx] || [];
      const contactNumbers = rowContactNumbers[rowIdx] || [];
      const leadTimes = rowLeadTimes[rowIdx] || [];
      const sellingCosts = rowSellingCosts[rowIdx] || [];
      const finalUnitCosts = rowFinalUnitCosts[rowIdx] || [];
      const finalSubtotals = rowFinalSubtotals[rowIdx] || [];
      const tdsBrands = rowTdsBrands[rowIdx] || [];
      const dimensionalDrawings = rowDimensionalDrawings[rowIdx] || [];
      const illuminanceDrawings = rowIlluminanceDrawings[rowIdx] || [];
      const priceValidities = rowPriceValidities[rowIdx] || [];
      const techSpecs = rowTechSpecs[rowIdx] || [];

      for (let optIdx = 0; optIdx < images.length; optIdx++) {
        if (images[optIdx] && images[optIdx] !== "-") {
          ws.addRow([
            spfNumber,
            desc,
            itemCodes[optIdx] || "-",
            brands[optIdx] || "-",
            images[optIdx] || "-",
            qtys[optIdx] || "-",
            unitCosts[optIdx] || "-",
            pcsPerCartons[optIdx] || "-",
            packaging[optIdx] || "-",
            factories[optIdx] || "-",
            ports[optIdx] || "-",
            subtotals[optIdx] || "-",
            companyNames[optIdx] || "-",
            contactNames[optIdx] || "-",
            contactNumbers[optIdx] || "-",
            leadTimes[optIdx] || "-",
            sellingCosts[optIdx] || "-",
            finalUnitCosts[optIdx] || "-",
            finalSubtotals[optIdx] || "-",
            tdsBrands[optIdx] || "-",
            dimensionalDrawings[optIdx] || "-",
            illuminanceDrawings[optIdx] || "-",
            priceValidities[optIdx]
              ? new Date(priceValidities[optIdx]).toLocaleString("en-PH")
              : "-",
            creation.status || "-",
            techSpecs[optIdx] || "-",
          ]);
        }
      }
    }

    // Auto column width
    ws.columns.forEach((column) => {
      let max = 15;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value?.toString().length || 0;
        if (len > max) max = len;
      });
      column.width = Math.min(max + 4, 50);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${spfNumber}_Records.xlsx`);
    toast.success("Records downloaded successfully");
  };

  const handleDownload = async () => {
    if (!downloadType) return;

    setLoading(true);
    try {
      if (downloadType === "history") {
        await downloadHistory();
      } else {
        await downloadRecords();
      }
      setOpen(false);
      setDownloadType(null);
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 shrink-0 gap-1"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              setDownloadType("history");
              setOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <History className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="font-medium">SPF History</span>
              <span className="text-xs text-muted-foreground">
                All versions of this SPF
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setDownloadType("records");
              setOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span className="font-medium">SPF Records</span>
              <span className="text-xs text-muted-foreground">
                All product offers inside
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Download {downloadType === "history" ? "SPF History" : "SPF Records"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {downloadType === "history" ? (
                <>
                  Download all version history for <strong>{spfNumber}</strong> including all
                  historical product offers, pricing, and status changes.
                </>
              ) : (
                <>
                  Download all current product records for <strong>{spfNumber}</strong>{" "}
                  including all item descriptions, supplier details, and pricing.
                </>
              )}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setDownloadType(null);
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
                  Download Excel
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
