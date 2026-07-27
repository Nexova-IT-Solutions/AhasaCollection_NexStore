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
  title: "Terms of Conditions | Giftbox Lanka",
  description: "Read our terms of conditions covering order processing, delivery, returns, and site usage.",
}

export default async function TermsOfConditionsPage({
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
          <h1 className="text-4xl md:text-4xl font-bold text-[#1F1720] leading-tight mb-6">Terms of Conditions</h1>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}`} className="text-[#A7066A] hover:text-[#8A0558]">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[#1F1720]">Terms of Conditions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-12 md:px-8 lg:px-10 lg:py-16">
        <article className="prose prose-slate max-w-none prose-headings:text-[#1F1720] prose-a:text-[#A7066A] prose-a:no-underline hover:prose-a:underline prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-7 prose-li:leading-7">
          <p>
            These terms outline how orders, deliveries, returns, and site usage work for Giftbox Lanka. By using the site, you agree to follow these terms and any applicable policies.
          </p>

          <h2>Order Processing</h2>
          <p>
            Orders are confirmed only after payment verification and stock validation. We may contact you if an item is unavailable, delayed, or requires clarification before dispatch.
          </p>
          <ul>
            <li>Order confirmations may be sent by email or SMS.</li>
            <li>Cut-off times may apply for same-day delivery windows.</li>
            <li>Gift messages and personalization requests are processed as submitted.</li>
          </ul>

          <h2>Delivery Terms</h2>
          <p>
            Delivery timelines depend on location, product availability, and courier capacity. While we aim to meet the quoted delivery estimate, exact arrival times cannot be guaranteed.
          </p>
          <ul>
            <li>Ensure delivery details are accurate and complete.</li>
            <li>Recipient unavailability may result in rescheduling or redelivery fees.</li>
            <li>Risk of loss transfers upon successful delivery to the recipient or the designated address.</li>
          </ul>

          <h2>Returns</h2>
          <p>
            Returns are accepted only for damaged, defective, or incorrect items reported within a reasonable timeframe after delivery. Perishable goods and personalized products may be excluded unless they arrive in unusable condition.
          </p>
          <ul>
            <li>Supporting photos may be required to process a return claim.</li>
            <li>Approved returns may result in a replacement, refund, or store credit.</li>
            <li>Shipping charges are non-refundable unless the error was caused by us.</li>
          </ul>

          <h2>User Conduct</h2>
          <p>
            You agree not to misuse the website, interfere with its operation, or submit unlawful, abusive, or fraudulent content. We may suspend access if we detect behavior that puts customers, staff, or systems at risk.
          </p>
          <ul>
            <li>Do not submit false account details or payment information.</li>
            <li>Do not attempt unauthorized access to accounts or systems.</li>
            <li>Respect intellectual property and brand assets.</li>
          </ul>

          <p>
            Questions about these terms can be directed to the support team through the contact page.
          </p>

          <p>
            <Link href={`/${locale}/privacy-policy`}>Read the Privacy Policy</Link>
          </p>
        </article>
      </main>
    </div>
  )
}