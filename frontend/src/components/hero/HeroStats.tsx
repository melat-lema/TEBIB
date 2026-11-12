// src/components/hero/HeroStats.tsx
const stats = [
  { value: '5', label: 'Core services' },
  { value: '24/7', label: 'AI assistant' },
  { value: '2', label: 'Languages' },
];

export default function HeroStats() {
  return (
    <div className="flex flex-wrap justify-center gap-8 sm:gap-12 lg:justify-start">
      {stats.map((s) => (
        <div key={s.label} className="text-center lg:text-left">
          <div className="text-2xl font-semibold text-gray-900">{s.value}</div>
          <div className="mt-0.5 text-xs font-medium text-gray-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
