import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { GiftCardsClient } from "./gift-cards-client";

export default async function AdminGiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  
  // Resolve digital page and paper page parameters with defaults
  const digitalPage = parseInt(resolvedParams.digitalPage as string || "1") || 1;
  const digitalLimit = parseInt(resolvedParams.digitalLimit as string || "10") || 10;
  
  const paperPage = parseInt(resolvedParams.paperPage as string || "1") || 1;
  const paperLimit = parseInt(resolvedParams.paperLimit as string || "10") || 10;

  // Fetch Digital gift cards with backend pagination
  const [digitalGiftCards, totalDigitalCount] = await Promise.all([
    db.giftCard.findMany({
      where: { isPhysical: false },
      include: {
        purchasedInOrder: {
          select: {
            id: true,
            orderNumber: true,
          }
        },
        redemptions: {
          include: {
            order: {
              select: {
                orderNumber: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (digitalPage - 1) * digitalLimit,
      take: digitalLimit
    }),
    db.giftCard.count({
      where: { isPhysical: false }
    })
  ]);

  // Fetch Printed/Paper gift cards with backend pagination
  const [paperGiftCards, totalPaperCount] = await Promise.all([
    db.giftCard.findMany({
      where: { isPhysical: true },
      include: {
        purchasedInOrder: {
          select: {
            id: true,
            orderNumber: true,
          }
        },
        redemptions: {
          include: {
            order: {
              select: {
                orderNumber: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (paperPage - 1) * paperLimit,
      take: paperLimit
    }),
    db.giftCard.count({
      where: { isPhysical: true }
    })
  ]);

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F1720]">Gift Card Management</h1>
          <p className="text-[#6B5A64] mt-1">Manage digital templates and printed physical gift vouchers.</p>
        </div>

        <GiftCardsClient 
          digitalCards={digitalGiftCards} 
          paperCards={paperGiftCards} 
          totalDigitalCount={totalDigitalCount}
          totalPaperCount={totalPaperCount}
          digitalPage={digitalPage}
          paperPage={paperPage}
          digitalLimit={digitalLimit}
          paperLimit={paperLimit}
        />
      </div>
    </div>
  );
}
