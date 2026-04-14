"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useUser } from "@/contexts/UserContext";

import { dbLogs } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface LoginFormProps extends React.ComponentProps<"form"> {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess, ...props }: LoginFormProps) {
  const { setUserId } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logLoginActivity(userId: string, email: string) {
    try {
      const deviceId =
        localStorage.getItem("deviceId") || crypto.randomUUID();

      localStorage.setItem("deviceId", deviceId);

      await addDoc(collection(dbLogs, "activity_logs"), {
        userId,
        email,
        status: "login",
        timestamp: new Date().toISOString(),
        deviceId,
        location: null,
        browser: navigator.userAgent,
        os: navigator.platform,
        date_created: serverTimestamp(),
      });
    } catch (error) {
      console.error("Login log failed:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: email,
          Password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      setUserId(data.userId);
      await logLoginActivity(data.userId, email);

      // Trigger splash screen in the parent (LoginPage)
      onLoginSuccess?.();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="mb-6 text-center">
          <h1 className="font-comic-title text-3xl text-red-500 comic-text-shadow comic-animate-bounce">
            Login to your account
          </h1>

          <p className="mt-2 font-comic text-sm text-gray-600">
            Disruptive Solutions Inc. · Internal Operations Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 comic-bubble bg-red-100 border-red-400 comic-animate-shake">
            <p className="text-sm text-red-600 text-center font-comic font-bold">
              ⚠️ {error}
            </p>
          </div>
        )}

        <Field>
          <FieldLabel className="font-comic font-bold text-gray-700">📧 Email</FieldLabel>
          <Input
            type="email"
            required
            className="comic-input h-12 text-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hero@disruptive.com"
          />
        </Field>

        <Field>
          <FieldLabel className="font-comic font-bold text-gray-700">🔑 Password</FieldLabel>
          <Input
            type="password"
            required
            className="comic-input h-12 text-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your secret code!"
          />
        </Field>

        <Button
          type="submit"
          disabled={loading}
          className="comic-button mt-4 h-14 w-full bg-gradient-to-r from-red-500 to-orange-500 font-comic text-lg text-white comic-animate-pulse"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚡</span> Powering up...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              🚀 Let&apos;s Go!
            </span>
          )}
        </Button>

        <p className="mt-4 text-center text-xs text-gray-500 font-comic">
          Having trouble? Contact your administrator 🦸
        </p>
      </FieldGroup>
    </form>
  );
}
