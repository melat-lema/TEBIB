// src/pages/AdminLogin.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import img from '../assets/Logo.png'; 
import { toast } from 'react-toastify'; 

const translation = {
  en: {
    title: "Admin Portal",
    subtitle: "Sign in to manage the knowledge base and monitor scrapers",
    email: "Admin Email Address",
    emailPlaceholder: "admin@example.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Access Dashboard",
    loginSuccess: "Welcome back, Admin! Redirecting...",
    invalidCredentials: "Invalid email or password. Please try again.",
    accessDenied: "Access denied: Admin privileges required.",
    backToHome: "← Back to Tebib Home"
  },
  am: {
    title: "የአድሚን መግቢያ",
    subtitle: "እውቀትን ለማስተዳደር እና ስክራፐሮችን ለመከታተል ይግቡ",
    email: "የአድሚን ኢሜይል",
    emailPlaceholder: "admin@example.com",
    password: "የይለፍ ቃል",
    passwordPlaceholder: "••••••••",
    signIn: "ወደ ዳሽቦርድ ይግቡ",
    loginSuccess: "እንኳን ደህና መጡ! ወደ ዳሽቦርድ እየተመራ ነው...",
    invalidCredentials: "ኢሜይል ወይም የይለፍ ቃል ስህተት ነው። እባክዎ እንደገና ይሞክሩ።",
    accessDenied: "መብት የለዎትም፡ የአድሚን ፈቃድ ያስፈልጋል።",
    backToHome: "← ወደ ተቢብ መነሻ ገጽ"
  }
};

export default function AdminLogin() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translation[lang];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(t.invalidCredentials);
      toast.error(t.invalidCredentials);
      setLoading(false);
      return;
    }

    // 2. Check if the user has the 'admin' role in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      setError(t.accessDenied);
      toast.error(t.accessDenied);
      await supabase.auth.signOut(); // Kick them out immediately
      setLoading(false);
      return;
    }

    // 3. Success! Redirect to admin dashboard
    toast.success(t.loginSuccess);
    setTimeout(() => {
      navigate("/admin/dashboard");
    }, 1500);
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

      {/* Main Form Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="bg-[#b08d57]/10 p-3 rounded-full mb-3">
            <Shield className="w-8 h-8 text-[#b08d57]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">{t.title}</h2>
          <p className="text-gray-500 text-xs mt-1 text-center max-w-[250px]">{t.subtitle}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={t.passwordPlaceholder}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#b08d57] text-white font-semibold rounded-lg hover:bg-[#8c6b42] transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
          >
            {loading ? 'Accessing...' : t.signIn}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          {/* Back to Home Link (No register/Google for admins) */}
          <div className="pt-4 text-center">
            <Link to="/" className="text-xs font-medium text-gray-500 hover:text-[#b08d57] transition-colors duration-200 flex items-center justify-center gap-1">
              {t.backToHome}
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}