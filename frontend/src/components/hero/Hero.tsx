// src/components/hero/Hero.tsx
import { lazy, Suspense, useEffect, useState } from 'react';
import BackgroundBlobs from './BackgroundBlobs';
import HeroContent from './HeroContent';
import ScrollIndicator from './ScrollIndicator';

// Start downloading the 3D code immediately, in parallel with everything else
const loadCanvas = () => import('./HeroCanvas');
loadCanvas();
const HeroCanvas = lazy(loadCanvas);

export default function Hero() {
  // Both sides stay hidden until the 3D scene is complete, then arrive TOGETHER:
  // text from the left, 3D from the right. The CSS for this is in landing.css.
  const [ready, setReady] = useState(false);

  // If the 3D is slow or WebGL is unavailable, show the page anyway after a short wait
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section data-ready={ready} className="hero-stage relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-15 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
          <div className="order-2 lg:order-1">
            <HeroContent />
          </div>

          <div className="hero-right order-1 h-[440px] w-full lg:order-2 lg:h-[640px]">
            <Suspense fallback={null}>
              <HeroCanvas onReady={() => setReady(true)} />
            </Suspense>
          </div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
