import Hero from "../components/hero/Hero";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import CTASection from "../components/sections/CTASection";
import HowItWorks from "../components/sections/HowItWorks";
import ServicesCarousel from "../components/sections/ServicesCarousel";
import WhyChooseUs from "../components/sections/WhyChooseUs";

 export default function LandingPage(){
    return(
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar/>
           < Hero/>
           <ServicesCarousel/>
           <WhyChooseUs/>
           <HowItWorks/>
           <CTASection/>
           <Footer />
        </div>
    )
}