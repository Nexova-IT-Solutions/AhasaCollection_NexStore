import { Header, Footer, ContactPage, CartDrawer } from "@/components/giftbox";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MapPin, Phone, Globe, Clock } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactUsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Contact");

  const contactInfo = [
    {
      icon: <MapPin className="w-6 h-6 text-[#A7066A]" />,
      label: t("emailLabel"),
      value: "giftboxlankaofficial@gmail.com",
    },
    {
      icon: <Phone className="w-6 h-6 text-[#A7066A]" />,
      label: t("phoneLabel"),
      value: "+94 75 354 5224 | +94 11 753 7359",
    },
    {
      icon: <Globe className="w-6 h-6 text-[#A7066A]" />,
      label: t("websiteLabel"),
      value: "giftboxlanka.lk",
    },
    {
      icon: <Clock className="w-6 h-6 text-[#A7066A]" />,
      label: t("hoursLabel"),
      value: t("hoursValue"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      
      <main className="flex-1">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#FCEAF4] via-white to-[#FFF7FB] border-b border-brand-border">
          <div className="mx-auto max-w-[1600px] px-4 py-12 md:px-8 lg:px-10 md:py-16 flex flex-col items-center text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#A7066A]">{t("getInTouch")}</p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1F1720] leading-tight mb-6">{t("heading")}</h1>
            <Breadcrumb>
              <BreadcrumbList className="justify-center">
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${locale}`} className="text-[#A7066A] hover:text-[#8A0558]">{t("home")}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1F1720]">{t("contact")}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Contact Info Cards */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {contactInfo.map((info, index) => (
                <div
                  key={index}
                  className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center transition-transform hover:scale-105"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FCEAF4] flex items-center justify-center mb-4">
                    {info.icon}
                  </div>
                  <h3 className="font-bold text-[#1F1720] mb-2">{info.label}</h3>
                  <p className="text-[#6B5A64] text-sm break-all">{info.value}</p>
                </div>
              ))}
            </div>

            {/* Address Block */}
            <div className="text-center">
              <h3 className="font-bold text-[#1F1720] mb-2">{t("companyName")}</h3>
              <p className="text-[#6B5A64]">{t("addressLine1")}</p>
              <p className="text-[#6B5A64]">{t("addressLine2")}</p>
            </div>
          </div>
        </section>

        {/* Google Maps Embed */}
        <section className="w-full max-w-5xl mx-auto px-4 mb-16">
          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 h-[400px]">
            <iframe
              src="https://maps.google.com/maps?q=6.9026,79.9637&z=16&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </section>

        {/* Contact Form Section */}
        <ContactPage />
      </main>

      <Footer />
    </div>
  );
}
