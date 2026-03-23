"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Plus, Minus, ChevronsUpDown, Check, Phone } from "lucide-react";
import {
  getCountries,
  getCountryCallingCode,
  CountryCode,
} from "libphonenumber-js";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { logSupplierEvent } from "@/lib/auditlogger"; // ✅ AUDIT

/* ─────────────────────────────────────────────
   Country display helpers
───────────────────────────────────────────── */
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

type CountryOption = {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

const ALL_COUNTRIES: CountryOption[] = getCountries()
  .map((code) => {
    try {
      return {
        code,
        name: regionNames.of(code) ?? code,
        dialCode: `+${getCountryCallingCode(code)}`,
        flag: code
          .toUpperCase()
          .replace(/./g, (c) =>
            String.fromCodePoint(127397 + c.charCodeAt(0)),
          ),
      };
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .sort((a, b) => a!.name.localeCompare(b!.name)) as CountryOption[];

/* ─────────────────────────────────────────────
   CountryCombobox
───────────────────────────────────────────── */
type CountryComboboxProps = {
  value: CountryCode;
  onChange: (code: CountryCode, dialCode: string) => void;
};

function CountryCombobox({ value, onChange }: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = ALL_COUNTRIES.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[160px] justify-between font-normal shrink-0"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-base leading-none">{selected?.flag}</span>
            <span className="text-sm">{selected?.dialCode}</span>
            <span className="text-xs text-muted-foreground truncate">
              {selected?.name}
            </span>
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" className="h-9" />
          <CommandList className="max-h-60">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {ALL_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.dialCode} ${country.code}`}
                  onSelect={() => {
                    onChange(country.code, country.dialCode);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-base">{country.flag}</span>
                  <span className="flex-1 truncate text-sm">{country.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {country.dialCode}
                  </span>
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      value === country.code ? "opacity-100" : "opacity-0",
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

/* ─────────────────────────────────────────────
   PhoneField
───────────────────────────────────────────── */
type PhoneFieldProps = {
  value: string;
  onChange: (val: string) => void;
  defaultCountry?: CountryCode;
};

function PhoneField({
  value,
  onChange,
  defaultCountry = "CN",
}: PhoneFieldProps) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [localNumber, setLocalNumber] = useState("");

  useEffect(() => {
    if (!value) return;
    const matched = ALL_COUNTRIES.find(
      (c) => value.startsWith(c.dialCode) && c.dialCode.length > 1,
    );
    if (matched) {
      setCountry(matched.code);
      setLocalNumber(value.slice(matched.dialCode.length).trim());
    } else {
      setLocalNumber(value.replace(/^\+/, ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCountryChange = (code: CountryCode, dialCode: string) => {
    setCountry(code);
    const digits = localNumber.replace(/\D/g, "");
    onChange(`${dialCode}${digits}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-().]/g, "");
    setLocalNumber(raw);
    const dialCode = `+${getCountryCallingCode(country)}`;
    const digits = raw.replace(/\D/g, "");
    onChange(digits ? `${dialCode}${digits}` : "");
  };

  const dialCode = `+${getCountryCallingCode(country)}`;

  return (
    <div className="flex gap-2 items-center w-full">
      <CountryCombobox value={country} onChange={handleCountryChange} />
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none pointer-events-none">
          {dialCode}
        </span>
        <Input
          value={localNumber}
          onChange={handleNumberChange}
          placeholder="XXX XXXX XXXX"
          className="pl-14"
          inputMode="tel"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  ReferenceID: string;
};

type AddSupplierProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/* ─────────────────────────────────────────────
   AddSupplier
───────────────────────────────────────────── */
function AddSupplier({ open, onOpenChange }: AddSupplierProps) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  const [companyError, setCompanyError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isDuplicateCompany, setIsDuplicateCompany] = useState(false);

  const [company, setCompany] = useState("");
  const [supplierBrand, setSupplierBrand] = useState("");
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [emails, setEmails] = useState<string[]>([""]);
  const [website, setWebsite] = useState<string[]>([""]);

  const [contactNames, setContactNames] = useState<string[]>([""]);
  const [contactNumbers, setContactNumbers] = useState<string[]>([""]);
  const [contactTypes, setContactTypes] = useState<("phone" | "other")[]>(["phone"]);

  const [forteProducts, setForteProducts] = useState<string[]>([""]);
  const [products, setProducts] = useState<string[]>([""]);
  const [certificates, setCertificates] = useState<string[]>([""]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        setUser({
          Firstname: data.Firstname ?? "",
          Lastname: data.Lastname ?? "",
          Role: data.Role ?? "",
          Email: data.Email ?? "",
          ReferenceID: data.ReferenceID ?? "",
        });
      })
      .catch((err) => console.error("AddSupplier user fetch error:", err));
  }, [userId]);

  useEffect(() => {
    if (!company.trim()) {
      setCompanyError("");
      setIsDuplicateCompany(false);
      return;
    }
    const check = async () => {
      const snap = await getDocs(collection(db, "suppliers"));
      const exists = snap.docs.some(
        (d) =>
          d.data().isActive !== false &&
          d.data().company?.toLowerCase() === company.toLowerCase(),
      );
      if (exists) {
        setCompanyError("Company already exists");
        setIsDuplicateCompany(true);
      } else {
        setCompanyError("");
        setIsDuplicateCompany(false);
      }
    };
    check();
  }, [company]);

  useEffect(() => {
    const invalid = emails.some((e) => e && !e.includes("@"));
    setEmailError(invalid ? "One or more emails are invalid" : "");
  }, [emails]);

  const updateList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => setter((prev) => prev.map((item, i) => (i === index ? value : item)));

  const addRowAfter = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) =>
    setter((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, "");
      return copy;
    });

  const removeRow = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) =>
    setter((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );

  const updateContactType = (index: number, value: "phone" | "other") =>
    setContactTypes((prev) =>
      prev.map((item, i) => (i === index ? value : item)),
    );

  const addContactTypeAfter = (index: number) =>
    setContactTypes((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, "phone");
      return copy;
    });

  const removeContactType = (index: number) =>
    setContactTypes((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );

  const resetForm = () => {
    setCompany("");
    setSupplierBrand("");
    setAddresses([""]);
    setEmails([""]);
    setWebsite([""]);
    setContactNames([""]);
    setContactNumbers([""]);
    setContactTypes(["phone"]);
    setForteProducts([""]);
    setProducts([""]);
    setCertificates([""]);
  };

  /* ── Save ── */
  const handleSaveSupplier = async () => {
    try {
      if (!company.trim()) {
        toast.error("Company is required");
        return;
      }

      const supplierData = {
        company,
        supplierBrand,
        addresses: addresses.filter(Boolean),
        emails: emails.filter(Boolean),
        website: website.filter(Boolean),
        contacts: contactNames.map((name, index) => ({
          name,
          phone: contactNumbers[index]
            ? contactNumbers[index].replace(/[^\d+]/g, "")
            : "",
        })),
        forteProducts: forteProducts.filter(Boolean),
        products: products.filter(Boolean),
        certificates: certificates.filter(Boolean),
        createdBy: userId || null,
        referenceID: user?.ReferenceID || null,
        isActive: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "suppliers"), supplierData);

      await updateDoc(doc(db, "suppliers", docRef.id), {
        supplierId: docRef.id,
        supplierbrandId: docRef.id,
        whatHappened: "Supplier Added",
        date_updated: serverTimestamp(),
      });

      // ✅ AUDIT LOG
      await logSupplierEvent({
        whatHappened  : "Supplier Added",
        supplierId    : docRef.id,
        supplierbrandId: docRef.id,
        company,
        supplierBrand,
        referenceID   : user?.ReferenceID,
        userId        : userId ?? undefined,
      });

      toast.success("Supplier saved successfully", { description: company });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Failed to save supplier");
    }
  };

  const renderListRows = (
    items: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string,
    multiline = false,
  ) =>
    items.map((item, index) => (
      <div
        key={index}
        className={cn(
          "grid gap-2 items-start",
          multiline ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto]",
        )}
      >
        {multiline ? (
          <Textarea
            value={item}
            onChange={(e) => updateList(setter, index, e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <Input
            value={item}
            onChange={(e) => updateList(setter, index, e.target.value)}
            placeholder={placeholder}
          />
        )}
        <div className={cn("flex gap-1", multiline && "pt-2")}>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="cursor-pointer"
            onClick={() => addRowAfter(setter, index)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="cursor-pointer"
            disabled={items.length === 1}
            onClick={() => removeRow(setter, index)}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    ));

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-6 z-50 pb-[140px]">
        <SheetHeader>
          <SheetTitle>Add Supplier</SheetTitle>
          <SheetDescription>Enter supplier information</SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {user && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40 mb-6">
            <div>
              <span className="font-medium">Welcome:</span> {user.Firstname}{" "}
              {user.Lastname}
            </div>
            <div>
              <span className="font-medium">Role:</span> {user.Role}
            </div>
            <div>
              <span className="font-medium">Email:</span> {user.Email}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
              />
              {companyError && (
                <p className="text-sm text-red-600">{companyError}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Supplier Brand</Label>
              <Input
                value={supplierBrand}
                onChange={(e) => setSupplierBrand(e.target.value)}
                placeholder="Brand name"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Addresses</Label>
            {renderListRows(addresses, setAddresses, "Full address", true)}
          </div>

          <div className="space-y-3">
            <Label>Emails</Label>
            {emails.map((mail, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <Input
                  type="email"
                  value={mail}
                  placeholder="company@email.com"
                  onChange={(e) => updateList(setEmails, index, e.target.value)}
                />
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" className="cursor-pointer" onClick={() => addRowAfter(setEmails, index)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="cursor-pointer" disabled={emails.length === 1} onClick={() => removeRow(setEmails, index)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          </div>

          <div className="space-y-3">
            <Label>Website (optional)</Label>
            {renderListRows(website, setWebsite, "https://example.com")}
          </div>

          <div className="space-y-3">
            <Label>Contacts</Label>
            {contactNames.map((_, index) => (
              <div key={index} className="space-y-2 rounded-md border p-3 bg-muted/20">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <Input
                    placeholder="Contact Name"
                    value={contactNames[index]}
                    onChange={(e) => updateList(setContactNames, index, e.target.value)}
                  />
                  <select
                    className="h-10 rounded-md border px-2 text-sm bg-background"
                    value={contactTypes[index]}
                    onChange={(e) => updateContactType(index, e.target.value as "phone" | "other")}
                  >
                    <option value="phone">Phone</option>
                    <option value="other">Others</option>
                  </select>
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="outline" onClick={() => { addRowAfter(setContactNames, index); addRowAfter(setContactNumbers, index); addContactTypeAfter(index); }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" disabled={contactNames.length === 1} onClick={() => { removeRow(setContactNames, index); removeRow(setContactNumbers, index); removeContactType(index); }}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {contactTypes[index] === "phone" ? (
                  <PhoneField value={contactNumbers[index]} onChange={(val) => updateList(setContactNumbers, index, val)} defaultCountry="CN" />
                ) : (
                  <Input placeholder="WeChat / TikTok / etc" value={contactNumbers[index]} onChange={(e) => updateList(setContactNumbers, index, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Label>Forte Products (optional)</Label>
            {renderListRows(forteProducts, setForteProducts, "Forte product")}
          </div>

          <div className="space-y-3">
            <Label>Products (optional)</Label>
            {renderListRows(products, setProducts, "Product")}
          </div>

          <div className="space-y-3">
            <Label>Certificates (optional)</Label>
            {renderListRows(certificates, setCertificates, "Certificate")}
          </div>
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="secondary" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={handleSaveSupplier}
            disabled={isDuplicateCompany || !!emailError || !company.trim()}
          >
            Save Supplier
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AddSupplier;
