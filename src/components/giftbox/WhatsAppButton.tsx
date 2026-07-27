"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function WhatsAppButton() {
  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isWhatsappEnabled = toggles?.whatsapp_enabled !== false;

  if (!isWhatsappEnabled) return null;

  return (
    <Link
      href="https://wa.me/94779911825"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 left-6 z-[9999] inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-green-600"
    >
      <MessageCircle className="h-6 w-6" />
    </Link>
  );
}