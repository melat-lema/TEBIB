import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import img from '../assets/Logo.png'; 
import { FaGoogle } from "react-icons/fa";
import {toast } from 'react-toastify'; 

const translation={
    en:{
        title: "Welcome Back",
    subtitle: "Sign in to your account to continue",
    email: "Email Address",
    emailPlaceholder: "john@example.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Sign In",
    or: "or",
    continueWithGoogle: "Continue with Google",
    noAccount: "Don't have an account?",
    createAccount: "Create one",
    loginSuccess: "Welcome back! Redirecting to dashboard...",
    invalidCredentials: "Invalid email or password. Please try again.",
    },
    am:{
        title: "እንኳን ደህና መጡ",
    subtitle: "ለመቀጠል ወደ መለያዎ ይግቡ",
    email: "ኢሜይል አድራሻ",
    emailPlaceholder: "abebe@example.com",
    password: "የይለፍ ቃል",
    passwordPlaceholder: "••••••••",
    signIn: "ይቡ",
    or: "ወይም",
    continueWithGoogle: "በጉግል ይቀጥሉ",
    noAccount: "መለያ የለዎትም?",
    createAccount: "ይመዝገቡ",
    loginSuccess: "እንኳን ደህና መጡ! ወደ ዳሽቦርድ እየተመራ ነው...",
    invalidCredentials: "ኢሜይል ይም የይለፍ ቃል ስህተት ነው እባክዎ እንደገና ይክሩ።",
    }
}

export default function Login(){

    const [lang, setLang]=useState< 'en'| 'am'>('en');
    const t=translation[lang];

    const [email, setEmail]=useState("");
        const [password, setPassword]= useState("");
        const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();


  const handleSubmit= async(e: React.FormEvent)=>{
    e.preventDefault();
    setLoading(true);
    setError('');

    const {error}= await supabase.auth.signInWithPassword({
        email,
        password,
    })
    if(error){
        setError(t.invalidCredentials);
     toast.error(t.invalidCredentials);
        setLoading(false);

    }
    else{
        toast.success(t.loginSuccess);
        setTimeout(()=>{
            navigate("/dashboard")
        }, 1500)
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

      {/* Main Form Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-5">
          {/* Note: Changed w-18 to h-10 w-auto to prevent logo distortion */}
          <img src={img} alt="Tebib Logo" className="h-10 w-auto mb-2 object-contain" />
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
            {loading ? 'Signing In...' : t.signIn}
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

          {/* Register Link */}
          <p className="mt-4 text-center text-xs text-gray-600">
            {t.noAccount}{' '}
            <Link to="/register" className="text-[#b08d57] font-semibold hover:text-[#8c6b42] transition-colors duration-200">
              {t.createAccount}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}