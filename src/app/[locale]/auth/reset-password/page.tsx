"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm Password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setConfirmPasswordError(null);

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const confirmIssue = parsed.error.issues.find((issue) => issue.path[0] === "confirmPassword");
      const passwordIssue = parsed.error.issues.find((issue) => issue.path[0] === "password");
      if (confirmIssue) {
        setConfirmPasswordError(confirmIssue.message);
      }
      if (passwordIssue && !confirmIssue) {
        setError(passwordIssue.message);
      }
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to reset password");
      }

      setMessage("Password updated successfully. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] py-12 px-4">
      <div className="mx-auto max-w-md rounded-2xl border border-brand-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1F1720]">Reset Password</h1>
        <p className="mt-2 text-sm text-[#6B5A64]">Enter a new password for your GiftBox account.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1F1720]">New Password</label>
            <PasswordInput
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#1F1720]">Confirm Password</label>
            <PasswordInput
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="mt-1"
            />
            {confirmPasswordError ? <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p> : null}
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#A7066A] hover:bg-[#8A0558] text-white">
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <p className="mt-6 text-sm text-[#6B5A64]">
          Go to{" "}
          <Link href="/sign-in" className="font-medium text-[#A7066A] hover:text-[#8A0558]">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
