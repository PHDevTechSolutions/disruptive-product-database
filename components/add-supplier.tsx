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

import {
  collection,
  addDoc,
  updateDoc, // 👈 ADD THIS
  doc,       // 👈 ADD THIS
  serverTimestamp,
  getDocs,
} from "firebase/firestore";


import { db } from "@/lib/firebase";

/* ---------------- Types ---------------- */
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

function AddSupplier({ open, onOpenChange }: AddSupplierProps) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  /* ---------------- VALIDATION STATES ---------------- */
  const [companyError, setCompanyError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isDuplicateCompany, setIsDuplicateCompany] = useState(false);

  /* ---------------- Base Fields ---------------- */
  const [company, setCompany] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [internalCode, setInternalCode] = useState<string[]>([""]);
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [emails, setEmails] = useState<string[]>([""]);
  const [website, setWebsite] = useState<string[]>([""]);

  /* ---------------- Multi Fields ---------------- */
  const [contactNames, setContactNames] = useState<string[]>([""]);
  const [contactNumbers, setContactNumbers] = useState<string[]>([""]);

  const [forteProducts, setForteProducts] = useState<string[]>([""]);
  const [products, setProducts] = useState<string[]>([""]);
  const [certificates, setCertificates] = useState<string[]>([""]);

  /* ---------------- Silent user detection ---------------- */
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
          ReferenceID: data.ReferenceID ?? "", // ← ADD
        });
      })
      .catch((err) => {
        console.error("AddSupplier user fetch error:", err);
      });
  }, [userId]);

  /* ---------------- DUPLICATE COMPANY CHECK ---------------- */
  useEffect(() => {
    if (!company.trim()) {
      setCompanyError("");
      setIsDuplicateCompany(false);
      return;
    }

    const checkDuplicateCompany = async () => {
      const snap = await getDocs(collection(db, "suppliers"));

      const exists = snap.docs.some(
        (doc) =>
          doc.data().isActive !== false &&
          doc.data().company?.toLowerCase() === company.toLowerCase(),
      );

      if (exists) {
        setCompanyError("Company already exists");
        setIsDuplicateCompany(true);
      } else {
        setCompanyError("");
        setIsDuplicateCompany(false);
      }
    };

    checkDuplicateCompany();
  }, [company]);

  /* ---------------- AUTO GENERATE SUPPLIER CODE ---------------- */
  useEffect(() => {
    if (!company.trim()) {
      setCompanyCode("");
      return;
    }

    setCompanyCode(generateSupplierCode(company));
  }, [company]);

  /* ---------------- EMAIL ARRAY VALIDATION ---------------- */
  useEffect(() => {
    const invalid = emails.some((e) => e && !e.includes("@"));

    if (invalid) {
      setEmailError("One or more emails are invalid");
    } else {
      setEmailError("");
    }
  }, [emails]);

  /* ---------------- Company Code Helpers ---------------- */
  const normalizeCompanyPrefix = (name: string) => {
    return name
      .replace(/[^a-zA-Z ]/g, "")
      .split(" ")
      .filter(
        (w) =>
          w &&
          !["INC", "INCORPORATED", "CORP", "CORPORATION", "LTD", "CO"].includes(
            w.toUpperCase(),
          ),
      )
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 4);
  };

  const generateAlphaNumeric = (length = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const generateSupplierCode = (companyName: string) => {
    const prefix = normalizeCompanyPrefix(companyName) || "COMP";
    return `${prefix}-SUPP-${generateAlphaNumeric(6)}`;
  };
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

  const handleSaveSupplier = async () => {
    try {
      if (!company.trim()) {
        toast.error("Company is required");
        return;
      }
      const supplierData = {
        company,
        companyCode,
        internalCode: internalCode.filter(Boolean),
        addresses: addresses.filter(Boolean),
        emails: emails.filter(Boolean),
        website: website.filter(Boolean),

        contacts: contactNames.map((name, index) => ({
          name,
          phone: contactNumbers[index] || "",
        })),

        forteProducts: forteProducts.filter(Boolean),
        products: products.filter(Boolean),
        certificates: certificates.filter(Boolean),

        createdBy: userId || null,
        referenceID: user?.ReferenceID || null,
        isActive: true,
        createdAt: serverTimestamp(),
      };

      // 1️⃣ CREATE supplier
      const docRef = await addDoc(collection(db, "suppliers"), supplierData);

      // 2️⃣ SAVE supplierId (same as Firestore document ID)
      await updateDoc(doc(db, "suppliers", docRef.id), {
        supplierId: docRef.id,
      });

      toast.success("Supplier saved successfully", {
        description: company,
      });

      setCompany("");
      setInternalCode([""]);
      setAddresses([""]);
      setEmails([""]);
      setWebsite([""]);
      setContactNames([""]);
      setContactNumbers([""]);
      setForteProducts([""]);
      setProducts([""]);
      setCertificates([""]);

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Failed to save supplier");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-6 z-50 pb-[140px]">
        <SheetHeader>
          <SheetTitle>Add Supplier</SheetTitle>
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
        <div className="space-y-6">
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

          {/* Supplier Code */}
          <div className="space-y-1">
            <Label>Supplier Code</Label>
            <Input
              value={companyCode}
              disabled
              className="opacity-100 cursor-not-allowed bg-background text-foreground"
            />
          </div>

          {/* Internal Code */}
          <div className="space-y-3">
            <Label>Internal Code (optional)</Label>

            {internalCode.map((code, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <Input
                  value={code}
                  placeholder="Internal code"
                  onChange={(e) =>
                    updateList(setInternalCode, index, e.target.value)
                  }
                />

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addRowAfter(setInternalCode, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={internalCode.length === 1}
                    onClick={() => removeRow(setInternalCode, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
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
                />

                <div className="flex gap-1 pt-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => addRowAfter(setAddresses, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
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

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => addRowAfter(setEmails, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={emails.length === 1}
                    onClick={() => removeRow(setEmails, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          </div>

          {/* Website */}
          <div className="space-y-3">
            <Label>Website (optional)</Label>

            {website.map((site, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <Input
                  value={site}
                  placeholder="https://example.com"
                  onChange={(e) =>
                    updateList(setWebsite, index, e.target.value)
                  }
                />

                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addRowAfter(setWebsite, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={website.length === 1}
                    onClick={() => removeRow(setWebsite, index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
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
                    className="cursor-pointer"
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
                    className="cursor-pointer"
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
                    className="cursor-pointer"
                    onClick={() => addRowAfter(setForteProducts, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
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
                    className="cursor-pointer"
                    onClick={() => addRowAfter(setProducts, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
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
                    className="cursor-pointer"
                    onClick={() => addRowAfter(setCertificates, index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
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
          <Button
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
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
