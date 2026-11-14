import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import { Menu, X, Bot, FileText, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import img from '../../assets/logo.png';

const links = [
  { href: '#services', label: 'Services', Icon: Bot },
  { href: '#why', label: 'Why Tebib', Icon: Sparkles },
  { href: '#how', label: 'How it works', Icon: FileText },
  { href: '/register', label: 'Premium tools', Icon: Search },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  // No slide-in animation on the bar itself: it is simply there from the first frame.
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-[#f4f4f5]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            {/* multiply makes the logo's off-white background vanish into the bar */}
            <img src={img} alt="ጠቢብ Logo" className="h-12 w-auto object-contain " />
          </Link>

          <div className="hidden items-center space-x-8 md:flex">
            <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
              <button className="flex items-center space-x-1 font-medium text-gray-700 transition-colors hover:text-black">
                <span>Features</span>
                <FiChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-0 mt-2 w-56 rounded-lg border border-gray-100 bg-white py-2 shadow-xl"
                  >
                    {links.map((l) => (
                      <a key={l.label} href={l.href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#b08d57]">{l.label}</a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/login" className="font-medium text-gray-700 transition-colors hover:text-[#b08d57]">Sign In</Link>
            <Link to="/register" className="rounded-md bg-[#b08d57] px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#8c6b42]">Get Started for Free</Link>
          </div>

          <button onClick={() => setMobile(!mobile)} className="p-2 text-gray-700 hover:text-black md:hidden" aria-label="Toggle menu">
            {mobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-b border-gray-200 bg-[#f4f4f5] shadow-lg md:hidden">
            <div className="space-y-4 px-4 py-5">
              <div className="ml-1 space-y-3 border-l-2 border-[#b08d57] pl-4">
                {links.map(({ href, label, Icon }) => (
                  <a key={label} href={href} onClick={() => setMobile(false)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#b08d57]"><Icon className="h-4 w-4" />{label}</a>
                ))}
              </div>
              <Link to="/login" className="block text-sm text-gray-700">Sign In</Link>
              <Link to="/register" className="block rounded-md bg-[#b08d57] px-4 py-2.5 text-center text-sm font-medium text-white">Get Started for Free</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
