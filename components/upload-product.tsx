"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { UploadCloud, File, X } from "lucide-react";

export default function UploadProductModal() {
  const [open, setOpen] = React.useState(false);

  /* ================= DUMMY FILE STATE ================= */

  const [file, setFile] = React.useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleUpload = () => {
    /* ================= DUMMY ACTION ================= */

    console.log("Uploading file:", file);

    alert("Dummy Upload Successful");

    setOpen(false);

    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* ================= TRIGGER BUTTON ================= */}

      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadCloud className="w-4 h-4 mr-2" />
          Upload Product
        </Button>
      </DialogTrigger>

      {/* ================= MODAL ================= */}

      <DialogContent className="sm:max-w-md">

        <DialogHeader>

          <DialogTitle>
            Upload Product
          </DialogTitle>

          <DialogDescription>
            This is a dummy upload modal using shadcn Dialog.
          </DialogDescription>

        </DialogHeader>


        {/* ================= BODY ================= */}

        <div className="space-y-4">

          <div className="space-y-2">

            <Label>
              Select File
            </Label>

            <Input
              type="file"
              onChange={handleFileChange}
            />

          </div>


          {/* ================= FILE PREVIEW ================= */}

          {file && (

            <div className="flex items-center justify-between border rounded-md p-2">

              <div className="flex items-center gap-2">

                <File className="w-4 h-4" />

                <span className="text-sm">

                  {file.name}

                </span>

              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={handleRemoveFile}
              >
                <X className="w-4 h-4" />
              </Button>

            </div>

          )}

        </div>


        {/* ================= FOOTER ================= */}

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={handleUpload}
            disabled={!file}
          >
            Upload
          </Button>

        </DialogFooter>


      </DialogContent>

    </Dialog>
  );
}
