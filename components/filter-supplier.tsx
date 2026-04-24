"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ---------------- Types ---------------- */
export type SupplierFilterValues = {
  company: string;
  internalCode: string;
  email: string;
  hasContacts: boolean | null;
  sortAlpha: "asc" | "desc" | "";
  phoneCountry: string;
  addressCountry: string;
};

type Supplier = {
  id: string;
  company: string;
  addresses?: string[];
  emails?: string[];
  contacts?: { name: string; phone: string }[];
  [key: string]: any;
};

type FilterSupplierProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: SupplierFilterValues) => void;
  suppliers?: Supplier[];
};

/* ---------------- Helper ---------------- */

/**
 * Known alias map — any segment that matches a key (case-insensitive)
 * gets replaced with the canonical country name before returning.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  "p.r. china":        "China",
  "p.r.china":         "China",
  "pr china":          "China",
  "prc":               "China",
  "people's republic of china": "China",
  "peoples republic of china":  "China",
  "republic of korea": "South Korea",
  "rok":               "South Korea",
  "republic of china": "Taiwan",
  "usa":               "United States",
  "us":                "United States",
  "u.s.a.":            "United States",
  "u.s.":              "United States",
  "uk":                "United Kingdom",
  "u.k.":              "United Kingdom",
  "uae":               "United Arab Emirates",
};

function extractCountryFromAddress(address: string): string | null {
  if (!address?.trim()) return null;

  // Normalise separators
  const normalised = address.replace(/[，/\n]/g, ",");

  const parts = normalised
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  // Walk from the end to find the first clean, letters-only segment
  for (let i = parts.length - 1; i >= 0; i--) {
    const segment = parts[i];

    // Must have NO digits
    if (/\d/.test(segment)) continue;

    // Must be between 2 and 50 characters
    if (segment.length < 2 || segment.length > 50) continue;

    // Strip trailing punctuation (e.g. "China." → "China")
    const cleaned = segment.replace(/[.\-,;:!?]+$/, "").trim();
    if (!cleaned) continue;

    const lower = cleaned.toLowerCase();

    // Check alias map first (exact match)
    if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];

    // Check if segment ENDS WITH a known country word
    // e.g. "Guangdong Priv. China" → ends with "china" → "China"
    const knownCountries = [
      "china", "netherlands", "germany", "france", "japan", "korea",
      "india", "taiwan", "thailand", "vietnam", "indonesia", "malaysia",
      "singapore", "philippines", "australia", "canada", "mexico",
      "brazil", "turkey", "italy", "spain", "poland", "sweden",
      "norway", "denmark", "finland", "belgium", "switzerland",
      "austria", "portugal", "greece", "czechia", "hungary",
      "romania", "ukraine", "israel", "pakistan", "bangladesh",
      "sri lanka", "myanmar", "cambodia", "laos", "nepal",
      "egypt", "nigeria", "kenya", "ghana", "ethiopia", "tanzania",
      "south africa", "morocco", "algeria", "tunisia",
      "saudi arabia", "iran", "iraq", "jordan", "lebanon",
      "new zealand", "argentina", "chile", "colombia", "peru",
    ];
    for (const knownCountry of knownCountries) {
      if (lower === knownCountry || lower.endsWith(" " + knownCountry)) {
        return knownCountry.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // Fallback: title-case the cleaned segment
    const titleCased = cleaned.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    return titleCased;

  }

  return null;
}

/* ---------------- AddressCountryCombobox ---------------- */
type AddressCountryComboboxProps = {
  options: string[];
  value: string;
  onChange: (val: string) => void;
};

