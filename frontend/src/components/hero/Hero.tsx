// src/components/hero/Hero.tsx
import BackgroundBlobs from './BackgroundBlobs';
import HeroContent from './HeroContent';
import HeroCanvas from './HeroCanvas';
import ScrollIndicator from './ScrollIndicator';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* 1. Premium Background */}
      <BackgroundBlobs />

      {/* 2. Main Grid Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Side: Text, Buttons, Stats */}
          <div className="order-2 lg:order-1">
            <HeroContent />
          </div>

          {/* Right Side: 3D Scene */}
          <div className="order-1 lg:order-2 h-[400px] lg:h-[600px] w-full">
            <HeroCanvas />
          </div>

        </div>
      </div>

      {/* 3. Bottom Scroll Indicator */}
      <ScrollIndicator />
    </section>
  );
}