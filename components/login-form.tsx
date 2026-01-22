"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const { setUserId } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      router.push("/dashboard");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-md p-8 shadow-2xl",
        className
      )}
      {...props}
    >
      <FieldGroup>
        {/* HEADER */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Login to your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Disruptive Solutions Inc. · Internal Operations Portal
          </p>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600 text-center animate-in fade-in">
            {error}
          </p>
        )}

        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            required
            className="focus-visible:ring-red-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            required
            className="focus-visible:ring-red-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button
          type="submit"
          disabled={loading}
          className="mt-4 h-11 w-full bg-gradient-to-r from-red-600 to-red-700 font-semibold text-white transition-all hover:scale-[1.02] hover:from-red-700 hover:to-red-800"
        >
          {loading ? "Signing in..." : "Sign in to Dashboard"}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Having trouble logging in? Contact your administrator
        </p>
      </FieldGroup>
    </form>
  );
}
