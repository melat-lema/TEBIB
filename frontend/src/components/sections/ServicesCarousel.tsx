// frontend/src/components/sections/ServicesCarousel.tsx
import { motion } from 'framer-motion';
import { FileText, Shield, Building, Car, UserCheck, Award } from 'lucide-react';

const services = [
  { icon: FileText, name: 'Passport Services', nameAm: 'ስፖርት', category: 'Immigration' },
  { icon: Shield, name: 'Kebele ID', nameAm: 'የቀበሌ መታወቂያ', category: 'Civil Registration' },
  { icon: Building, name: 'Business License', nameAm: 'የንግድ ፈቃድ', category: 'Business' },
  { icon: Car, name: 'Driving License', nameAm: 'የመን ፈቃድ', category: 'Transport' },
  { icon: UserCheck, name: 'Birth Certificate', nameAm: 'የልደት ምስር', category: 'Civil Registration' },
  { icon: Award, name: 'Trade License', nameAm: 'የንግድ ቃድ', category: 'Business' },
];

const ServicesCarousel = () => {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <h2 className="text-4xl font-bold text-center text-gray-900">
          Our Services
        </h2>
        <p className="text-gray-600 text-center mt-4">
          Comprehensive government services at your fingertips
        </p>
      </div>

      {/* Infinite Scroll Container */}
      <div className="relative">
        <motion.div
          className="flex gap-8"
          animate={{ x: [0, -1000] }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            duration: 20,
            ease: "linear"
          }}
        >
          {/* Double the services for seamless loop */}
          {[...services, ...services, ...services].map((service, index) => (
            <motion.div
              key={index}
              className="flex-shrink-0 w-80 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-2xl p-8 hover:border-[#b08d57] hover:shadow-xl transition-all duration-300 cursor-pointer group"
              whileHover={{ y: -10 }}
            >
              <div className="bg-[#b08d57]/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#b08d57] transition-colors duration-300">
                <service.icon className="w-8 h-8 text-[#b08d57] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-gray-600 mb-4">{service.nameAm}</p>
              <span className="text-sm text-[#b08d57] font-medium">{service.category}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesCarousel;