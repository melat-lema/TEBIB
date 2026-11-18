import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal from '../ui/Reveal';
import { Search, MessageCircle, FileCheck2 } from 'lucide-react';

const steps = [
  { Icon: Search, title: 'Find your service', text: 'Pick passport, ID, license or certificate. You see the fees, documents and steps that were verified, and the date they were last checked.' },
  { Icon: MessageCircle, title: 'Ask in your own words', text: 'Type a question in Amharic or English. The answer comes only from reviewed facts, with its source. If Tebib does not know, it says so.' },
  { Icon: FileCheck2, title: 'Walk in prepared', text: 'Get a clear checklist of what to bring and what it will cost, so one visit to the office is enough.' },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const grow = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="how" className="bg-white py-24">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <Reveal from="left" className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold text-[#b08d57]">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">From question to a prepared visit in three steps.</h2>
          <p className="mt-4 max-w-sm text-base text-gray-600">No searching through old forum posts. One place, checked by people.</p>
        </Reveal>

        <div ref={ref} className="relative pl-16">
          <div className="absolute bottom-6 left-[1.45rem] top-6 w-px bg-gray-200" />
          <motion.div style={{ height: grow }} className="absolute left-[1.45rem] top-6 w-px bg-[#b08d57]" />
          <ol className="space-y-14">
            {steps.map(({ Icon, title, text }, i) => (
              <motion.li key={title} className="relative" initial={{ opacity: 0, x: 110 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.85, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
                <span className="absolute -left-16 flex h-12 w-12 items-center justify-center rounded-full border border-[#b08d57]/50 bg-white text-[#b08d57] shadow-sm">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="font-ethiopic absolute -top-6 right-0 select-none text-7xl font-bold leading-none text-[#b08d57]/10">{`0${i + 1}`}</span>
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-gray-600">{text}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
