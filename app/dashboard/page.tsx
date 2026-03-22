// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/utils/supabase";
import { ImageIcon, X, Upload, Trash2, CheckCircle2 } from "lucide-react";

type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

export default function Dashboard() {
  const router = useRouter();
  const { userId } = useUser();
  const { wallpaper, opacity, setWallpaper, setOpacity } = useWallpaper();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeOpen, setThemeOpen] = useState(false);

  const [totalProducts, setTotalProducts]   = useState<number | null>(null);
  const [totalSuppliers, setTotalSuppliers] = useState<number | null>(null);
  const [totalSPF, setTotalSPF]             = useState<number | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (userId === null) return;
    if (!userId) { window.location.href = "/login"; }
  }, [userId]);

  /* ── Fetch user ── */
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUser({ Firstname: d.Firstname ?? "", Lastname: d.Lastname ?? "", Role: d.Role ?? "" }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  /* ── Fetch counts ── */
  useEffect(() => {
    if (!userId) return;

    async function fetchCounts() {
      try {
        const [prodSnap, suppSnap] = await Promise.all([
          getCountFromServer(query(collection(db, "products"),  where("isActive", "==", true))),
          getCountFromServer(query(collection(db, "suppliers"), where("isActive", "==", true))),
        ]);
        setTotalProducts(prodSnap.data().count);
        setTotalSuppliers(suppSnap.data().count);

        const { count } = await supabase
          .from("spf_request")
          .select("*", { count: "exact", head: true });
        setTotalSPF(count ?? 0);
      } catch (err) {
        console.error("fetchCounts error:", err);
      }
    }

    fetchCounts();
  }, [userId]);

  const metrics: {
    key: string;
    label: string;
    value: number | null;
    color: string;
  }[] = [
    { key: "products",  label: "Total Products",  value: totalProducts,  color: "#378ADD" },
    { key: "suppliers", label: "Total Suppliers",  value: totalSuppliers, color: "#1D9E75" },
    { key: "requests",  label: "SPF Requests",     value: totalSPF,       color: "#BA7517" },
  ];

  return (
    <div className="p-6 space-y-6">
      <SidebarTrigger className="hidden md:flex" />

      <h1 className="text-2xl font-bold">
        {loading ? "Loading..." : user ? (
          <>
            Welcome, {user.Firstname} {user.Lastname}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({user.Role})</span>
          </>
        ) : "Welcome"}
      </h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map(({ key, label, value, color }) => (
          <button
            key={key}
            onClick={() => router.push(`/${key}`)}
            className="bg-white/80 backdrop-blur-md rounded-lg p-4 space-y-2 text-left hover:bg-white/90 transition-colors group border border-white/40 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-semibold group-hover:underline underline-offset-2">
              {value === null
                ? <span className="text-muted-foreground text-lg animate-pulse">—</span>
                : value.toLocaleString()
              }
            </p>
            <p className="text-xs text-muted-foreground">Click to view →</p>
          </button>
        ))}
      </div>

      {/* ── Customize Theme Button ── */}
      <button
        onClick={() => setThemeOpen(true)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-white/60 backdrop-blur-sm hover:bg-white/80 hover:border-gray-400 transition-all duration-200 text-sm font-medium text-gray-600 hover:text-gray-900 group shadow-sm"
      >
        <ImageIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        <span>Customize Wallpaper</span>
        {wallpaper && (
          <span className="ml-1 flex items-center gap-1 text-xs text-emerald-600 font-normal">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        )}
      </button>

      {/* ── Wallpaper Modal ── */}
      {themeOpen && (
        <WallpaperModal
          current={wallpaper}
          currentOpacity={opacity}
          onSave={(b64, op) => { setWallpaper(b64); setOpacity(op); }}
          onClose={() => setThemeOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Wallpaper Upload Modal ── */
function WallpaperModal({
  current,
  currentOpacity,
  onSave,
  onClose,
}: {
  current: string | null;
  currentOpacity: number;
  onSave: (b64: string | null, opacity: number) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [opacity, setOpacityLocal] = useState<number>(currentOpacity);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_MB = 10;

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP, etc.)");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleApply = () => {
    onSave(preview, opacity);
    onClose();
  };

  const handleSaveRemove = () => {
    onSave(null, opacity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Customize Wallpaper</h2>
            <p className="text-xs text-gray-500 mt-0.5">Saved locally on this device only</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Preview */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-white">
              <img
                src={preview}
                alt="Wallpaper preview"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity }}
              />
              <div className="absolute inset-0 bg-white" style={{ opacity: 1 - opacity }} />
              <div className="absolute inset-0 flex flex-col items-start justify-end p-3 gap-1.5">
                <div className="h-2 w-24 rounded-full bg-gray-300/80" />
                <div className="h-2 w-16 rounded-full bg-gray-200/80" />
              </div>
              <button
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
              <span className="absolute top-2 left-3 text-xs text-white/90 font-medium drop-shadow">Preview</span>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                ${dragging
                  ? "border-gray-400 bg-gray-50 scale-[1.01]"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                <Upload className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {dragging ? "Drop image here" : "Upload wallpaper"}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max {MAX_MB}MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          {/* Opacity slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-600">Opacity</label>
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => setOpacityLocal(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-gray-800 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Subtle</span>
              <span>Full</span>
            </div>
          </div>

          {preview && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Change Image
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {current && (
            <button
              onClick={handleSaveRemove}
              className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!preview}
            className="flex-1 h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
