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

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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

  /* ---------------- Base Fields ---------------- */
  const [company, setCompany] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

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
      if (!company || !address) {
        toast.error("Company and Address are required");
        return;
      }
      if (!user?.ReferenceID) {
        toast.error("User reference is not loaded yet. Please wait.");
        return;
      }

      

      const supplierData = {
        company,
        internalCode,
        address,
        email,
        website,

        contacts: contactNames.map((name, index) => ({
          name,
          phone: contactNumbers[index] || "",
        })),

        forteProducts: forteProducts.filter(Boolean),
        products: products.filter(Boolean),
        certificates: certificates.filter(Boolean),

        createdBy: userId || null,
        referenceID: user?.ReferenceID || null,
        createdAt: serverTimestamp(),

      };

      await addDoc(collection(db, "suppliers"), supplierData);

      toast.success("Supplier saved successfully", {
        description: company,
      });

      setCompany("");
      setInternalCode("");
      setAddress("");
      setEmail("");
      setWebsite("");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-6">
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

          {/* Address */}
          <div className="space-y-1">
            <Label>Address</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="company@email.com"
            />
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
            disabled={!user?.ReferenceID}
          >
            Save Supplier
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AddSupplier;
