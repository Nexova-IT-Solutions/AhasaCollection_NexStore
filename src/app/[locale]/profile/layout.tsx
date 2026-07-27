import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfileLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const children = props.children;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/sign-in`);
  }

  if (session.user?.role && session.user.role !== "USER") {
    redirect(`/admin`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="flex-shrink-0">
              <ProfileSidebar />
            </div>
            
            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8 min-h-[600px]">
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <CartDrawer />
    </div>
  );
}
