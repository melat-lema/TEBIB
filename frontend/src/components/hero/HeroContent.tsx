// src/components/hero/HeroContent.tsx
import { motion, type Variants } from 'framer-motion';
import HeroButtons from './HeroButtons';
import HeroStats from './HeroStats';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function HeroContent() {
  return (
    <motion.div className="space-y-6 text-center lg:text-left" variants={containerVariants} initial="hidden" animate="visible">
      <motion.h1 variants={itemVariants} className="text-[1.9rem] font-semibold leading-[1.15] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.6rem]">
        Navigate Ethiopian <span className="text-[#b08d57]">government services</span> with answers you can trust
      </motion.h1>

      <motion.p variants={itemVariants} className="mx-auto max-w-lg text-base leading-relaxed text-gray-600 lg:mx-0">
        Ask about passports, IDs, licenses and certificates in <span className="font-semibold text-gray-800">Amharic</span> or <span className="font-semibold text-gray-800">English</span>. Every answer comes from information that was reviewed first.
      </motion.p>

      <motion.div variants={itemVariants} className="flex justify-center lg:justify-start">
        <HeroButtons />
      </motion.div>

      <motion.div variants={itemVariants} className="pt-2">
        <HeroStats />
      </motion.div>
    </motion.div>
  );
}
