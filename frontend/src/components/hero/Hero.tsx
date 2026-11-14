// src/components/hero/Hero.tsx
import { lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import BackgroundBlobs from './BackgroundBlobs';
import HeroContent from './HeroContent';
import ScrollIndicator from './ScrollIndicator';

// Start downloading the 3D code immediately (in parallel with everything else) instead of when it is first drawn
const loadCanvas = () => import('./HeroCanvas');
loadCanvas();
const HeroCanvas = lazy(loadCanvas);

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  // The text never waits for the 3D. The 3D slides in from the right the moment its scene is complete.
  const [sceneReady, setSceneReady] = useState(false);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
          <div className="order-2 lg:order-1">
            <HeroContent />
          </div>

          <motion.div
            className="order-1 h-[440px] w-full lg:order-2 lg:h-[640px]"
            initial={{ opacity: 0, x: 120 }}
            animate={sceneReady ? { opacity: 1, x: 0 } : { opacity: 0, x: 120 }}
            transition={{ duration: 1, ease: EASE }}
          >
            <Suspense fallback={null}>
              <HeroCanvas onReady={() => setSceneReady(true)} />
            </Suspense>
          </motion.div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
