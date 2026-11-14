// src/components/sections/CTASection.tsx
// Full-width dark band (clearly different from the white "How it works" above it).
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[#1d1a16] py-24 text-white">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#b08d57]/25 blur-3xl" />
      <span aria-hidden className="font-ethiopic pointer-events-none absolute -bottom-24 right-4 select-none text-[24rem] font-bold leading-none text-white/[0.04]">ጠ</span>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stop guessing what the office will ask for.</h2>
          <p className="mt-3 text-base text-gray-300">Create a free account and ask about any of the five services, in Amharic or English.</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-start gap-3">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#b08d57] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-[#c29a60]">
            Create a free account <ArrowRight className="h-5 w-5" />
          </Link>
          <Link to="/login" className="text-sm text-gray-400 underline-offset-4 hover:text-white hover:underline">I already have an account</Link>
        </div>
      </motion.div>
    </section>
  );
}
