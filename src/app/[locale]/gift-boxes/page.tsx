import { redirect } from "next/navigation";

type GiftBoxesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function GiftBoxesPage({ params }: GiftBoxesPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/categories?categories=cmo3ymoqz0001ijk9penjfph8`);
}
