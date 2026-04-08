"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DollarSign, Settings, Layers, ArrowRight } from "lucide-react";

export type RevisionType = "price" | "specs" | "both";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: RevisionType) => void;
  spfNumber: string;
};

export default function RevisionTypeSelector({
  open,
  onOpenChange,
  onSelect,
  spfNumber,
}: Props) {
  const options = [
    {
      type: "price" as RevisionType,
      icon: DollarSign,
      title: "Price Update",
      description: "Update only the unit cost for existing products",
      color: "green",
    },
    {
      type: "specs" as RevisionType,
      icon: Settings,
      title: "Change Item Specs & Qty",
      description: "Revise technical specifications and quantity. Quantity cannot be reduced below original.",
      color: "blue",
    },
    {
      type: "both" as RevisionType,
      icon: Layers,
      title: "Both",
      description: "Update both price and specifications with full edit access",
      color: "orange",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { card: string; icon: string; btn: string }> = {
      green: {
        card: "border-green-200 hover:border-green-400 hover:bg-green-50/50",
        icon: "bg-green-100 text-green-600",
        btn: "bg-green-600 hover:bg-green-700",
      },
      blue: {
        card: "border-blue-200 hover:border-blue-400 hover:bg-blue-50/50",
        icon: "bg-blue-100 text-blue-600",
        btn: "bg-blue-600 hover:bg-blue-700",
      },
      orange: {
        card: "border-orange-200 hover:border-orange-400 hover:bg-orange-50/50",
        icon: "bg-orange-100 text-orange-600",
        btn: "bg-orange-600 hover:bg-orange-700",
      },
    };
    return colors[color];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings size={18} className="text-orange-500" />
            Select Revision Type — {spfNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {options.map((option) => {
            const colors = getColorClasses(option.color);
            const Icon = option.icon;

            return (
              <Card
                key={option.type}
                className={`p-4 border-2 cursor-pointer transition-all duration-200 ${colors.card}`}
                onClick={() => onSelect(option.type)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${colors.icon}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className={`${colors.btn} text-white rounded-none shrink-0`}
                  >
                    Select <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Choose the appropriate revision type based on what needs to be updated.
            This cannot be changed after selection.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
