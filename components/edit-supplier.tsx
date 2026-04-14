"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Plus, Minus, ChevronsUpDown, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";

import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";

import { logSupplierEvent } from "@/lib/auditlogger"; // ✅ AUDIT
import RequestApprovalDialog from "@/components/request-approval-dialog";

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
          className="w-40 justify-between font-normal shrink-0"
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

      <PopoverContent className="w-70 p-0" align="start">
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

import {
  createApprovalRequest,
  getApprovalUserProfile,
  shouldRequireApproval,
} from "@/lib/for-approval";

/* ---------------- Types ---------------- */
type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  ReferenceID: string;
};

type EditSupplierProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
};

/* ---------------- Component ---------------- */
function EditSupplier({ open, onOpenChange, supplier }: EditSupplierProps) {
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
  const [requestApprovalOpen, setRequestApprovalOpen] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);

  useEffect(() => {
    if (!company.trim()) {
      setCompanyError("");
      setIsDuplicateCompany(false);
      return;
    }

    const checkDuplicateCompany = async () => {
      const snap = await getDocs(collection(db, "suppliers"));
      const exists = snap.docs.some((d) => {
        if (d.id === supplier?.id) return false;
        const data = d.data();
        return (
          data.isActive !== false &&
          data.company?.toLowerCase() === company.toLowerCase()
        );
      });
      if (exists) {
        setCompanyError("Company already exists");
        setIsDuplicateCompany(true);
      } else {
        setCompanyError("");
        setIsDuplicateCompany(false);
      }
    };

    checkDuplicateCompany();
  }, [company, supplier?.id]);

  useEffect(() => {
    const invalid = emails.some((e) => e && !e.includes("@"));
    setEmailError(invalid ? "One or more emails are invalid" : "");
  }, [emails]);

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
      .catch((err) => console.error("EditSupplier user fetch error:", err));
  }, [userId]);

  useEffect(() => {
    if (!supplier) return;

    setCompany(supplier.company || "");
    setSupplierBrand(supplier.supplierBrand || "");
    setAddresses(supplier.addresses?.length > 0 ? supplier.addresses : [""]);
    setEmails(supplier.emails?.length > 0 ? supplier.emails : [""]);
    setWebsite(supplier.website?.length > 0 ? supplier.website : [""]);

    if (supplier.contacts?.length > 0) {
      setContactNames(supplier.contacts.map((c: any) => c.name || ""));
      setContactNumbers(supplier.contacts.map((c: any) => c.phone ? c.phone.replace(/[^\d+]/g, "") : ""));
      setContactTypes(supplier.contacts.map((c: any) => c.phone && c.phone.startsWith("+") ? "phone" : "other"));
    } else {
      setContactNames([""]);
      setContactNumbers([""]);
    }

    setForteProducts(supplier.forteProducts?.length > 0 ? supplier.forteProducts : [""]);
    setProducts(supplier.products?.length > 0 ? supplier.products : [""]);
    setCertificates(supplier.certificates?.length > 0 ? supplier.certificates : [""]);
  }, [supplier]);

  /* ---------------- Helpers ---------------- */
  const updateContactType = (index: number, value: "phone" | "other") =>
    setContactTypes((prev) => prev.map((item, i) => (i === index ? value : item)));

  const addContactTypeAfter = (index: number) =>
    setContactTypes((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, "phone");
      return copy;
    });

  const removeContactType = (index: number) =>
    setContactTypes((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

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
    setter((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  /* ---------------- Save ---------------- */
  const handleSaveSupplier = async () => {
    try {
      if (!company.trim()) { toast.error("Company is required"); return; }
      if (isDuplicateCompany) { toast.error("Company already exists"); return; }
      if (emailError) { toast.error("Please fix invalid email(s)"); return; }

      const profile = userId ? await getApprovalUserProfile(userId) : null;
      const requiresApproval = shouldRequireApproval(profile);
      if (requiresApproval) {
        setRequestApprovalOpen(true);
        return;
      }

      /* 1️⃣ UPDATE SUPPLIER */
      await updateDoc(doc(db, "suppliers", supplier.id), {
        supplierId      : supplier.id,
        supplierbrandId : supplier.id,
        company         : company.trim(),
        supplierBrand   : supplierBrand.trim(),
        addresses       : addresses.filter(Boolean),
        emails          : emails.filter(Boolean),
        website         : website.filter(Boolean),
        contacts        : contactNames.map((name, index) => ({ name, phone: contactNumbers[index] || "" })).filter((c) => c.name || c.phone),
        forteProducts   : forteProducts.filter(Boolean),
        products        : products.filter(Boolean),
        certificates    : certificates.filter(Boolean),
        referenceID     : user?.ReferenceID || supplier.referenceID || null,
        whatHappened    : "Supplier Edited",
        date_updated    : serverTimestamp(),
        updatedAt       : serverTimestamp(),
      });

      /* 2️⃣ UPDATE SUPPLIER NAME IN PRODUCTS */
      const q = query(collection(db, "products"), where("supplier.supplierId", "==", supplier.id));
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((p) => {
          const data = p.data();
          if (!data.supplier) return Promise.resolve();
          return updateDoc(p.ref, {
            supplier: { ...data.supplier, company: company.trim(), supplierBrand: supplierBrand.trim() },
          });
        }),
      );

      // ✅ AUDIT LOG
      await logSupplierEvent({
        whatHappened  : "Supplier Edited",
        supplierId    : supplier.id,
        supplierbrandId: supplier.id,
        company       : company.trim(),
        supplierBrand : supplierBrand.trim(),
        referenceID   : user?.ReferenceID,
        userId        : userId ?? undefined,
      });

      toast.success("Supplier updated everywhere", { description: company });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Failed to save supplier");
    }
  };

  const handleRequestApproval = async (message: string) => {
    try {
      if (!userId) return;
      setRequestingApproval(true);
      const profile = await getApprovalUserProfile(userId);
      if (!profile) {
        toast.error("User profile not loaded");
        return;
      }
      await createApprovalRequest({
        actionType: "supplier_edit",
        entityLabel: company.trim() || supplier?.company || "Supplier",
        requester: profile,
        message,
        summary: `Edit supplier: ${company.trim() || supplier?.company || ""}`,
        payload: {
          supplierId: supplier?.id ?? null,
          company: company.trim(),
          supplierBrand: supplierBrand.trim(),
          addresses: addresses.filter(Boolean),
          emails: emails.filter(Boolean),
          website: website.filter(Boolean),
          contacts: contactNames.map((name, index) => ({ name, phone: contactNumbers[index] || "" })).filter((c) => c.name || c.phone),
          forteProducts: forteProducts.filter(Boolean),
          products: products.filter(Boolean),
          certificates: certificates.filter(Boolean),
        },
      });
      await logSupplierEvent({
        whatHappened: "Supplier For Approval Requested",
        supplierId: supplier?.id,
        supplierbrandId: supplier?.id,
        company: company.trim(),
        supplierBrand: supplierBrand.trim(),
        referenceID: profile.referenceID,
        userId,
      });
      toast.success("Request sent for approval");
      setRequestApprovalOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Request approval failed:", error);
      toast.error("Failed to send approval request");
    } finally {
      setRequestingApproval(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-6">
        <SheetHeader>
          <SheetTitle>Edit Supplier</SheetTitle>
          <SheetDescription>Enter supplier information</SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {user && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
            <div><span className="font-medium">Welcome:</span> {user.Firstname} {user.Lastname}</div>
            <div><span className="font-medium">Role:</span> {user.Role}</div>
            <div><span className="font-medium">Email:</span> {user.Email}</div>
          </div>
        )}

        <div className="space-y-6 mt-4">
          {/* Company + Brand */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
              {companyError && <p className="text-sm text-red-600">{companyError}</p>}
            </div>
            <div className="space-y-1">
              <Label>Supplier Brand</Label>
              <Input value={supplierBrand} onChange={(e) => setSupplierBrand(e.target.value)} placeholder="Brand name" />
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-3">
            <Label>Addresses</Label>
            {addresses.map((addr, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                <Textarea value={addr} onChange={(e) => updateList(setAddresses, index, e.target.value)} placeholder="Full address" className="min-h-20" />
                <div className="flex flex-col gap-1">
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => addRowAfter(setAddresses, index)}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" disabled={addresses.length === 1} onClick={() => removeRow(setAddresses, index)}><Minus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Emails */}
          <div className="space-y-3">
            <Label>Emails</Label>
            {emails.map((mail, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input type="email" value={mail} placeholder="company@email.com" onChange={(e) => updateList(setEmails, index, e.target.value)} />
                {emailError && <p className="text-sm text-red-600">{emailError}</p>}
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => addRowAfter(setEmails, index)}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={emails.length === 1} onClick={() => removeRow(setEmails, index)}><Minus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Website */}
          <div className="space-y-3">
            <Label>Website (optional)</Label>
            {website.map((site, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input value={site} placeholder="https://example.com" onChange={(e) => updateList(setWebsite, index, e.target.value)} />
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => addRowAfter(setWebsite, index)}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={website.length === 1} onClick={() => removeRow(setWebsite, index)}><Minus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <Label>Contacts</Label>
            {contactNames.map((_, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input placeholder="Contact Name" value={contactNames[index]} onChange={(e) => updateList(setContactNames, index, e.target.value)} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-25 justify-between font-normal"
                    >
                      {contactTypes[index] === "phone" ? "Phone" : "Others"}
                      <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-30 p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => updateContactType(index, "phone")}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                contactTypes[index] === "phone" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Phone
                          </CommandItem>
                          <CommandItem
                            onSelect={() => updateContactType(index, "other")}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                contactTypes[index] === "other" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Others
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex gap-1 justify-end">
                  <Button type="button" size="icon" variant="outline" onClick={() => { addRowAfter(setContactNames, index); addRowAfter(setContactNumbers, index); addContactTypeAfter(index); }}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={contactNames.length === 1} onClick={() => { removeRow(setContactNames, index); removeRow(setContactNumbers, index); removeContactType(index); }}><Minus className="h-4 w-4" /></Button>
                </div>
                <div className="col-span-3">
                  {contactTypes[index] === "phone" ? (
                    <PhoneField value={contactNumbers[index]} onChange={(val) => updateList(setContactNumbers, index, val)} defaultCountry="CN" />
                  ) : (
                    <Input placeholder="WeChat / TikTok / etc" value={contactNumbers[index]} onChange={(e) => updateList(setContactNumbers, index, e.target.value)} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Forte Products */}
          <div className="space-y-3">
            <Label>Forte Products (optional)</Label>
            {forteProducts.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input value={item} placeholder="Forte product" onChange={(e) => updateList(setForteProducts, index, e.target.value)} />
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => addRowAfter(setForteProducts, index)}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={forteProducts.length === 1} onClick={() => removeRow(setForteProducts, index)}><Minus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Products */}
          <div className="space-y-3">
            <Label>Products (optional)</Label>
            {products.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input value={item} placeholder="Product" onChange={(e) => updateList(setProducts, index, e.target.value)} />
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => addRowAfter(setProducts, index)}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={products.length === 1} onClick={() => removeRow(setProducts, index)}><Minus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Certificates */}
          <div className="space-y-3">
            <Label>Certificates (optional)</Label>
            {certificates.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input value={item} placeholder="Certificate" onChange={(e) => updateList(setCertificates, index, e.target.value)} />
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => addRowAfter(setCertificates, index)}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={certificates.length === 1} onClick={() => removeRow(setCertificates, index)}><Minus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSaveSupplier} disabled={!company.trim() || isDuplicateCompany || !!emailError}>
            Save Supplier
          </Button>
        </SheetFooter>
      </SheetContent>
      <RequestApprovalDialog
        open={requestApprovalOpen}
        onOpenChange={setRequestApprovalOpen}
        actionLabel="Edit Supplier"
        entityLabel={company.trim() || supplier?.company || "Supplier"}
        onConfirm={handleRequestApproval}
        loading={requestingApproval}
      />
    </Sheet>
  );
}

export default EditSupplier;
