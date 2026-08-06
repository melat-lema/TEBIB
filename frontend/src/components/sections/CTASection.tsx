// frontend/src/components/sections/CTASection.tsx
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-[#b08d57] to-[#8c6b42] rounded-3xl p-12 md:p-20 text-center text-white shadow-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to simplify government services?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join thousands of Ethiopians already navigating services with GovAI ET.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-pink-500 hover:bg-pink-600 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-3"
          >
            Get Started for Free
            <ArrowRight className="w-6 h-6" />
          </motion.button>
          
          <p className="mt-6 text-sm opacity-75">
            No credit card required • Free forever for basic features
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;