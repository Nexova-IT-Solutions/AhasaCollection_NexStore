import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Gift, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from "lucide-react";
import packageJson from "../../../package.json";
import { useTranslations } from "next-intl";


const footerLinks = {
  company: [
    { key: "aboutUs", href: "/about-us" },
    { key: "contactUs", href: "/contact" },
    { key: "returnPolicy", href: "/return-policy" },
    { key: "privacyPolicy", href: "/privacy-policy" },
  ],
};

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="bg-[#1F1720] text-white mt-auto border-t border-white/5">
      {/* Main Footer */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2 pr-0 lg:pr-20">
            <Link href="/" className="inline-block mb-6 transition-opacity hover:opacity-90">
              <Image 
                src="/logo/logo.png" 
                alt="SPC Logo" 
                width={126}
                height={36}
                className="object-contain"
              />
            </Link>
            <p className="text-[#B8A4B0] text-base leading-relaxed mb-8 max-w-md">
              {t("tagline")}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#A7066A] transition-all duration-300 group">
                <Facebook className="w-5 h-5 text-[#B8A4B0] group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#A7066A] transition-all duration-300 group">
                <Instagram className="w-5 h-5 text-[#B8A4B0] group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#A7066A] transition-all duration-300 group">
                <Twitter className="w-5 h-5 text-[#B8A4B0] group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em] mb-8">{t("company")}</h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.key}>
                  <Link 
                    href={link.href} 
                    prefetch={false} 
                    className="text-[#B8A4B0] text-sm hover:text-white hover:translate-x-1 transition-all duration-300 inline-block"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em] mb-8">{t("getInTouch")}</h3>
            <div className="space-y-5">
              <a href="tel:+94123456789" className="group flex items-center gap-4 text-sm text-[#B8A4B0] hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span>+94 123 456 789</span>
              </a>
              <a href="mailto:hello@soharpets.com" className="group flex items-center gap-4 text-sm text-[#B8A4B0] hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span>hello@soharpets.com</span>
              </a>
              <div className="group flex items-start gap-4 text-sm text-[#B8A4B0]">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <MapPin className="w-4 h-4 mt-0.5" />
                </div>
                <span className="leading-relaxed">{t("colomboSriLanka")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-[#B8A4B0]/60">
            {t("allRightsReserved", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-6 text-xs font-medium text-[#B8A4B0]/40 uppercase tracking-widest">
            <a 
              href="https://nexovaitsolutions.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Developed by Nexova
            </a>
            <span className="w-1 h-1 rounded-full bg-white/10"></span>
            <span>v{packageJson.version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
