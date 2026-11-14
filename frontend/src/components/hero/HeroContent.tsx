// src/components/hero/HeroContent.tsx
// Starts at once and slides in from the left. It does not wait for anything.
import { motion } from 'framer-motion';
import HeroButtons from './HeroButtons';
import HeroStats from './HeroStats';

const EASE = [0.22, 1, 0.36, 1] as const;
const fromLeft = (delay: number) => ({
  initial: { opacity: 0, x: -80 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.8, delay, ease: EASE },
});

export default function HeroContent() {
  return (
    <div className="space-y-6 text-center lg:text-left">
      <motion.h1 {...fromLeft(0)} className="text-[1.9rem] font-semibold leading-[1.15] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.6rem]">
        Navigate Ethiopian <span className="text-[#b08d57]">government services</span> with answers you can trust
      </motion.h1>

      <motion.p {...fromLeft(0.08)} className="mx-auto max-w-lg text-base leading-relaxed text-gray-600 lg:mx-0">
        Ask about passports, IDs, licenses and certificates in <span className="font-semibold text-gray-800">Amharic</span> or <span className="font-semibold text-gray-800">English</span>. Every answer comes from information that was reviewed first.
      </motion.p>

      <motion.div {...fromLeft(0.16)} className="flex justify-center lg:justify-start">
        <HeroButtons />
      </motion.div>

      <motion.div {...fromLeft(0.24)} className="pt-2">
        <HeroStats />
      </motion.div>
    </div>
  );
}
