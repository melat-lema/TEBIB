// src/components/hero/HeroButtons.tsx
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

export default function HeroButtons() {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="inline-flex items-center bg-white border border-gray-200 rounded-full p-1.5 shadow-lg hover:shadow-xl hover:border-[#b08d57]/30 transition-all duration-300 group"
    >
      {/* Primary Action */}
      <button className="flex items-center gap-2 bg-[#b08d57] text-white px-6 py-3 rounded-full font-semibold text-sm sm:text-base hover:bg-[#8c6b42] transition-colors duration-300">
        Explore Services
      </button>

      {/* Glowing Divider */}
      <div className="w-px h-8 bg-gray-200 group-hover:bg-[#b08d57]/50 transition-colors duration-300 mx-1" />

      {/* Secondary Action */}
      <button className="flex items-center gap-2 text-gray-700 px-5 py-3 rounded-full font-semibold text-sm sm:text-base hover:text-[#b08d57] transition-colors duration-300 group/btn">
        <Play className="w-4 h-4 fill-current" />
        Watch Demo
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
      </button>
    </motion.div>
  );
}