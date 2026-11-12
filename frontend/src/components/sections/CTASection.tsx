// src/components/sections/CTASection.tsx
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTASection = () => (
  <section className="bg-gradient-to-br from-gray-50 via-white to-gray-100 py-24">
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="rounded-3xl bg-gradient-to-br from-[#b08d57] to-[#8c6b42] p-10 text-center text-white shadow-2xl md:p-16"
      >
        <h2 className="mb-5 text-3xl font-semibold md:text-4xl">Stop guessing what the office will ask for.</h2>
        <p className="mx-auto mb-9 max-w-2xl text-base opacity-90 md:text-lg">
          Ask Tebib about passports, IDs, licenses and certificates, in Amharic or English, and get answers that were reviewed before they were published.
        </p>

        <Link to="/register">
          <motion.span
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#8c6b42] shadow-lg transition-shadow hover:shadow-xl"
          >
            Create a free account
            <ArrowRight className="h-6 w-6" />
          </motion.span>
        </Link>

        <p className="mt-6 text-sm opacity-80">Free to get started. No credit card needed.</p>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
