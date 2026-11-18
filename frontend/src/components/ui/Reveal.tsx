import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type From = 'left' | 'right' | 'up' | 'down';

export default function Reveal({
  from = 'up', delay = 0, distance = 90, amount = 0.2, className, children,
}: { from?: From; delay?: number; distance?: number; amount?: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const x = from === 'left' ? -distance : from === 'right' ? distance : 0;
  const y = from === 'up' ? distance * 0.6 : from === 'down' ? -distance * 0.6 : 0;
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
