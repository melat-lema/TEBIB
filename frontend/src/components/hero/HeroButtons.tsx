// src/components/hero/HeroButtons.tsx
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HeroButtons() {
  const scrollToServices = () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group inline-flex items-center rounded-full border border-gray-200 bg-white p-1.5 shadow-lg transition-all duration-300 hover:border-[#b08d57]/30 hover:shadow-xl"
    >
      <button
        onClick={scrollToServices}
        className="flex items-center gap-2 rounded-full bg-[#b08d57] px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-[#8c6b42] sm:text-base"
      >
        Explore Services
      </button>

      <div className="mx-1 h-8 w-px bg-gray-200 transition-colors duration-300 group-hover:bg-[#b08d57]/50" />

      <Link
        to="/register"
        className="group/btn flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-gray-700 transition-colors duration-300 hover:text-[#b08d57] sm:text-base"
      >
        <Sparkles className="h-4 w-4" />
        Ask the AI
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
      </Link>
    </motion.div>
  );
}
