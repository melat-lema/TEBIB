// src/components/hero/Hero.tsx
import { lazy, Suspense } from 'react';
import BackgroundBlobs from './BackgroundBlobs';
import HeroContent from './HeroContent';
import ScrollIndicator from './ScrollIndicator';

// three.js is large: load it after the text so the headline appears instantly
const HeroCanvas = lazy(() => import('./HeroCanvas'));

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_42%,#2d2318_0%,#17120d_60%,#0f0c09_100%)] shadow-2xl shadow-[#b08d57]/20 ring-1 ring-[#b08d57]/20 lg:h-[600px]">
      {children}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div className="order-2 lg:order-1">
            <HeroContent />
          </div>
          <div className="order-1 lg:order-2">
            <Stage>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <div className="h-28 w-28 animate-pulse rounded-full border border-[#b08d57]/40 bg-[#b08d57]/10" />
                  </div>
                }
              >
                <HeroCanvas />
              </Suspense>
            </Stage>
          </div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
