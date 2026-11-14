// src/components/hero/BackgroundBlobs.tsx
// Plain radial gradients instead of huge blurred, animated elements.
// CSS blur() on big moving layers renders with hard rectangular edges in Chrome and makes the page slow.
export default function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[760px] w-[760px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(176,141,87,0.16) 0%, rgba(176,141,87,0.07) 40%, rgba(176,141,87,0) 70%)' }} />
      <div className="absolute right-[-10%] top-[8%] h-[620px] w-[620px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(176,141,87,0.12) 0%, rgba(176,141,87,0.05) 45%, rgba(176,141,87,0) 70%)' }} />
      <div className="absolute bottom-[-20%] left-[15%] h-[640px] w-[640px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(176,141,87,0.09) 0%, rgba(176,141,87,0) 70%)' }} />
    </div>
  );
}
