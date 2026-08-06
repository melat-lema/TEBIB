import {useState} from 'react';
import { FiChevronDown } from "react-icons/fi";
import img from '../../assets/logo.png';

import { Menu, X } from "lucide-react";
import { Bot, FileText, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const Navbar=()=>{
    const [isFeaturesHovered, setIsFeaturesHovered] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    return(
       <motion.nav
    initial={{
        y: -80,
        opacity: 0
    }}
    animate={{
        y: 0,
        opacity: 1
    }}
    transition={{
        duration: 0.6,
        ease: "easeOut"
    }}
    className="bg-[#f4f4f5] border-b border-gray-200 sticky top-0 z-50"
>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-3">
                        <motion.img
    src={img}
    alt="ጠቢብ Logo"
    className="h-20 w-auto object-contain"
    whileHover={{
        scale: 1.05,
        
    }}
    transition={{
        type: "spring",
        stiffness: 300
    }}
/>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <div
                        className="relative"
                        onMouseEnter={()=> setIsFeaturesHovered(true)}
                        onMouseLeave={()=> setIsFeaturesHovered(false)}
                        >
                            <button className="text-gray-700 hover:text-black font-medium flex items-center space-x-1 transition-colors">
                                <span>Features</span>
                                <FiChevronDown  className={`w-4 h-4 transition-transform ${isFeaturesHovered? "rotate-180" : ""}`} />
                            </button>

                             <AnimatePresence>
  {isFeaturesHovered && (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 border border-gray-100"
    >
      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#b08d57]">
        Services
      </a>

      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#b08d57]">
        How It Works
      </a>

      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#b08d57]">
        Pricing
      </a>

      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#b08d57]">
        Premium Tools
      </a>
    </motion.div>
  )}
</AnimatePresence>
                        </div>
                     <motion.a
    href="/login"
    whileHover={{
        y: -2,
        color: "#b08d57"
    }}
    transition={{
        duration: 0.2
    }}
    className="font-medium text-gray-700"
>
    Sign In
</motion.a>   
          
            <motion.a
    href="/register"
    whileHover={{
        scale: 1.05
    }}
    whileTap={{
        scale: 0.96
    }}
    className="bg-[#b08d57] text-white px-5 py-2.5 rounded-md font-medium shadow-sm"
>
    Get Started for Free
</motion.a>

                    </div>
                    <div className="md:hidden flex items-center">
  <button
    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    className="text-gray-700 hover:text-black focus:outline-none p-2"
    aria-label="Toggle menu"
  >
    <motion.div
    key={isMobileMenuOpen ? "close" : "open"}
    initial={{ rotate: -90, opacity: 0 }}
    animate={{ rotate: 0, opacity: 1 }}
    exit={{ rotate: 90, opacity: 0 }}
    transition={{ duration: 0.2 }}
>
    {isMobileMenuOpen ? (
        <X className="w-6 h-6" />
    ) : (
        <Menu className="w-6 h-6" />
    )}
</motion.div>
  </button>
</div>
                </div>
            </div>
{/* MOBILE MENU DROPDOWN */}
<AnimatePresence>
  {isMobileMenuOpen && (
    <motion.div
      initial={{
        opacity: 0,
        height: 0
      }}
      animate={{
        opacity: 1,
        height: "auto"
      }}
      exit={{
        opacity: 0,
        height: 0
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
      className="overflow-hidden md:hidden bg-[#f4f4f5] border-b border-gray-200 shadow-lg"
    >
         <div className="px-4 py-5 space-y-5">

      {/* Services */}
      <div>
        <span className="block text-gray-900 font-semibold mb-3">
          Services
        </span>

        <div className="ml-2 space-y-3 border-l-2 border-[#b08d57] pl-4">

         <motion.a
  href="#"
  whileHover={{
    x: 8,
    color: "#b08d57"
  }}
  transition={{ duration: 0.2 }}
  className="flex items-center gap-2 text-sm text-gray-600"
>
            <Bot className="w-4 h-4" />
           Services
            </motion.a>

          <motion.a
  href="#"
  whileHover={{
    x: 8,
    color: "#b08d57"
  }}
  transition={{ duration: 0.2 }}
  className="flex items-center gap-2 text-sm text-gray-600"
>
            <FileText className="w-4 h-4" />
            How it works
            </motion.a>

          <motion.a
  href="#"
  whileHover={{
    x: 8,
    color: "#b08d57"
  }}
  transition={{ duration: 0.2 }}
  className="flex items-center gap-2 text-sm text-gray-600"
>
            <Search className="w-4 h-4" />
            Pricing
            </motion.a>

          <motion.a
  href="#"
  whileHover={{
    x: 8,
    color: "#b08d57"
  }}
  transition={{ duration: 0.2 }}
  className="flex items-center gap-2 text-sm text-gray-600"
>
            <Sparkles className="w-4 h-4" />
            Premium Tools
            </motion.a>

        </div>
      </div>


      {/* Sign In */}
     <motion.a
  href="/login"
  whileHover={{
    x: 8,
    color: "#b08d57"
  }}
  transition={{ duration: 0.2 }}
  className="flex items-center gap-2 text-sm text-gray-600"
>
        Sign In
        </motion.a>


      {/* Get Started Button */}
      <motion.a
  href="/register"
  whileHover={{
    x: 8,
    color: "#b08d57"
  }}
  transition={{ duration: 0.2 }}
  className="flex items-center gap-2 text-sm text-gray-600"
>
        Get Started for Free
        </motion.a>

    </div>
 </motion.div>
  )}
</AnimatePresence>
        </motion.nav>
    )
}

export default Navbar;