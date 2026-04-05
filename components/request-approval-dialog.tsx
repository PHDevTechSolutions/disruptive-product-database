"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  entityLabel: string;
  /** Short lines shown under the action (what will happen / duplicate summary). */
  detailLines?: string[];
  onConfirm: (message: string) => Promise<void> | void;
  loading?: boolean;
};

export default function RequestApprovalDialog({
  open,
  onOpenChange,
  actionLabel,
  entityLabel,
  detailLines = [],
  onConfirm,
  loading = false,
}: Props) {
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    await onConfirm(trimmed);
    setMessage("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setMessage("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>For approval</DialogTitle>
          <DialogDescription>
            Your change will not apply until an Engineering manager or IT reviewer approves it. Add a short note so
            reviewers understand the request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>What you are requesting</Label>
            <Input value={actionLabel} disabled />
          </div>
          <div className="space-y-1">
            <Label>Target</Label>
            <Input value={entityLabel} disabled />
          </div>
          {detailLines.filter(Boolean).length > 0 && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground space-y-1">
              {detailLines.filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <Label>Note to reviewers</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Context for reviewers (required)"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !message.trim()}
          >
            {loading ? "Submitting..." : "Submit For Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
