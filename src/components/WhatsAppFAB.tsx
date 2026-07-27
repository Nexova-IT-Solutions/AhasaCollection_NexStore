"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WhatsAppFAB() {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isWhatsappEnabled = toggles?.whatsapp_enabled !== false;

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide on admin routes
  const isAdminRoute = pathname?.split('/').some(part => part === 'admin');

  if (!mounted || isAdminRoute || !isWhatsappEnabled) return null;

  return (
    <>
      {/* Constraints area */}
      <div 
        ref={constraintsRef} 
        className="fixed inset-4 pointer-events-none z-[9998]" 
      />
      
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          // Keep isDragging true for a split second to prevent the click handler from firing
          setTimeout(() => setIsDragging(false), 100);
        }}
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-28 sm:bottom-6 right-6 z-[9999] touch-none select-none cursor-grab active:cursor-grabbing pointer-events-auto"
      >
        <Link
          href="https://wa.me/94779911825"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          // CRITICAL: Disable native browser dragging behaviors
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-2xl border border-white/20 transition-all hover:shadow-[0_8px_30px_rgba(37,211,102,0.4)] select-none"
          onClick={(e) => {
            // Prevent navigation if the icon was dragged
            if (isDragging) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Animated pulse background */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25 pointer-events-none" />
          
          <MessageCircle className="h-7 w-7 relative z-10 pointer-events-none" />
        </Link>
      </motion.div>
    </>
  );
}
