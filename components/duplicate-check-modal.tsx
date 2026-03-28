"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, SkipForward, Upload } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type DuplicateRow = {
  /** A unique key for this row (company name, productReferenceID, etc.) */
  key: string;
  /** Column headers to display */
  columns: string[];
  /** Values matching the columns array */
  values: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title shown at the top of the modal */
  title?: string;
  /** The duplicate rows to display */
  duplicates: DuplicateRow[];
  /** Called when the user clicks "Skip Duplicates" — upload only non-duplicates */
  onSkipDuplicates: () => void;
  /** Called when the user clicks "Upload All" — upload everything including duplicates */
  onUploadAll: () => void;
  /** Whether an upload is currently in progress (disables buttons) */
  uploading?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function DuplicateCheckModal({
  open,
  onOpenChange,
  title = "Duplicates Detected",
  duplicates,
  onSkipDuplicates,
  onUploadAll,
  uploading = false,
}: Props) {
  if (!duplicates.length) return null;

  const columns = duplicates[0]?.columns ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* ── Info Banner ── */}
        <div className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            The following{" "}
            <Badge variant="outline" className="text-amber-700 border-amber-400 mx-1">
              {duplicates.length} row{duplicates.length > 1 ? "s" : ""}
            </Badge>{" "}
            already exist in the system. Choose how to proceed below.
          </span>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-amber-50 border-b z-10">
              <tr>
                <th className="p-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="p-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {duplicates.map((row, i) => (
                <tr
                  key={row.key}
                  className="hover:bg-amber-50/50 transition-colors"
                >
                  <td className="p-2 text-xs text-muted-foreground">{i + 1}</td>
                  {row.values.map((val, vi) => (
                    <td key={vi} className="p-2 text-xs max-w-[200px] truncate" title={val}>
                      {val || <span className="text-muted-foreground italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="shrink-0 gap-2 flex-col sm:flex-row">
          <p className="text-xs text-muted-foreground flex-1 self-center hidden sm:block">
            "Skip" ignores duplicates. "Upload All" will overwrite existing records.
          </p>
          <Button
            variant="outline"
            onClick={onSkipDuplicates}
            disabled={uploading}
            className="gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip Duplicates
          </Button>
          <Button
            onClick={onUploadAll}
            disabled={uploading}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Upload className="w-4 h-4" />
            Upload All (Overwrite)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
