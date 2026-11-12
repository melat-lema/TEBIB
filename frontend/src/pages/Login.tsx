import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import img from '../assets/Logo.png';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import GoogleButton from '../components/auth/GoogleButton';

const translation = {
  en: {
    title: 'Welcome Back',
    subtitle: 'Sign in to your account to continue',
    email: 'Email Address',
    emailPlaceholder: 'john@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign In',
    signingIn: 'Signing In...',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    googleFailed: 'Google sign-in could not start. Please try again.',
    noAccount: "Don't have an account?",
    createAccount: 'Create one',
    loginSuccess: 'Welcome back! Redirecting to dashboard...',
    invalidCredentials: 'Invalid email or password. Please try again.',
  },
  am: {
    title: 'እንኳን ደህና መጡ',
    subtitle: 'ለመቀጠል ወደ መለያዎ ይግቡ',
    email: 'ኢሜይል አድራሻ',
    emailPlaceholder: 'abebe@example.com',
    password: 'የይለፍ ቃል',
    passwordPlaceholder: '••••••••',
    signIn: 'ይግቡ',
    signingIn: 'በመግባት ላይ...',
    or: 'ወይም',
    continueWithGoogle: 'በጉግል ይቀጥሉ',
    googleFailed: 'በጉግል መግባት አልተጀመረም። እባክዎ እንደገና ይሞክሩ።',
    noAccount: 'መለያ የለዎትም?',
    createAccount: 'ይመዝገቡ',
    loginSuccess: 'እንኳን ደህና መጡ! ወደ ዳሽቦርድ እየተመራ ነው...',
    invalidCredentials: 'ኢሜይል ወይም የይለፍ ቃል ስህተት ነው። እባክዎ እንደገና ይሞክሩ።',
  },
};

export default function Login() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translation[lang];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Already signed in (or just back from Google): go straight to the dashboard
  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(t.invalidCredentials);
      toast.error(t.invalidCredentials);
      setLoading(false);
    } else {
      toast.success(t.loginSuccess);
      setTimeout(() => navigate('/dashboard'), 800);
    }
  };

  const inputClass =
    'block w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b08d57] focus:border-transparent transition-all duration-200 text-sm';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f4f5]">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute right-6 top-6 z-20 flex space-x-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {(['en', 'am'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${lang === l ? 'bg-[#b08d57] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {l === 'en' ? '🇬🇧 EN' : '🇪🇹 AM'}
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-5 flex flex-col items-center justify-center">
          <img src={img} alt="Tebib Logo" className="mb-2 h-10 w-auto object-contain" />
          <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">{t.title}</h2>
          <p className="mt-1 text-center text-xs text-gray-500">{t.subtitle}</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs text-red-600">
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-gray-700">{t.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder={t.emailPlaceholder} />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-gray-700">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="password" id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder={t.passwordPlaceholder} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b08d57] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#8c6b42] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t.signingIn : t.signIn}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="my-4 flex items-center">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="mx-3 text-xs font-medium text-gray-400">{t.or}</span>
            <hr className="flex-grow border-t border-gray-200" />
          </div>

          <GoogleButton label={t.continueWithGoogle} failedMessage={t.googleFailed} />

          <p className="mt-4 text-center text-xs text-gray-600">
            {t.noAccount}{' '}
            <Link to="/register" className="font-semibold text-[#b08d57] transition-colors duration-200 hover:text-[#8c6b42]">
              {t.createAccount}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
