// frontend/src/components/sections/HowItWorks.tsx
import { motion } from 'framer-motion';
import { Search, MessageCircle, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Find What You Need',
    description: 'Browse our comprehensive catalog of government services or use our smart search to find exactly what you\'re looking for.'
  },
  {
    icon: MessageCircle,
    number: '02',
    title: 'Ask the AI',
    description: 'Chat with our AI assistant to ask specific questions about requirements, procedures, fees, and processing times.'
  },
  {
    icon: CheckCircle,
    number: '03',
    title: 'Get Actionable Steps',
    description: 'Receive clear, step-by-step instructions to complete your government service request successfully.'
  }
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Simplifying government services in three easy steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-[#b08d57] to-transparent" />
              )}
              
              <div className="text-center">
                <div className="relative inline-block mb-8">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#b08d57] to-[#8c6b42] flex items-center justify-center mx-auto">
                    <step.icon className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <span className="text-[#b08d57] font-bold text-sm">{step.number}</span>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;