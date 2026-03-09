"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* ---------------- Types ---------------- */

type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

type SPFRequest = {
  id: string;
  referenceNumber: string;
  clientName: string;
  status: string;
  createdAt?: any;
};

export default function RequestsPage() {

  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState<SPFRequest[]>([]);

  /* ---------------- Fetch User ---------------- */

  useEffect(() => {

    if (userId === null) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    async function fetchUser() {
      try {

        const res = await fetch(`/api/users?id=${userId}`);

        if (!res.ok) throw new Error("Failed to fetch user");

        const data = await res.json();

        setUser(data);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);

      }
    }

    fetchUser();

  }, [userId, router]);

  /* ---------------- Real-time SPF Requests ---------------- */

  useEffect(() => {

    const q = query(
      collection(db, "spf_requests"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SPFRequest[];

      setRequests(list);

    });

    return () => unsubscribe();

  }, []);

  if (loading) return null;

  return (

    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6">

      {/* Sidebar */}

      <SidebarTrigger className="hidden md:flex" />

      {/* Header */}

      <h1 className="text-2xl font-bold">
        SPF Requests
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          Welcome, {user?.Firstname} {user?.Lastname} ({user?.Role})
        </span>
      </h1>

      <Separator />

      {/* ================= SPF PROCESS FLOW ================= */}

      <Card>

        <CardHeader>
          <CardTitle>SPF Process Flow</CardTitle>
        </CardHeader>

        <CardContent className="grid md:grid-cols-5 gap-4 text-sm">

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sales Request</CardTitle>
            </CardHeader>
            <CardContent>
              TSA → TSM → Sales Head → PD
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Product Development</CardTitle>
            </CardHeader>
            <CardContent>
              Unit Cost<br/>
              Packaging Dimension<br/>
              Factory Address<br/>
              Port of Discharge
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Procurement</CardTitle>
            </CardHeader>
            <CardContent>
              Final Cost<br/>
              Generate Quotation
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Client Approval</CardTitle>
            </CardHeader>
            <CardContent>
              TSA presents quotation
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sales Order</CardTitle>
            </CardHeader>
            <CardContent>
              Final SO Generated
            </CardContent>
          </Card>

        </CardContent>

      </Card>

      {/* ================= REQUEST CONTROLS ================= */}

      <div className="flex justify-between items-center">

        <h2 className="text-lg font-semibold">
          SPF Requests
        </h2>

        <Button
          onClick={() => router.push("/requests/create")}
        >
          Create SPF Request
        </Button>

      </div>

      {/* ================= REQUEST TABLE ================= */}

      <Card>

        <CardHeader>
          <CardTitle>Requests List (Real-time)</CardTitle>
        </CardHeader>

        <CardContent>

          {/* Table Header */}

          <div className="grid grid-cols-5 border-b pb-2 font-semibold text-sm">

            <div>Reference</div>
            <div>Client</div>
            <div>Status</div>
            <div>Date</div>
            <div>Action</div>

          </div>

          {/* Table Body */}

          {requests.length === 0 ? (

            <p className="text-sm text-muted-foreground mt-4">
              No SPF requests yet.
            </p>

          ) : (

            requests.map((req) => (

              <div
                key={req.id}
                className="grid grid-cols-5 py-2 border-b text-sm items-center"
              >

                <div>{req.referenceNumber}</div>

                <div>{req.clientName}</div>

                <div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                    {req.status}
                  </span>
                </div>

                <div>
                  {req.createdAt?.toDate?.().toLocaleDateString?.() || "-"}
                </div>

                <div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(`/requests/view?id=${req.id}`)
                    }
                  >
                    View
                  </Button>

                </div>

              </div>

            ))

          )}

        </CardContent>

      </Card>

    </div>

  );

}