function AddressCountryCombobox({
  options,
  value,
  onChange,
}: AddressCountryComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-sm">
            {value || (
              <span className="text-muted-foreground">Any country…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* ← fixed width + z-index so it doesn't get clipped by Dialog */}
      <PopoverContent
        className="p-0 w-[380px]"
        align="start"
        side="bottom"
        style={{ zIndex: 9999 }}
      >
        <Command>
          <CommandInput placeholder="Search country…" className="h-9" />
          {/* ← explicit height + overflow-y-auto so mouse-wheel scroll works */}
          <CommandList
className="max-h-[200px] overflow-y-auto"
            style={{ overflowY: "auto" }}
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__any__"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <span className="flex-1 text-sm text-muted-foreground italic">
                  Any
                </span>
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    value === "" ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>

              {options.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={(selected) => {
                    onChange(selected === value ? "" : selected);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex-1 text-sm">{country}</span>
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      value === country ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- FilterSupplier ---------------- */
export default function FilterSupplier({
  open,
  onOpenChange,
  onApply,
  suppliers = [],
}: FilterSupplierProps) {
  const [company, setCompany] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [email, setEmail] = useState("");
  const [hasContacts, setHasContacts] = useState<boolean | null>(null);
  const [sortAlpha, setSortAlpha] = useState<"asc" | "desc" | "">("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [addressCountry, setAddressCountry] = useState("");

  /* Derive unique, deduplicated, title-cased countries from all addresses */
  const addressCountryOptions = useMemo(() => {
    const countrySet = new Set<string>();
    suppliers.forEach((s) => {
      s.addresses?.forEach((addr) => {
        const country = extractCountryFromAddress(addr);
        if (country) countrySet.add(country);
      });
    });
    return Array.from(countrySet).sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const handleApply = () => {
    onApply({
      company,
      internalCode,
      email,
      hasContacts,
      sortAlpha,
      phoneCountry,
      addressCountry,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setCompany("");
    setInternalCode("");
    setEmail("");
    setHasContacts(null);
    setSortAlpha("");
    setPhoneCountry("");
    setAddressCountry("");
    onApply({
      company: "",
      internalCode: "",
      email: "",
      hasContacts: null,
      sortAlpha: "",
      phoneCountry: "",
      addressCountry: "",
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
          <div>
            <label className="font-medium">Company Name</label>
            <input
              className="w-full h-9 border rounded-md px-3"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Internal Code */}
          <div>
            <label className="font-medium">Internal Code</label>
            <input
              className="w-full h-9 border rounded-md px-3"
              value={internalCode}
              onChange={(e) => setInternalCode(e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className="font-medium">Email Contains</label>
            <input
              className="w-full h-9 border rounded-md px-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Has Contacts */}
          <div>
            <label className="font-medium">Has Contacts</label>
            <select
              className="w-full h-9 border rounded-md px-3"
              value={hasContacts === null ? "" : hasContacts ? "yes" : "no"}
              onChange={(e) => {
                if (!e.target.value) setHasContacts(null);
                else setHasContacts(e.target.value === "yes");
              }}
            >
              <option value="">Any</option>
              <option value="yes">With Contacts</option>
              <option value="no">Without Contacts</option>
            </select>
          </div>

          {/* Address Country — fuzzy searchable combobox */}
          <div className="space-y-1">
            <label className="font-medium">Address Country</label>
            {addressCountryOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">
                No countries detected in address data yet.
              </p>
            ) : (
              <AddressCountryCombobox
                options={addressCountryOptions}
                value={addressCountry}
                onChange={setAddressCountry}
              />
            )}
          </div>

          {/* Phone Country */}
          <div>
            <label className="font-medium">Contact Phone Country</label>
            <input
              className="w-full h-9 border rounded-md px-3"
              placeholder="e.g. CN, US, PH"
              value={phoneCountry}
              onChange={(e) => setPhoneCountry(e.target.value.toUpperCase())}
            />
          </div>

          {/* Alphabetical Sort */}
          <div>
            <label className="font-medium">Alphabetical Order</label>
            <select
              className="w-full h-9 border rounded-md px-3"
              value={sortAlpha}
              onChange={(e) =>
                setSortAlpha(e.target.value as "asc" | "desc" | "")
              }
            >
              <option value="">None</option>
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply Filter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
