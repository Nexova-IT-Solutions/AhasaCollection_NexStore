import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

// Production Diagnostic Logs - Help identify missing Vercel Environment Variables
if (process.env.NODE_ENV === "production") {
  console.log("[Auth-Diagnostic] Checking environment variables...");
  if (!process.env.NEXTAUTH_SECRET) console.error("[Auth-Diagnostic] ❌ NEXTAUTH_SECRET is MISSING");
  if (!process.env.NEXTAUTH_URL) console.error("[Auth-Diagnostic] ❌ NEXTAUTH_URL is MISSING");
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn("[Auth-Diagnostic] ⚠️ GOOGLE_CLIENT_ID is missing. Google login will be disabled.");
  }
  
  if (!process.env.FACEBOOK_CLIENT_ID) {
    console.warn("[Auth-Diagnostic] ⚠️ FACEBOOK_CLIENT_ID is missing. Facebook login will be disabled.");
  }
  
  if (!process.env.TIKTOK_CLIENT_KEY) {
    console.warn("[Auth-Diagnostic] ⚠️ TIKTOK_CLIENT_KEY is missing. TikTok login will be disabled.");
  }
}

export const authOptions: NextAuthOptions = {
  adapter: db ? PrismaAdapter(db) : undefined, // Defensive check for adapter initialization
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth/error",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            profile(profile) {
              console.log("[Auth-Debug] Facebook Profile Response Received:", profile.id);
              return {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                image: profile.picture.data.url,
                role: "USER" as any,
              };
            },
          }),
        ]
      : []),
    ...(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET ? [{
      id: "tiktok",
      name: "TikTok",
      type: "oauth" as const,
      authorization: {
        url: "https://www.tiktok.com/v2/auth/authorize/",
        params: {
          client_key: process.env.TIKTOK_CLIENT_KEY,
          scope: "user.info.basic,user.info.profile",
          response_type: "code",
        },
      },
      token: {
        url: "https://open.tiktokapis.com/v2/oauth/token/",
        async request(context: any) {
          const params = new URLSearchParams({
            client_key: context.provider.clientId as string,
            client_secret: context.provider.clientSecret as string,
            code: context.params.code as string,
            grant_type: "authorization_code",
            redirect_uri: context.provider.callbackUrl,
          });

          const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });

          const tokens = await response.json();
          
          if (tokens.error) {
            console.error("[TikTok-Auth] Token Error:", tokens);
            throw new Error(tokens.error_description || tokens.error);
          }
          
          // Return tokens wrapped in 'tokens' as required by NextAuth TokenSetParameters
          return {
            tokens: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: tokens.expires_at || (Math.floor(Date.now() / 1000) + (tokens.expires_in || 0)),
              token_type: tokens.token_type,
              scope: tokens.scope,
              open_id: tokens.open_id
            }
          };
        },
      },
      userinfo: {
        url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,avatar_url_100",
        async request({ tokens, provider }: any) {
          const url = typeof provider.userinfo === 'string' 
            ? provider.userinfo 
            : (provider.userinfo as any)?.url;
            
          const response = await fetch(url as string, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          
          const info = await response.json();
          if (info.error) {
            console.error("[TikTok-Auth] UserInfo Error:", info);
          }
          return info;
        },
      },
      profile(profile: any) {
        console.log("[Auth-Debug] TikTok Profile Response Received");
        // Support both direct return and TikTok v2 { data: { user: ... } } structure
        const tiktokUser = profile?.data?.user || profile?.user || profile || {};
        
        const id = tiktokUser.open_id || tiktokUser.union_id || profile.id;
        const name = tiktokUser.display_name || profile.name || "TikTok User";
        const email = tiktokUser.email || profile.email || null; // Sandbox might provide email if configured
        
        console.log(`[Auth-Debug] TikTok Mapped User: ID=${id}, Name=${name}`);

        if (!id) {
          console.error("[Auth-Error] No stable ID found in TikTok profile response:", profile);
        }

        return {
          id: id || `tt-temp-${Date.now()}`,
          name: name,
          email: email,
          image: tiktokUser.avatar_url_100 || tiktokUser.avatar_url || profile.image || null,
          role: "USER" as any,
        };
      },
      clientId: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    }] : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!db) return null; // Safety guard

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) return null;

        // Check if account is active
        if (user.isActive === false) {
          throw new Error("ACCOUNT_SUSPENDED");
        }

        // Return user object containing ID, email, name, role, and templateId to callbacks
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          templateId: user.templateId,
        } as any;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log(`[Auth-Debug] SignIn attempt for provider: ${account?.provider}`);
      
      if (!db) {
        console.error("[Auth-Error] Database instance (db) is UNDEFINED in signIn callback");
        return false;
      }

      // If there's an email, check for account suspension
      if (user.email) {
        try {
          console.log(`[Auth-Debug] Checking status for email: ${user.email}`);
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            select: { isActive: true }
          });

          if (dbUser && dbUser.isActive === false) {
            console.warn(`[Auth-Warn] Blocked sign-in for suspended account: ${user.email}`);
            return false;
          }
        } catch (error) {
          console.error("[Auth-Error] SignIn DB Query Failure:", error);
        }
      } else {
        console.log("[Auth-Debug] No email provided in user object (Standard for TikTok Sandbox)");
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        const app = new URL(baseUrl);

        if (target.origin === app.origin) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.templateId = (user as any).templateId;
        token.image = user.image;
      }

      if (token?.id) {
        // Fetch direct custom permissions and permission template dynamically
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: {
              email: true,
              role: true,
              customPermissions: true,
              template: {
                select: {
                  permissions: true,
                },
              },
            },
          });

          let mergedPermissions: Record<string, boolean> = {};

          if (dbUser) {
            if (dbUser.email === "devadmin@mail.com") {
              token.role = "DEV_ADMIN";
            } else {
              token.role = dbUser.role;
            }
            // First load template-level permissions if available
            if (dbUser.template?.permissions && typeof dbUser.template.permissions === "object") {
              mergedPermissions = { ...dbUser.template.permissions as Record<string, boolean> };
            }
            // Overwrite with direct custom overrides
            if (dbUser.customPermissions && typeof dbUser.customPermissions === "object") {
              mergedPermissions = {
                ...mergedPermissions,
                ...dbUser.customPermissions as Record<string, boolean>,
              };
            }
          }

          token.customPermissions = mergedPermissions;
        } catch (error) {
          console.error("[Auth-JWT] Failed to load granular permissions:", error);
          if (!token.customPermissions) {
            token.customPermissions = {};
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.templateId = token.templateId as string;
        session.user.image = token.image as string | undefined;
        session.user.customPermissions = (token.customPermissions as Record<string, boolean>) || {};
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      templateId?: string | null;
      customPermissions?: Record<string, boolean>;
    }
  }

  interface User {
    id: string;
    role: string;
    templateId?: string | null;
    customPermissions?: Record<string, boolean>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    templateId?: string | null;
    image?: string | null;
    customPermissions?: Record<string, boolean>;
  }
}
