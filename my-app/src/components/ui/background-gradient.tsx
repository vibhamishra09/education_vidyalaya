"use client";

import { motion } from "framer-motion";

export function BackgroundGradient() {
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 -z-[100] overflow-hidden pointer-events-none">
      {/* Main Gradient Mesh - Extended with softer boundaries */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_50%_-20%,rgba(34,197,94,0.12)_0%,rgba(34,197,94,0.08)_25%,rgba(59,130,246,0.06)_50%,rgba(59,130,246,0.03)_70%,transparent_85%)]" />
      
      {/* Animated Blobs for depth */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[10%] w-72 h-72 bg-green-200/20 dark:bg-green-900/10 blur-[100px] rounded-full" 
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], x: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-20 right-[10%] w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] rounded-full" 
      />
    </div>
  );
}
