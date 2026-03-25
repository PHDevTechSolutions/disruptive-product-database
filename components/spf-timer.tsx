"use client";

import React, { useEffect, useState } from "react";

type SPFTimerProps = {
  isActive?: boolean;
  startTime?: string | null;
  label?: string;
  onStart?: (iso: string) => void;
  onStop?: (iso: string) => void;
  onTick?: (seconds: number) => void;
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pref = (num: number) => String(num).padStart(2, "0");
  if (h > 0) return `${pref(h)}:${pref(m)}:${pref(s)}`;
  return `${pref(m)}:${pref(s)}`;
};

export default function SPFTimer({
  isActive = true,
  startTime,
  label = "SPF Session",
  onStart,
  onStop,
  onTick,
}: SPFTimerProps) {
  const [internalStart, setInternalStart] = useState<string | null>(startTime ?? null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [stoppedAt, setStoppedAt] = useState<string | null>(null);

  useEffect(() => {
    if (startTime && startTime !== internalStart) {
      setInternalStart(startTime);
      const d = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
      setElapsed(d);
      setStoppedAt(null);
    }
  }, [startTime]);

  useEffect(() => {
    if (!internalStart && isActive) {
      const now = new Date().toISOString();
      setInternalStart(now);
      onStart?.(now);
      setElapsed(0);
      setStoppedAt(null);
    }

    if (!isActive && internalStart && !stoppedAt) {
      const now = new Date().toISOString();
      setStoppedAt(now);
      onStop?.(now);
    }
  }, [isActive, internalStart, stoppedAt, onStart, onStop]);

  useEffect(() => {
    if (!internalStart || !isActive) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(internalStart).getTime()) / 1000));
      setElapsed(diff);
      onTick?.(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [internalStart, isActive, onTick]);

  const started = internalStart;
  const ended = stoppedAt || (isActive ? null : new Date().toISOString());

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 text-slate-100">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tracking-[0.2em] uppercase text-slate-300">{label}</span>
        <span className="text-2xl font-black font-mono tracking-widest text-cyan-300">{formatDuration(elapsed)}</span>
      </div>
    </div>
  );
}
