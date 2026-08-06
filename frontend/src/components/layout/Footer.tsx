import { FaXTwitter } from "react-icons/fa6";
import { FaFacebookF } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa6";
import { FaLinkedinIn } from "react-icons/fa6";
import { motion } from "framer-motion";
import img from "../../assets/logo.png";
const Footer = () => {
  return (
    <footer className="bg-[#f4f4f5] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* Top */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Logo */}
          <div className="flex flex-col items-center md:items-start">

            <img
              src={img}
              alt="ጠቢብ Logo"
              className="h-14 w-auto object-contain"
            />

            <p className="mt-4 text-gray-600 text-sm max-w-sm text-center md:text-left">
              Your intelligent guide to Ethiopian government services.
              Fast, reliable, and available in both Amharic and English.
            </p>

          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-8">

            {["About", "Privacy", "Contact"].map((item) => (
              <motion.a
                key={item}
                href="#"
                whileHover={{ y: -2 }}
                className="relative text-gray-700 font-medium group"
              >
                {item}

                <span
                  className="
                  absolute
                  left-0
                  -bottom-1
                  h-[2px]
                  w-0
                  bg-[#b08d57]
                  transition-all
                  duration-300
                  group-hover:w-full
                "
                />
              </motion.a>
            ))}

          </div>

          {/* Social Icons */}
          <div className="flex gap-5">

            {[
              FaInstagram,
              FaFacebookF,
              FaXTwitter,
              FaLinkedinIn
            ].map((Icon, index) => (
              <motion.a
                key={index}
                href="#"
                whileHover={{
                  y: -4,
                  scale: 1.15,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                className="text-gray-600 hover:text-[#b08d57]"
              >
                <Icon size={22} />
              </motion.a>
            ))}

          </div>

        </div>

        {/* Bottom */}

        <div className="mt-10 border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center">

          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ጠቢብ. All rights reserved.
          </p>

          <p className="text-sm text-gray-500 mt-3 md:mt-0">
            Made with ❤️ in Ethiopia
          </p>

        </div>

      </div>
    </footer>
  );
};

export default Footer;