// src/components/sections/ServicesCarousel.tsx
import { Link } from 'react-router-dom';
import { Plane, Fingerprint, Store, Car, Baby, ArrowUpRight } from 'lucide-react';
import '../../styles/landing.css';
import Reveal from '../ui/Reveal';

const services = [
  { Icon: Plane, name: 'Passport', am: 'ፓስፖርት', glyph: 'ፓ', covers: 'New, renewal, urgent and lost passports', tags: ['Fees', 'Documents', 'Online portal'] },
  { Icon: Fingerprint, name: 'Kebele ID', am: 'የቀበሌ መታወቂያ', glyph: 'ቀ', covers: 'Local ID and the new digital ID (Fayda)', tags: ['Requirements', 'Fayda'] },
  { Icon: Store, name: 'Business License', am: 'የንግድ ፈቃድ', glyph: 'ን', covers: 'Registering and licensing a business', tags: ['e-Trade', 'Renewal'] },
  { Icon: Car, name: 'Driving License', am: 'የመንጃ ፈቃድ', glyph: 'መ', covers: 'Tests, medical check and fees', tags: ['Tests', 'Fees'] },
  { Icon: Baby, name: 'Birth Certificate', am: 'የልደት ምስክር ወረቀት', glyph: 'ል', covers: 'Registering a birth and getting a certificate', tags: ['Deadlines', 'Documents'] },
];

function ServiceCard({ s }: { s: (typeof services)[number] }) {
  return (
    <Link
      to="/register"
      className="tb-service-card group relative block h-[16.5rem] w-[17.5rem] overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white p-6 outline-none transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#b08d57]/15 focus-visible:-translate-y-2"
    >
      {/* the first Ge'ez letter of the service name, as a watermark */}
      <span
        aria-hidden
        className="font-ethiopic pointer-events-none absolute -bottom-10 -right-3 select-none text-[8.5rem] font-bold leading-none text-[#b08d57]/10 transition-all duration-500 group-hover:-translate-y-2 group-hover:text-[#b08d57]/20"
      >
        {s.glyph}
      </span>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-[#e6cfa0] transition-colors duration-500 group-hover:bg-[#b08d57] group-hover:text-white">
            <s.Icon className="h-6 w-6" strokeWidth={1.7} />
          </span>
          <ArrowUpRight className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#b08d57]" />
        </div>

        <h3 className="mt-5 text-lg font-semibold tracking-tight text-gray-900">{s.name}</h3>
        <p className="font-ethiopic mt-0.5 text-sm font-medium text-[#b08d57]">{s.am}</p>
        <p className="mt-2.5 max-w-[14rem] text-[13px] leading-relaxed text-gray-500">{s.covers}</p>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {s.tags.map((t) => (
            <span key={t} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

const ServicesCarousel = () => (
  <section id="services" className="overflow-hidden bg-white py-24">
    <Reveal from="left" className="mx-auto mb-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Five services, answered properly.</h2>
      <p className="mt-3 max-w-lg text-base text-gray-600">Pick one to see its fees, documents and steps. Hover the row to stop it.</p>
    </Reveal>

    <Reveal from="right" distance={160} amount={0.1}>
      <div className="tb-marquee-wrap py-4">
        <div className="tb-marquee">
          {[...services, ...services, ...services, ...services].map((s, i) => (
            <ServiceCard key={i} s={s} />
          ))}
        </div>
      </div>
    </Reveal>
  </section>
);

export default ServicesCarousel;
