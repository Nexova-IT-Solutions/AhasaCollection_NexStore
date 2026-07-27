"use client";

import { useState, useEffect } from "react";
import { Header, Footer, SectionHeading, CartDrawer } from "@/components/giftbox";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SocialLoginButton } from "@/components/SocialLoginButton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getSignUpSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().trim().min(1, t("requiredField")),
      email: z.string().trim().min(1, t("requiredField")).email(t("emailInvalid")),
      password: z.string().trim().min(1, t("requiredField")).min(6, t("passwordLength")),
      confirmPassword: z.string().trim().min(1, t("requiredField")),
      marketingConsent: z.boolean(),
      privacyConsent: z.boolean().refine((val) => val === true, {
        message: t("privacyRequired"),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsDoNotMatch"),
    });
}

export default function SignUpPage() {
  const t = useTranslations("SignUp");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  
  useEffect(() => {
    if (toggles && toggles.storefront_website_enabled === false) {
      router.push("/sign-in");
    }
  }, [toggles, router]);

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "password" | "confirmPassword" | "privacyConsent", string>>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = getSignUpSchema(t).safeParse({ name, email, password, confirmPassword, marketingConsent, privacyConsent });
    if (!parsed.success) {
      const nextErrors: Partial<Record<"name" | "email" | "password" | "confirmPassword" | "privacyConsent", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "name" | "email" | "password" | "confirmPassword" | "privacyConsent";
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, marketingConsent, privacyConsent }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to register");
      }

      toast({
        title: t("successTitle"),
        description: t("successDescription"),
      });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("recentlyViewed");
        window.localStorage.removeItem("recently_viewed");
      }

      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (error: any) {
      toast({
        title: t("failedTitle"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 md:px-8 lg:px-10">
        <div className="w-full max-w-[1200px] grid gap-8 lg:grid-cols-[0.9fr_1.1fr] items-start">
          <div className="hidden lg:block rounded-[2rem] border border-brand-border bg-gradient-to-br from-[#FCEAF4] via-white to-[#FFF7FB] p-8 shadow-sm">
            <div className="sticky top-24 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#A7066A]">{t("joinTitle")}</p>
              <h1 className="text-4xl font-bold text-[#1F1720] leading-tight">
                {t("joinHeader")}
              </h1>
              <p className="text-base leading-7 text-[#6B5A64] max-w-xl">
                {t("joinDesc")}
              </p>
            </div>
          </div>

        <div className="w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-brand-border">
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />

          <div className="mt-8 space-y-3">
            <SocialLoginButton provider="google" label={t("googleLabel")} callbackUrl={callbackUrl} />
            <SocialLoginButton provider="tiktok" label={t("tiktokLabel")} callbackUrl={callbackUrl} />
            <SocialLoginButton provider="facebook" label={t("facebookLabel")} callbackUrl={callbackUrl} />
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-brand-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#6B5A64]">{t("orContinueEmail")}</span>
              </div>
            </div>
          </div>

          <form className="mt-4 space-y-6" onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <Label required className="text-sm font-medium text-[#1F1720]">{t("fullNameLabel")}</Label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("fullNamePlaceholder")}
                  className="mt-1"
                />
                {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
              </div>
              <div>
                <Label required className="text-sm font-medium text-[#1F1720]">{t("emailLabel")}</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1"
                />
                {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
              </div>
              <div>
                <Label required className="text-sm font-medium text-[#1F1720]">{t("passwordLabel")}</Label>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="mt-1"
                  minLength={6}
                />
                {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password}</p> : null}
              </div>
              <div>
                <Label required className="text-sm font-medium text-[#1F1720]">{t("confirmPasswordLabel")}</Label>
                <PasswordInput
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("confirmPasswordPlaceholder")}
                  className="mt-1"
                  minLength={6}
                />
                {errors.confirmPassword ? <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p> : null}
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-brand-border bg-slate-50 px-4 py-3 text-sm text-[#3A2B35]">
                <Checkbox
                  checked={marketingConsent}
                  onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                  className="mt-0.5 size-5 rounded-md"
                />
                <span className="leading-6">
                  {t("marketingConsent")}
                </span>
              </label>

              <label className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                privacyConsent ? "border-[#A7066A] bg-[#FCEAF4]/40" : "border-brand-border bg-slate-50"
              )}>
                <Checkbox
                  checked={privacyConsent}
                  onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
                  className="mt-0.5 size-5 rounded-md"
                  aria-invalid={Boolean(errors.privacyConsent)}
                />
                <span className="leading-6">
                  {t("privacyConsent")}
                </span>
              </label>
              {errors.privacyConsent ? <p className="text-sm text-red-600">{errors.privacyConsent}</p> : null}
            </div>

            <Button
              type="submit"
              disabled={loading || !privacyConsent}
              className="w-full bg-[#A7066A] hover:bg-[#8A0558] text-white"
            >
              {loading ? t("creatingAccountButton") : t("createAccountButton")}
            </Button>

            <p className="text-center text-sm text-[#6B5A64]">
              {t("termsHeading")}{" "}
              <Link href="/terms-of-conditions" target="_blank" rel="noopener noreferrer" className="font-medium text-[#A7066A] hover:text-[#8A0558]">
                {t("termsOfConditions")}
              </Link>{" "}|{" "}
              <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#A7066A] hover:text-[#8A0558]">
                {t("privacyPolicy")}
              </Link>
            </p>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-[#6B5A64]">
              {t("alreadyHaveAccount")}{" "}
              <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-[#A7066A] hover:text-[#E91E8C]">
                {t("signInLink")}
              </Link>
            </p>
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
