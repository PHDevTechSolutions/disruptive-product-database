"use client";

import * as React from "react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/* ---------------- Types ---------------- */
export type SupplierFilterValues = {
  company: string;
  internalCode: string;
  email: string;
  hasContacts: boolean | null;
};

type FilterSupplierProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: SupplierFilterValues) => void;
};

/* ---------------- Component ---------------- */
export default function FilterSupplier({
  open,
  onOpenChange,
  onApply,
}: FilterSupplierProps) {
  const [company, setCompany] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [email, setEmail] = useState("");
  const [hasContacts, setHasContacts] = useState<boolean | null>(null);

  const handleApply = () => {
    onApply({
      company,
      internalCode,
      email,
      hasContacts,
    });

    onOpenChange(false);
  };

  const handleClear = () => {
    setCompany("");
    setInternalCode("");
    setEmail("");
    setHasContacts(null);

    onApply({
      company: "",
      internalCode: "",
      email: "",
      hasContacts: null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Suppliers</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 text-sm">
          {/* Company */}
          <div className="space-y-1">
            <label className="font-medium">Company Name</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Enter company name"
              className="w-full h-9 rounded-md border px-3"
            />
          </div>

          {/* Internal Code */}
          <div className="space-y-1">
            <label className="font-medium">Internal Code</label>
            <input
              type="text"
              value={internalCode}
              onChange={(e) => setInternalCode(e.target.value)}
              placeholder="Enter internal code"
              className="w-full h-9 rounded-md border px-3"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="font-medium">Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full h-9 rounded-md border px-3"
            />
          </div>

          {/* Contacts */}
          <div className="space-y-1">
            <label className="font-medium">Has Contacts</label>
            <select
              value={
                hasContacts === null
                  ? ""
                  : hasContacts
                  ? "yes"
                  : "no"
              }
              onChange={(e) => {
                if (e.target.value === "") setHasContacts(null);
                else setHasContacts(e.target.value === "yes");
              }}
              className="w-full h-9 rounded-md border px-3"
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button
            variant="secondary"
            onClick={handleClear}
            className="cursor-pointer"
          >
            Clear
          </Button>

          <Button
            onClick={handleApply}
            className="cursor-pointer"
          >
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
