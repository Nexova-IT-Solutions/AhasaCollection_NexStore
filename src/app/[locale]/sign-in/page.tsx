"use client";

import { useState } from "react";
import { Header, Footer, SectionHeading, CartDrawer } from "@/components/giftbox";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { SocialLoginButton } from "@/components/SocialLoginButton";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { version } from "../../../../package.json";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SignInPage() {
  const t = useTranslations("SignIn");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isWebsiteEnabled = toggles?.storefront_website_enabled !== false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      toast({
        title: t("errorTitle"),
        description: t("errorDescription"),
        variant: "destructive",
      });
      setLoading(false);
    } else {
      const refreshedSession = await getSession();
      const role = refreshedSession?.user?.role;
      const destination = callbackUrl !== "/" 
        ? callbackUrl 
        : (role === "POS_ADMIN" ? "/admin/pos" : (role && role !== "USER" ? "/admin" : "/"));

      router.push(destination);
      router.refresh(); // Refresh to update session
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-brand-border">
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
          
          {isWebsiteEnabled && (
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
          )}

          <form className="mt-4 space-y-6" onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1F1720]">{t("emailLabel")}</label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F1720]">{t("passwordLabel")}</label>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="mt-1"
                />
                <div className="mt-2 text-right">
                  <Link href="/auth/forgot-password" className="text-xs font-medium text-[#A7066A] hover:text-[#8A0558]">
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A7066A] hover:bg-[#8A0558] text-white"
            >
              {loading ? t("signingInButton") : t("signInButton")}
            </Button>
          </form>

          {isWebsiteEnabled && (
            <div className="text-center pt-4">
              <p className="text-sm text-[#6B5A64]">
                {t("dontHaveAccount")}{" "}
                <Link href="/sign-up" className="font-medium text-[#A7066A] hover:text-[#E91E8C]">
                  {t("signUpLink")}
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
      {isWebsiteEnabled ? (
        <Footer />
      ) : (
        <footer className="py-6 border-t border-brand-border/60 bg-slate-50 text-center text-xs text-[#6B5A64] mt-auto">
          <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <p>© 2026 SPC. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <a 
                href="https://nexovaitsolutions.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline font-semibold text-[#A7066A]"
              >
                Developed by Nexova
              </a>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>v{version}</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
