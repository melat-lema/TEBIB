import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ShieldCheck, FileSearch, UserCheck, Rocket, Languages, HelpCircle } from 'lucide-react';
import '../../styles/landing.css';
import Reveal from '../ui/Reveal';

const demo = {
  en: { q: 'How much is a new passport?', a: 'A new or renewed passport costs 5,000 ETB. Confirm with ICS before you go.', tag: 'EN' },
  am: { q: 'አዲስ ፓስፖርት ስንት ነው?', a: 'አዲስ ወይም የታደሰ ፓስፖርት 5,000 ብር ነው። ከመሄድዎ በፊት ከICS ያረጋግጡ።', tag: 'አማ' },
};

function useTyped(text: string, active: boolean, speed = 22) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!active) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setN(text.length);
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return text.slice(0, n);
}

function ChatDemo({ active }: { active: boolean }) {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setLang((l) => (l === 'en' ? 'am' : 'en')), 7000);
    return () => clearInterval(id);
  }, [active]);

  const d = demo[lang];
  const answer = useTyped(d.a, active);
  const done = answer.length === d.a.length;

  return (
    <div className="relative mt-8 space-y-3">
      <AnimatePresence mode="wait">
        <motion.div key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-3">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#b08d57] px-4 py-2.5 text-sm font-medium text-white">
            <span className="font-ethiopic">{d.q}</span>
          </div>
          <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-white/10 px-4 py-3 text-sm leading-relaxed text-gray-100">
            <span className={`font-ethiopic ${done ? '' : 'tb-caret'}`}>{answer}</span>
            {done && (
              <span className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#e6cfa0]">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified fact · reviewed by an admin
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute -top-[4.6rem] right-0 flex rounded-full border border-white/15 bg-white/5 p-1 text-xs font-semibold">
        {(['en', 'am'] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 transition-colors ${lang === l ? 'bg-[#b08d57] text-white' : 'text-gray-400 hover:text-white'}`}>
            {demo[l].tag}
          </button>
        ))}
      </div>
    </div>
  );
}

const pipeline = [
  { Icon: FileSearch, title: 'Collected from official sources', text: 'Government websites and announcement channels are checked on a schedule.' },
  { Icon: UserCheck, title: 'Reviewed by a person', text: 'Every extracted fact is compared with its source quote before it is approved.' },
  { Icon: Rocket, title: 'Published to you', text: 'Only approved facts appear on service pages and in chat answers.' },
];

function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 55%'] });
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div ref={ref} className="relative mt-8 pl-12">
      <div className="absolute bottom-2 left-[1.15rem] top-2 w-0.5 rounded bg-gray-200" />
      <motion.div style={{ height }} className="absolute left-[1.15rem] top-2 w-0.5 rounded bg-[#b08d57]" />
      <ul className="space-y-8">
        {pipeline.map(({ Icon, title, text }, i) => (
          <li key={title} className="relative">
            <span className="absolute -left-12 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#b08d57] bg-white text-[#b08d57]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
            {i === 1 && <span className="mt-2 inline-block rounded-full bg-[#b08d57]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#8c6b42]">Fees and requirements are never auto-published</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Counter({ to, label }: { to: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setV(to);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <div ref={ref}>
      <div className="text-5xl font-semibold tracking-tight text-gray-900">{v}</div>
      <div className="mt-1 text-sm font-medium text-gray-500">{label}</div>
    </div>
  );
}


const item = {
  hidden: (dir: 'left' | 'right') => ({ opacity: 0, x: dir === 'left' ? -110 : 110 }),
  show: { opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function WhyChooseUs() {
  const section = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatActive = useInView(chatRef, { margin: '-15%' });

  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['6%', '-28%']);

  return (
    <section id="why" ref={section} className="relative overflow-hidden bg-[#faf7f1] py-24">
      <div className="tb-dots pointer-events-none absolute inset-0 opacity-60" />
      <motion.div
        aria-hidden
        style={{ x }}
        className="font-ethiopic pointer-events-none absolute -top-6 left-0 select-none whitespace-nowrap text-[15rem] font-bold leading-none text-transparent [-webkit-text-stroke:2px_rgba(176,141,87,0.22)]"
      >
        ጠቢብ ጠቢብ ጠቢብ
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal from="left" className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Built so you can trust the number you read.</h2>
          <p className="mt-3 text-base text-gray-600">Government information changes. Tebib shows where each answer came from and when it was last confirmed.</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* A: bilingual chat (dark) */}
          <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom="left" ref={chatRef} className="relative overflow-hidden rounded-[2rem] bg-[#1d1a16] p-8 text-white lg:col-span-7 lg:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(176,141,87,0.28) 0%, rgba(176,141,87,0) 70%)' }} />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b08d57]/20 text-[#e6cfa0]">
                <Languages className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">Ask in Amharic or English</h3>
              <p className="mt-2 max-w-md text-sm text-gray-400">Same question, same verified answer, in the language you think in.</p>
              <ChatDemo active={chatActive} />
            </div>
          </motion.div>

      
          <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom="right" className="rounded-[2rem] border border-gray-200 bg-white p-8 lg:col-span-5 lg:p-10">
            <h3 className="text-xl font-semibold text-gray-900">Every answer has a trail</h3>
            <p className="mt-2 text-sm text-gray-500">How a fact reaches you.</p>
            <Pipeline />
          </motion.div>

       
          <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom="left" className="rounded-[2rem] border border-gray-200 bg-white p-8 lg:col-span-5 lg:p-10">
            <div className="grid grid-cols-2 gap-6">
              <Counter to={5} label="core services covered" />
              <Counter to={2} label="languages, switch anytime" />
            </div>
            <p className="mt-8 border-t border-gray-100 pt-5 text-sm leading-relaxed text-gray-600">
              Each service page shows a <span className="font-semibold text-gray-900">Last verified</span> date, so you know how fresh the information is.
            </p>
          </motion.div>

   
          <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom="right" className="relative overflow-hidden rounded-[2rem] border border-[#b08d57]/30 bg-gradient-to-br from-[#b08d57] to-[#8c6b42] p-8 text-white lg:col-span-7 lg:p-10">
            <HelpCircle className="absolute -bottom-6 -right-4 h-44 w-44 text-white/10" strokeWidth={1.2} />
            <div className="relative max-w-lg">
              <h3 className="text-xl font-semibold">It says so when it doesn't know</h3>
              <p className="mt-2 text-sm text-white/80">If nothing verified matches your question, Tebib tells you and points you to the right office, instead of guessing.</p>
              <div className="mt-6 w-fit max-w-full rounded-2xl rounded-bl-md bg-white/15 px-4 py-3 text-sm leading-relaxed backdrop-blur">
                I don't have verified information about that. Please check directly with the relevant government office.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
