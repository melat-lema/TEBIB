// src/components/hero/BackgroundBlobs.tsx
import { motion } from 'framer-motion';

export default function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gold Blur - Top Left */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-[#b08d57]/15 rounded-full blur-[140px]" 
      />
      
      {/* Gray Blur - Top Right */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
        className="absolute top-20 right-0 w-[400px] h-[400px] bg-gray-300/20 rounded-full blur-[120px]" 
      />
      
      {/* Gold Blur - Bottom Left */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
        className="absolute bottom-0 left-20 w-[500px] h-[500px] bg-[#b08d57]/10 rounded-full blur-[100px]" 
      />
    </div>
  );
}