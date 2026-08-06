// src/components/hero/HeroContent.tsx
import { motion, type Variants } from 'framer-motion';
import HeroButtons from './HeroButtons';
import HeroStats from './HeroStats';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  },
};

export default function HeroContent() {
  return (
    <motion.div 
      className="space-y-8 text-center lg:text-left"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Headline */}
      <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight">
        Navigate Ethiopian <br className="hidden lg:block" />
        <span className="text-[#b08d57]">Government Services</span> <br className="hidden lg:block" />
        with AI
      </motion.h1>

      {/* Paragraph */}
      <motion.p variants={itemVariants} className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
        Get instant, accurate answers about passports, IDs, licenses, and taxes. 
        Available seamlessly in both <span className="font-semibold text-gray-800">Amharic</span> and <span className="font-semibold text-gray-800">English</span>.
      </motion.p>

      {/* Unified Apple-Style Buttons */}
      <motion.div variants={itemVariants} className="flex justify-center lg:justify-start">
        <HeroButtons />
      </motion.div>

      {/* Statistics */}
      <motion.div variants={itemVariants} className="pt-4">
        <HeroStats />
      </motion.div>
    </motion.div>
  );
}