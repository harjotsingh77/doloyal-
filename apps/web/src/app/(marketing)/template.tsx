"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{
        clipPath: "circle(0.1% at 50% 50%)",
        opacity: 0,
        scale: 0.97,
      }}
      animate={{
        clipPath: "circle(150% at 50% 50%)",
        opacity: 1,
        scale: 1,
      }}
      transition={{
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        willChange: "clip-path, transform, opacity",
      }}
      className="w-full min-h-screen origin-center bg-[#FCFBFA]"
    >
      {children}
    </motion.div>
  );
}
