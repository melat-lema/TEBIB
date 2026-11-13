// src/components/hero/Hero.tsx
import { lazy, Suspense } from 'react';
import BackgroundBlobs from './BackgroundBlobs';
import HeroContent from './HeroContent';
import ScrollIndicator from './ScrollIndicator';

// three.js is large: load it after the text so the headline appears instantly
const HeroCanvas = lazy(() => import('./HeroCanvas'));

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
          <div className="order-2 lg:order-1">
            <HeroContent />
          </div>
          <div className="order-1 h-[440px] w-full lg:order-2 lg:h-[640px]">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <div className="h-32 w-32 animate-pulse rounded-full border border-[#b08d57]/40 bg-[#b08d57]/10" />
                </div>
              }
            >
              <HeroCanvas />
            </Suspense>
          </div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
