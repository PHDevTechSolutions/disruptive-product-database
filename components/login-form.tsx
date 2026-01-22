"use client";
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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

      // save userId in context
      setUserId(data.userId);

      // ✅ REDIRECT TO DASHBOARD
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email below to login to your account
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field>
          <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

