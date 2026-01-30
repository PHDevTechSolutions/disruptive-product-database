"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";

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
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
  query, // ✅ ADD
  where, // ✅ ADD
} from "firebase/firestore";

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

  /* ---------------- VALIDATION STATES ---------------- */
  const [companyError, setCompanyError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isDuplicateCompany, setIsDuplicateCompany] = useState(false);

  /* ---------------- Base Fields ---------------- */
  const [company, setCompany] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [emails, setEmails] = useState<string[]>([""]);
  const [website, setWebsite] = useState("");

  /* ---------------- Multi Fields ---------------- */
  const [contactNames, setContactNames] = useState<string[]>([""]);
  const [contactNumbers, setContactNumbers] = useState<string[]>([""]);

  const [forteProducts, setForteProducts] = useState<string[]>([""]);
  const [products, setProducts] = useState<string[]>([""]);
  const [certificates, setCertificates] = useState<string[]>([""]);

  useEffect(() => {
    if (!company.trim()) {
      setCompanyError("");
      setIsDuplicateCompany(false);
      return;
    }

    const checkDuplicateCompany = async () => {
      const snap = await getDocs(collection(db, "suppliers"));

      const exists = snap.docs.some((d) => {
        if (d.id === supplier?.id) return false; // 👈 allow self
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

    if (invalid) {
      setEmailError("One or more emails are invalid");
    } else {
      setEmailError("");
    }
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
      .catch((err) => {
        console.error("EditSupplier user fetch error:", err);
      });
  }, [userId]);

  /* ---------------- Silent user detection ---------------- */
  useEffect(() => {
    if (!supplier) return;

    setCompany(supplier.company || "");
    setInternalCode(supplier.internalCode || "");
    setAddresses(
      supplier.addresses && supplier.addresses.length > 0
        ? supplier.addresses
        : [""],
    );

    setEmails(
      supplier.emails && supplier.emails.length > 0 ? supplier.emails : [""],
    );
    setWebsite(supplier.website || "");

    // ✅ CONTACTS – always at least 1 row
    if (supplier.contacts && supplier.contacts.length > 0) {
      setContactNames(supplier.contacts.map((c: any) => c.name || ""));
      setContactNumbers(
        supplier.contacts.map((c: any) =>
          c.phone ? c.phone.replace(/\s+/g, "") : "",
        ),
      );
    } else {
      setContactNames([""]);
      setContactNumbers([""]);
    }

    // ✅ FORTE PRODUCTS
    setForteProducts(
      supplier.forteProducts && supplier.forteProducts.length > 0
        ? supplier.forteProducts
        : [""],
    );

    // ✅ PRODUCTS
    setProducts(
      supplier.products && supplier.products.length > 0
        ? supplier.products
        : [""],
    );

    // ✅ CERTIFICATES
    setCertificates(
      supplier.certificates && supplier.certificates.length > 0
        ? supplier.certificates
        : [""],
    );
  }, [supplier]);

  /* ---------------- Helpers ---------------- */
  const updateList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => {
    setter((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addRowAfter = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) => {
    setter((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, "");
      return copy;
    });
  };

  const removeRow = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) => {
    setter((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  /* ---------------- Save Supplier ---------------- */
  const handleSaveSupplier = async () => {
    try {
      if (!company.trim()) {
        toast.error("Company is required");
        return;
      }

      if (isDuplicateCompany) {
        toast.error("Company already exists");
        return;
      }

      if (emailError) {
        toast.error("Please fix invalid email(s)");
        return;
      }

      /* ===============================
       1️⃣ UPDATE SUPPLIER (MASTER)
    =============================== */
      await updateDoc(doc(db, "suppliers", supplier.id), {
        supplierId: supplier.id,
        company: company.trim(),
        internalCode,
        addresses: addresses.filter(Boolean),
        emails: emails.filter(Boolean),
        website,
        contacts: contactNames
          .map((name, index) => ({
            name,
            phone: contactNumbers[index] || "",
          }))
          .filter((c) => c.name || c.phone),
        forteProducts: forteProducts.filter(Boolean),
        products: products.filter(Boolean),
        certificates: certificates.filter(Boolean),
        referenceID: user?.ReferenceID || supplier.referenceID || null,
        updatedAt: serverTimestamp(),
      });

      /* =========================================
       2️⃣ FETCH PRODUCTS USING THIS SUPPLIER ID
    ========================================= */
      const q = query(
        collection(db, "products"),
        where("supplier.supplierId", "==", supplier.id),
      );

      const snap = await getDocs(q);

      /* =========================================
       3️⃣ UPDATE SUPPLIER NAME IN PRODUCTS
    ========================================= */
      await Promise.all(
        snap.docs.map((p) => {
          const data = p.data();
          if (!data.supplier) return Promise.resolve();

          return updateDoc(p.ref, {
            supplier: {
              ...data.supplier,
              company: company.trim(), // 👈 SYNC NAME
            },
          });
        }),
      );

      toast.success("Supplier updated everywhere", {
        description: company,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Failed to save supplier");
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

        {/* ---------------- User Info ---------------- */}
        {user && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
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

        <div className="space-y-6 mt-4">
          {/* Company */}
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

          {/* Internal Code */}
          <div className="space-y-1">
            <Label>Internal Code (optional)</Label>
            <Input
              value={internalCode}
              onChange={(e) => setInternalCode(e.target.value)}
              placeholder="Internal code"
            />
          </div>

          {/* Addresses */}
          <div className="space-y-3">
            <Label>Addresses</Label>

            {addresses.map((addr, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-start"
              >
                <Textarea
                  value={addr}
                  onChange={(e) =>
                    updateList(setAddresses, index, e.target.value)
                  }
                  placeholder="Full address"
                  className="min-h-[80px]"
                />

                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    onClick={() => addRowAfter(setAddresses, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    disabled={addresses.length === 1}
                    onClick={() => removeRow(setAddresses, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Emails */}
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
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addRowAfter(setEmails, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={emails.length === 1}
                    onClick={() => removeRow(setEmails, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Website */}
          <div className="space-y-1">
            <Label>Website (optional)</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <Label>Contacts</Label>

            {contactNames.map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
              >
                <Input
                  placeholder="Contact Name"
                  value={contactNames[index]}
                  onChange={(e) =>
                    updateList(setContactNames, index, e.target.value)
                  }
                />

                <PhoneInput
                  international
                  defaultCountry="PH"
                  countryCallingCodeEditable={false}
                  value={contactNumbers[index]}
                  onChange={(value) =>
                    updateList(setContactNumbers, index, value || "")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="+63 9XX XXX XXXX"
                />

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      addRowAfter(setContactNames, index);
                      addRowAfter(setContactNumbers, index);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={contactNames.length === 1}
                    onClick={() => {
                      removeRow(setContactNames, index);
                      removeRow(setContactNumbers, index);
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Forte Products */}
          <div className="space-y-3">
            <Label>Forte Products (optional)</Label>

            {forteProducts.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <Input
                  value={item}
                  placeholder="Forte product"
                  onChange={(e) =>
                    updateList(setForteProducts, index, e.target.value)
                  }
                />

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addRowAfter(setForteProducts, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={forteProducts.length === 1}
                    onClick={() => removeRow(setForteProducts, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Products */}
          <div className="space-y-3">
            <Label>Products (optional)</Label>

            {products.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <Input
                  value={item}
                  placeholder="Product"
                  onChange={(e) =>
                    updateList(setProducts, index, e.target.value)
                  }
                />

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addRowAfter(setProducts, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={products.length === 1}
                    onClick={() => removeRow(setProducts, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Certificates */}
          <div className="space-y-3">
            <Label>Certificates (optional)</Label>

            {certificates.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <Input
                  value={item}
                  placeholder="Certificate"
                  onChange={(e) =>
                    updateList(setCertificates, index, e.target.value)
                  }
                />

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addRowAfter(setCertificates, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={certificates.length === 1}
                    onClick={() => removeRow(setCertificates, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSaveSupplier}
            disabled={!company.trim() || isDuplicateCompany || !!emailError}
          >
            Save Supplier
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default EditSupplier;
