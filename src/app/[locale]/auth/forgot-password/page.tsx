"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to send reset email");
      }

      setMessage(data?.message || "If an account exists, a reset link has been sent.");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] py-12 px-4">
      <div className="mx-auto max-w-md rounded-2xl border border-brand-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1F1720]">Forgot Password</h1>
        <p className="mt-2 text-sm text-[#6B5A64]">Enter your email and we will send a secure reset link.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1F1720]">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#A7066A] hover:bg-[#8A0558] text-white">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <p className="mt-6 text-sm text-[#6B5A64]">
          Back to{" "}
          <Link href="/sign-in" className="font-medium text-[#A7066A] hover:text-[#8A0558]">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
