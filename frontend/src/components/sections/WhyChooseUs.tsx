// frontend/src/components/sections/WhyChooseUs.tsx
import { motion } from 'framer-motion';
import { Brain, Shield, Globe, Zap } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Answers',
    titleAm: 'በAI የተደገፉ መልሶች',
    description: 'Get instant, accurate responses to your government service questions in seconds.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Shield,
    title: 'Verified Information',
    titleAm: 'የተረጋገ መረጃ',
    description: 'All information is sourced from official government websites and updated regularly.',
    color: 'from-emerald-500 to-green-500'
  },
  {
    icon: Globe,
    title: 'Bilingual Support',
    titleAm: 'ድር ቋንቋ ድፍ',
    description: 'Seamlessly switch between English and Amharic for your convenience.',
    color: 'from-purple-500 to-pink-500'
  }
];

const WhyChooseUs = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Why Choose Tebib
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Making government services accessible, efficient, and stress-free for everyone
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Left Card - Tilted */}
          <motion.div
            initial={{ opacity: 0, x: -50, rotate: -6 }}
            whileInView={{ opacity: 1, x: 0, rotate: -3 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="hidden md:block"
          >
            <FeatureCard {...features[0]} />
          </motion.div>

          {/* Middle Card - Straight & Prominent */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="md:scale-110"
          >
            <FeatureCard {...features[1]} isProminent />
          </motion.div>

          {/* Right Card - Tilted */}
          <motion.div
            initial={{ opacity: 0, x: 50, rotate: 6 }}
            whileInView={{ opacity: 1, x: 0, rotate: 3 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="hidden md:block"
          >
            <FeatureCard {...features[2]} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, titleAm, description, color, isProminent = false }: any) => (
  <div className={`bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${isProminent ? 'border-[#b08d57] scale-105' : 'border-gray-100'}`}>
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{titleAm}</p>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

export default WhyChooseUs;