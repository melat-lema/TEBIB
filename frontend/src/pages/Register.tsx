import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import img from '../assets/Logo.png'; 
import { FaGoogle } from "react-icons/fa";
import { toast } from 'react-toastify';

const translations = {
  en: {
    title: "Join Tebib Today",
    subtitle: "Create your account to get started",
    fullName: "Full Name",
    fullNamePlaceholder: "John Doe",
    email: "Email Address",
    emailPlaceholder: "john@example.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "••••••••",
    createAccount: "Create Account",
    or: "or",
    continueWithGoogle: "Continue with Google",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
    registerSuccess: "Account created successfully! Redirecting...",
    passwordMismatch: "Passwords do not match",
  },
  am: {
    title: "ዛሬ ጠቢብን ይቀላቀሉ",
    subtitle: "ለመጀመር መለያዎን ይፍጠሩ",
    fullName: "ሙሉ ስም",
    fullNamePlaceholder: "Abebe Kebede",
    email: "ኢሜይል አድራሻ",
    emailPlaceholder: "abebe@example.com",
    password: "የይለፍ ቃል",
    passwordPlaceholder: "••••••••",
    confirmPassword: "የይለፍ ቃል ያረጋግጡ",
    confirmPasswordPlaceholder: "••••••••",
    createAccount: "መለያ ይፍጠሩ",
    or: "ወይም",
    continueWithGoogle: "በጉግል ይቀጥሉ",
    alreadyHaveAccount: "መለያ አለዎት?",
    signIn: "ይግቡ",
    registerSuccess: "መለያ በተሳካ ሁኔታ ተፈጥሯል! እየተመራ ነው...",
    passwordMismatch: "የይለፍ ቃሎች አይዛመዱም",
  }
};

export default function Register() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      toast.error(t.passwordMismatch);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success(t.registerSuccess);
      setTimeout(()=>{
        navigate("/dahsboard")
      }, 1500);
    }
  };

  const inputClass = "block w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b08d57] focus:border-transparent transition-all duration-200 text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5] relative overflow-hidden">
      
      {/* Language Toggle (Top Right) */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 right-6 flex space-x-1 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 z-20"
      >
        <button 
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            lang === 'en' ? 'bg-[#b08d57] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🇬🇧 EN
        </button>
        <button 
          onClick={() => setLang('am')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            lang === 'am' ? 'bg-[#b08d57] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🇪🇹 AM
        </button>
      </motion.div>

      {/* Main Form Card - COMPACTED PADDING */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md relative z-10"
      >
        {/* COMPACTED HEADER */}
        <div className="flex flex-col items-center justify-center mb-5">
          <img src={img} alt="Tebib Logo" className="w-18 h-10 mb-2 object-contain" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">{t.title}</h2>
          <p className="text-gray-500 text-xs mt-1 text-center">{t.subtitle}</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* COMPACTED FORM SPACING (space-y-4) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 mb-1">{t.fullName}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder={t.fullNamePlaceholder}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">{t.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={t.emailPlaceholder}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />       
              <input
                type="password"
                id="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={t.passwordPlaceholder}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1">{t.confirmPassword}</label>   
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                id="confirmPassword"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder={t.confirmPasswordPlaceholder}
              />
            </div>  
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#b08d57] text-white font-semibold rounded-lg hover:bg-[#8c6b42] transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
          >
            {loading ? 'Creating Account...' : t.createAccount}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          {/* Divider */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="mx-3 text-xs text-gray-400 font-medium">{t.or}</span>
            <hr className="flex-grow border-t border-gray-200" />
          </div>

          {/* Google Button */}
          <button
            type="button"   
            className="w-full py-2.5 px-4 bg-white text-gray-700 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm"
          >
            <FaGoogle className="w-4 h-4 text-red-500" />
            {t.continueWithGoogle}
          </button>

          {/* Login Link */}
          <p className="mt-4 text-center text-xs text-gray-600">
            {t.alreadyHaveAccount}{' '}
            <Link to="/login" className="text-[#b08d57] font-semibold hover:text-[#8c6b42] transition-colors duration-200">
              {t.signIn}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}