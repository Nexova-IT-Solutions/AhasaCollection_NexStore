import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { createClient as createSupabaseMiddlewareClient } from "./utils/supabase/middleware";
import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always' 
});

function stripLocale(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const maybeLocale = parts[0];

  if (maybeLocale && locales.includes(maybeLocale as (typeof locales)[number])) {
    return {
      locale: maybeLocale,
      pathname: `/${parts.slice(1).join("/")}` || "/",
    };
  }

  return {
    locale: null,
    pathname,
  };
}

function toLocalizedPath(path: string, locale: string | null) {
  return locale ? `/${locale}${path}` : path;
}

export async function proxy(request: NextRequest) {
  // First, initialize the Supabase response (which handles session refreshes)
  const supabaseResponse = createSupabaseMiddlewareClient(request);

  const { pathname: rawPathname, locale } = stripLocale(request.nextUrl.pathname);
  const pathname = rawPathname === "" ? "/" : rawPathname;
  
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApiPath = pathname.startsWith("/api/admin");
  const isGeneralApiPath = pathname.startsWith("/api/") && !isAdminApiPath;

  // If it's a general API route (excluding api/admin), bypass next-intl and auth checks
  if (isGeneralApiPath) {
    const response = NextResponse.next();
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  // Protected routes that require authentication
  const checkoutPrefixes = ["/checkout"];
  const isCheckoutPath = checkoutPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isCheckoutApiPath = pathname.startsWith("/api/checkout/");
  
  const customerOnlyPrefixes = ["/profile", "/orders", "/wishlist"];
  const isCustomerOnlyPath = customerOnlyPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string | undefined;
  const isAuthenticated = Boolean(token);
  const isCustomer = role === "USER";
  const isStaff = isAuthenticated && !isCustomer;

  // Protect checkout routes - redirect to login with callback
  if ((isCheckoutPath || isCheckoutApiPath) && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = toLocalizedPath("/sign-in", locale);
    loginUrl.searchParams.set("callbackUrl", toLocalizedPath("/checkout", locale));
    const loginResponse = NextResponse.redirect(loginUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      loginResponse.cookies.set(cookie.name, cookie.value);
    });

    return loginResponse;
  }

  // Redirect staff away from customer-only paths (e.g., profile, orders)
  if (isCustomerOnlyPath && isStaff) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    const redirectResponse = NextResponse.redirect(redirectUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  // Redirect customers away from admin paths
  if (isAdminPath && isAuthenticated && isCustomer) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = toLocalizedPath("/", locale);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }
  
  // If it's /admin or /api/admin, completely bypass next-intl localization logic
  if (isAdminPath || isAdminApiPath) {
    const response = NextResponse.next();
    // Transfer cookies from the Supabase response to the final response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  // Then, run the intl middleware for storefront/other routes
  const response = intlMiddleware(request);

  // Transfer cookies from the Supabase response to the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except static files, _next, _vercel
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
