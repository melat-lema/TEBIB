// src/components/hero/HeroStats.tsx
interface Stat {
  value: string;
  label: string;
}

export default function HeroStats() {
  const stats: Stat[] = [
    { value: '15+', label: 'Government Services' },
    { value: '24/7', label: 'AI Assistant' },
    { value: '2', label: 'Languages Supported' },
  ];

  return (
    <div className="flex flex-wrap justify-center lg:justify-start gap-8 sm:gap-12">
      {stats.map((stat, index) => (
        <div key={index} className="text-center lg:text-left">
          <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-500 font-medium mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}