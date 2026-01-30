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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ---------------- Types ---------------- */

export type SupplierConflict = {
  supplierId: string; // firestore doc id (important for update)
  company: string;

  existing: {
    internalCode?: string;
    addresses?: string[];
    emails?: string[];
    website?: string;
    contacts?: { name: string; phone: string }[];
    forteProducts?: string[];
    products?: string[];
    certificates?: string[];
  };

  incoming: {
    internalCode?: string;
    addresses?: string[];
    emails?: string[];
    website?: string;
    contacts?: { name: string; phone: string }[];
    forteProducts?: string[];
    products?: string[];
    certificates?: string[];
  };
};

type UploadSupplierWarningProps = {
  open: boolean;
  conflicts: SupplierConflict[];

  /** referenceID of the current user (ex: DV-CSR-177009) */
  performedByReferenceID?: string;

  onCancel: () => void;
  onProceed: () => void;
};

/* ---------------- Helpers ---------------- */

const join = (arr?: string[]) =>
  arr && arr.length ? arr.join(" | ") : "-";

const joinContacts = (
  arr?: { name: string; phone: string }[],
) =>
  arr && arr.length
    ? arr.map(c => `${c.name} (${c.phone})`).join(" | ")
    : "-";

/* ---------------- Component ---------------- */

export default function UploadSupplierWarning({
  open,
  conflicts,
  performedByReferenceID,
  onCancel,
  onProceed,
}: UploadSupplierWarningProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            Duplicate Supplier Detected
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            The following supplier(s) already exist but contain different data.
            Proceeding will <b>overwrite</b> the existing information.
          </p>

          {performedByReferenceID && (
            <p>
              Action will be recorded under reference:&nbsp;
              <b>{performedByReferenceID}</b>
            </p>
          )}
        </div>

        <ScrollArea className="max-h-[420px] mt-4 pr-3">
          <div className="space-y-6">
            {conflicts.map((c, i) => (
              <div
                key={i}
                className="border rounded-md p-4 space-y-3"
              >
                <h3 className="font-semibold underline">
                  {c.company}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* EXISTING */}
                  <div className="border rounded-md p-3">
                    <h4 className="font-medium mb-2">
                      Existing Data
                    </h4>

                    <div><b>Internal Code:</b> {c.existing.internalCode || "-"}</div>
                    <div><b>Addresses:</b> {join(c.existing.addresses)}</div>
                    <div><b>Emails:</b> {join(c.existing.emails)}</div>
                    <div><b>Website:</b> {c.existing.website || "-"}</div>
                    <div><b>Contacts:</b> {joinContacts(c.existing.contacts)}</div>
                    <div><b>Forte Products:</b> {join(c.existing.forteProducts)}</div>
                    <div><b>Products:</b> {join(c.existing.products)}</div>
                    <div><b>Certificates:</b> {join(c.existing.certificates)}</div>
                  </div>

                  {/* INCOMING */}
                  <div className="border rounded-md p-3 bg-muted/30">
                    <h4 className="font-medium mb-2">
                      Incoming (Excel)
                    </h4>

                    <div><b>Internal Code:</b> {c.incoming.internalCode || "-"}</div>
                    <div><b>Addresses:</b> {join(c.incoming.addresses)}</div>
                    <div><b>Emails:</b> {join(c.incoming.emails)}</div>
                    <div><b>Website:</b> {c.incoming.website || "-"}</div>
                    <div><b>Contacts:</b> {joinContacts(c.incoming.contacts)}</div>
                    <div><b>Forte Products:</b> {join(c.incoming.forteProducts)}</div>
                    <div><b>Products:</b> {join(c.incoming.products)}</div>
                    <div><b>Certificates:</b> {join(c.incoming.certificates)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={onProceed}
          >
            Proceed Anyway (Overwrite)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
