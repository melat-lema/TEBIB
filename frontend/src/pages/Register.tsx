import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import img from '../assets/Logo.png';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import GoogleButton from '../components/auth/GoogleButton';

const translations = {
  en: {
    title: 'Join Tebib Today',
    subtitle: 'Create your account to get started',
    fullName: 'Full Name',
    fullNamePlaceholder: 'John Doe',
    email: 'Email Address',
    emailPlaceholder: 'john@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: '••••••••',
    createAccount: 'Create Account',
    creating: 'Creating Account...',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    googleFailed: 'Google sign-in could not start. Please try again.',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    registerSuccess: 'Account created successfully! Redirecting...',
    confirmEmail: 'Account created. Check your email and confirm your address, then sign in.',
    passwordMismatch: 'Passwords do not match',
    backHome: 'Back to home',
  },
  am: {
    title: 'ዛሬ ጠቢብን ይቀላቀሉ',
    subtitle: 'ለመጀመር መለያዎን ይፍጠሩ',
    fullName: 'ሙሉ ስም',
    fullNamePlaceholder: 'Abebe Kebede',
    email: 'ኢሜይል አድራሻ',
    emailPlaceholder: 'abebe@example.com',
    password: 'የይለፍ ቃል',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'የይለፍ ቃል ያረጋግጡ',
    confirmPasswordPlaceholder: '••••••••',
    createAccount: 'መለያ ይፍጠሩ',
    creating: 'መለያ በመፍጠር ላይ...',
    or: 'ወይም',
    continueWithGoogle: 'በጉግል ይቀጥሉ',
    googleFailed: 'በጉግል መግባት አልተጀመረም። እባክዎ እንደገና ይሞክሩ።',
    alreadyHaveAccount: 'መለያ አለዎት?',
    signIn: 'ይግቡ',
    registerSuccess: 'መለያ በተሳካ ሁኔታ ተፈጥሯል! እየተመራ ነው...',
    confirmEmail: 'መለያ ተፈጥሯል። ኢሜይልዎን ያረጋግጡ፣ ከዚያ ይግቡ።',
    passwordMismatch: 'የይለፍ ቃሎች አይዛመዱም',
    backHome: 'ወደ መነሻ ገጽ',
  },
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
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [authLoading, user, navigate]);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
    } else if (data.session) {

      toast.success(t.registerSuccess);
      setTimeout(() => navigate('/dashboard'), 800);
    } else {
      
      toast.info(t.confirmEmail, { autoClose: 8000 });
      setLoading(false);
    }
  };

  const inputClass =
    'block w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b08d57] focus:border-transparent transition-all duration-200 text-sm';

  const field = (id: string, label: string, Icon: typeof Mail, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input id={id} required className={inputClass} {...props} />
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f4f5]">
      <Link to="/" className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-[#b08d57]/50 hover:text-[#8c6b42]">
        <ArrowLeft className="h-4 w-4" /> {t.backHome}
      </Link>

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
          {field('fullName', t.fullName, User, { type: 'text', value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: t.fullNamePlaceholder })}
          {field('email', t.email, Mail, { type: 'email', value: email, onChange: (e) => setEmail(e.target.value), placeholder: t.emailPlaceholder })}
          {field('password', t.password, Lock, { type: 'password', minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: t.passwordPlaceholder })}
          {field('confirmPassword', t.confirmPassword, Lock, { type: 'password', minLength: 6, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: t.confirmPasswordPlaceholder })}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b08d57] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#8c6b42] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t.creating : t.createAccount}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="my-4 flex items-center">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="mx-3 text-xs font-medium text-gray-400">{t.or}</span>
            <hr className="flex-grow border-t border-gray-200" />
          </div>

          <GoogleButton label={t.continueWithGoogle} failedMessage={t.googleFailed} />

          <p className="mt-4 text-center text-xs text-gray-600">
            {t.alreadyHaveAccount}{' '}
            <Link to="/login" className="font-semibold text-[#b08d57] transition-colors duration-200 hover:text-[#8c6b42]">
              {t.signIn}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
