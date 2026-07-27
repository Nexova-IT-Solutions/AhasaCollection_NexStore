"use client"

import { motion } from "framer-motion";
import Image from "next/image";

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative">
        {/* Pulsing rings */}
        <motion.div
          className="absolute -inset-4 rounded-full bg-[#A7066A]/10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="relative z-10 p-6 bg-white rounded-3xl border border-brand-border shadow-xl shadow-pink-100/20"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative w-16 h-16">
            <Image
              src="/logo/logo.png"
              alt="GiftBox Lanka"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <motion.p
          className="text-lg font-bold text-[#1F1720] tracking-tight"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading your gifts...
        </motion.p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#A7066A]"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
