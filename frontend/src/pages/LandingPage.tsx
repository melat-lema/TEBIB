import Hero from '../components/hero/Hero';
import Footer from '../components/layout/Footer';
import Navbar from '../components/layout/Navbar';
import CTASection from '../components/sections/CTASection';
import HowItWorks from '../components/sections/HowItWorks';
import ServicesCarousel from '../components/sections/ServicesCarousel';
import WhyChooseUs from '../components/sections/WhyChooseUs';
import ScrollProgress from '../components/ui/ScrollProgress';
import '../styles/landing.css';

export default function LandingPage() {
  return (
    <div className="tb-font flex min-h-screen flex-col bg-white" style={{ overflowX: 'clip' }}>
      <ScrollProgress />
      <Navbar />
      <Hero />
      <ServicesCarousel />
      <WhyChooseUs />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  );
}
