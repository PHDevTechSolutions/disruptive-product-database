"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/utils/supabase";

type SPFViewProps = {
  spfNumber: string;
};

type SPFData = {
  spf_number: string;
  status?: string;

  product_offer_image: string;
  product_offer_qty: string;
  product_offer_technical_specification: string;
  product_offer_unit_cost: string;
  product_offer_packaging_details: string;
  product_offer_factory_address: string;
  product_offer_port_of_discharge: string;
  product_offer_subtotal: string;
};

type SPFRequestData = {
  item_description: string;
  item_photo: string;
};

export default function SPFRequestView({ spfNumber }: SPFViewProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SPFData | null>(null);
  const [requestData, setRequestData] = useState<SPFRequestData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSPF = async () => {
    try {
      setLoading(true);

      /* SPF CREATION */
      const { data: creation, error } = await supabase
        .from("spf_creation")
        .select("*")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      setData(creation);

      /* SPF REQUEST (for image + description) */
      const { data: request } = await supabase
        .from("spf_request")
        .select("item_description,item_photo")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      setRequestData(request);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSPF();
    }
  }, [open]);

  useEffect(() => {

  const fetchStatus = async () => {

    const { data } = await supabase
      .from("spf_creation")
      .select("status")
      .eq("spf_number", spfNumber)
      .maybeSingle();

    if (data) {
      setData((prev:any) => ({
        ...prev,
        status: data.status
      }));
    }

  };

  fetchStatus();

}, [spfNumber]);

  const split = (value?: string) => {
    if (!value) return [];
    return value.split(",");
  };

  const splitSpecs = (value?: string) => {
    if (!value) return [];
    return value.split(" || ");
  };

  const images = split(data?.product_offer_image);
  const qtys = split(data?.product_offer_qty);
  const unitCosts = split(data?.product_offer_unit_cost);
  const packaging = split(data?.product_offer_packaging_details);
  const factories = split(data?.product_offer_factory_address);
  const ports = split(data?.product_offer_port_of_discharge);
  const subtotals = split(data?.product_offer_subtotal);
  const specs = splitSpecs(data?.product_offer_technical_specification);

  const itemDescriptions = split(requestData?.item_description);
  const itemImages = split(requestData?.item_photo);

  return (
    <>
<div className="flex items-center gap-2">

  <Button
    variant="outline"
    className="rounded-none p-6"
    onClick={() => setOpen(true)}
  >
    View
  </Button>

  {data?.status && (
    <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 uppercase">
      {data.status}
    </span>
  )}

</div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
<DialogHeader className="space-y-2">

  <DialogTitle>SPF Request View</DialogTitle>

  {data?.status && (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">Status:</span>

      <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 uppercase">
        {data.status}
      </span>
    </div>
  )}

</DialogHeader>

          {loading && <p className="text-sm">Loading...</p>}

          {!loading && data && (
            <Card className="p-4">
              <table className="w-full table-auto border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">#</th>
                    <th className="border px-2 py-1">Image</th>
                    <th className="border px-2 py-1">Item Description</th>
                    <th className="border px-2 py-1">Product Offer</th>
                  </tr>
                </thead>

                <tbody>
                  {itemDescriptions.map((desc, index) => (
                    <tr key={index}>

                      {/* SPF NUMBER */}
                      <td className="border px-2 py-1 text-center">
                        {spfNumber}-{String(index + 1).padStart(3, "0")}
                      </td>

                      {/* ITEM IMAGE */}
                      <td className="border px-2 py-1 text-center">
                        {itemImages[index] ? (
                          <img
                            src={itemImages[index]}
                            className="w-24 h-24 object-contain mx-auto"
                          />
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="border px-2 py-1 whitespace-pre-wrap">
                        {desc.replace(/\|/g, "\n")}
                      </td>

                      {/* PRODUCT OFFERS */}
                      <td className="border px-2 py-1">

                        <table className="w-full border text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border px-2 py-1">Image</th>
                              <th className="border px-2 py-1">Qty</th>
                              <th className="border px-2 py-1">Technical Specs</th>
                              <th className="border px-2 py-1">Unit Cost</th>
                              <th className="border px-2 py-1">Packaging</th>
                              <th className="border px-2 py-1">Factory</th>
                              <th className="border px-2 py-1">Port</th>
                              <th className="border px-2 py-1">Subtotal</th>
                            </tr>
                          </thead>

                          <tbody>
                            {images.map((img, i) => (
                              <tr key={i}>

                                <td className="border px-2 py-1 text-center">
                                  {img !== "-" ? (
                                    <img
                                      src={img}
                                      className="w-16 h-16 object-contain mx-auto"
                                    />
                                  ) : "-"}
                                </td>

                                <td className="border px-2 py-1 text-center">
                                  {qtys[i] || "-"}
                                </td>

                                <td className="border px-2 py-1">
                                  {(specs[i] || "-")
                                    .split("|")
                                    .map((s, si) => (
                                      <div key={si}>{s}</div>
                                    ))}
                                </td>

                                <td className="border px-2 py-1 text-center">
                                  {unitCosts[i] || "-"}
                                </td>

                                <td className="border px-2 py-1 text-center">
                                  {packaging[i] || "-"}
                                </td>

                                <td className="border px-2 py-1 text-center">
                                  {factories[i] || "-"}
                                </td>

                                <td className="border px-2 py-1 text-center">
                                  {ports[i] || "-"}
                                </td>

                                <td className="border px-2 py-1 text-center">
                                  ₱ {Number(subtotals[i] || 0).toLocaleString()}
                                </td>

                              </tr>
                            ))}
                          </tbody>
                        </table>

                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {!loading && !data && (
            <p className="text-sm text-muted-foreground">
              No SPF creation found.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}