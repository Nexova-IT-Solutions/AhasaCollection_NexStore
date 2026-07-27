import Link from "next/link"
import { Metadata } from "next"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Privacy Policy | Giftbox Lanka",
  description: "Learn how we collect, use, and protect your personal data at Giftbox Lanka.",
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#FCEAF4] via-white to-[#FFF7FB] border-b border-brand-border">
        <div className="mx-auto max-w-[1600px] px-4 py-12 md:px-8 lg:px-10 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#A7066A]">Legal</p>
          <h1 className="text-4xl md:text-4xl font-bold text-[#1F1720] leading-tight mb-6">Privacy Policy</h1>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}`} className="text-[#A7066A] hover:text-[#8A0558]">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[#1F1720]">Privacy Policy</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-12 md:px-8 lg:px-10 lg:py-16">
        <article className="prose prose-slate max-w-none prose-headings:text-[#1F1720] prose-a:text-[#A7066A] prose-a:no-underline hover:prose-a:underline prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-7 prose-li:leading-7">
          <p>
            This policy explains what data we collect, how we use it, and the limited circumstances in which it may be shared. We keep the policy intentionally simple and transparent for our customers.
          </p>

          <h2>Data Collection</h2>
          <p>
            We may collect contact and account details such as your email address, phone number, name, delivery information, and order history when you create an account or place an order.
          </p>
          <ul>
            <li>Email is used for account access, order status, and support communication.</li>
            <li>Phone numbers are used for delivery coordination and urgent order updates.</li>
            <li>We may also store preferences you provide to improve your shopping experience.</li>
          </ul>

          <h2>Usage of Data</h2>
          <p>
            Collected data is used to process orders, provide customer support, send service-related notifications, and improve product recommendations and site performance.
          </p>
          <ul>
            <li>We use your account information to manage purchases and checkout.</li>
            <li>We may send transactional messages such as order confirmations and delivery updates.</li>
            <li>With consent, we may send promotional updates and marketing material.</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            Cookies and similar technologies help us remember your session, keep the cart active, and understand how the site is used. You can control cookies through your browser settings.
          </p>
          <ul>
            <li>Essential cookies support login, cart, and checkout functionality.</li>
            <li>Analytics cookies help us measure performance and improve the website.</li>
            <li>You may disable non-essential cookies, but some features may be affected.</li>
          </ul>

          <h2>Third-Party Sharing</h2>
          <p>
            We do not sell your personal data. Limited information may be shared with trusted third parties that help us run payments, shipping, messaging, or analytics services, but only where necessary to provide the service.
          </p>
          <ul>
            <li>Payment processors receive only the information required to complete transactions.</li>
            <li>Delivery partners receive contact and address details for fulfillment.</li>
            <li>Service providers are expected to protect the data they receive.</li>
          </ul>

          <p>
            If you have questions about this policy, please contact us through the support page.
          </p>

          <p>
            <Link href={`/${locale}/terms-of-conditions`}>Read the Terms of Conditions</Link>
          </p>
        </article>
      </main>
    </div>
  )
}