// src/components/hero/HeroContent.tsx
// Plain elements: the entrance is driven by CSS (see landing.css), not by JavaScript animation.
import HeroButtons from './HeroButtons';
import HeroStats from './HeroStats';

const item = (i: number) => ({ className: 'hero-item', style: { ['--i' as string]: i } as React.CSSProperties });

export default function HeroContent() {
  return (
    <div className="space-y-6 text-center lg:text-left">
      <h1 {...item(0)} className="hero-item text-[1.9rem] font-semibold leading-[1.15] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.6rem]">
        Navigate Ethiopian <span className="text-[#b08d57]">government services</span> with answers you can trust
      </h1>

      <p {...item(1)} className="hero-item mx-auto max-w-lg text-base leading-relaxed text-gray-600 lg:mx-0">
        Ask about passports, IDs, licenses and certificates in <span className="font-semibold text-gray-800">Amharic</span> or <span className="font-semibold text-gray-800">English</span>. Every answer comes from information that was reviewed first.
      </p>

      <div {...item(2)} className="hero-item flex justify-center lg:justify-start">
        <HeroButtons />
      </div>

      <div {...item(3)} className="hero-item pt-2">
        <HeroStats />
      </div>
    </div>
  );
}
