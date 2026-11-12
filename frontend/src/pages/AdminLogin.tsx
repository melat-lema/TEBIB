// src/pages/AdminLogin.tsx
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_URL } from '../lib/config';
import { ADMIN_TOKEN_KEY, tokenIsValid } from '../lib/adminApi';

const translation = {
  en: {
    title: 'Admin Portal',
    subtitle: 'Sign in to manage the knowledge base and monitor scrapers',
    email: 'Admin Email Address',
    emailPlaceholder: 'admin@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Access Dashboard',
    accessing: 'Accessing...',
    loginSuccess: 'Welcome back, Admin! Redirecting...',
    invalidCredentials: 'Invalid email or password. Please try again.',
    notAdmin: 'Access denied: Admin privileges required.',
    backToHome: '← Back to Tebib Home',
  },
  am: {
    title: 'የአድሚን መግቢያ',
    subtitle: 'እውቀትን ለማስተዳደር እና ስክራፐሮችን ለመከታተል ይግቡ',
    email: 'የአድሚን ኢሜይል',
    emailPlaceholder: 'admin@example.com',
    password: 'የይለፍ ቃል',
    passwordPlaceholder: '••••••••',
    signIn: 'ወደ ዳሽቦርድ ይግቡ',
    accessing: 'በመግባት ላይ...',
    loginSuccess: 'እንኳን ደህና መጡ! ወደ ዳሽቦርድ እየተመራ ነው...',
    invalidCredentials: 'ኢሜይል ወይም የይለፍ ቃል ስህተት ነው። እባክዎ እንደገና ይሞክሩ።',
    notAdmin: 'መብት የለዎትም፡ የአድሚን ፈቃድ ያስፈልጋል።',
    backToHome: '← ወደ ጠቢብ መነሻ ገጽ',
  },
};

export default function AdminLogin() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translation[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (tokenIsValid(localStorage.getItem(ADMIN_TOKEN_KEY))) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(String(data.message ?? '').includes('not an admin') ? t.notAdmin : t.invalidCredentials);
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      toast.success(t.loginSuccess);
      setTimeout(() => navigate('/admin/dashboard'), 600);
    } catch (err: any) {
      const msg = err.message || t.invalidCredentials;
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const inputClass =
    'block w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b08d57] focus:border-transparent transition-all duration-200 text-sm';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f4f5]">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute right-6 top-6 z-20 flex space-x-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {(['en', 'am'] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${lang === l ? 'bg-[#b08d57] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
            {l === 'en' ? '🇬🇧 EN' : '🇪🇹 AM'}
          </button>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="relative z-10 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex flex-col items-center justify-center">
          <div className="mb-3 rounded-full bg-[#b08d57]/10 p-3"><Shield className="h-8 w-8 text-[#b08d57]" /></div>
          <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">{t.title}</h2>
          <p className="mt-1 max-w-[250px] text-center text-xs text-gray-500">{t.subtitle}</p>
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

          <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b08d57] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#8c6b42] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? t.accessing : t.signIn}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="pt-4 text-center">
            <Link to="/" className="flex items-center justify-center gap-1 text-xs font-medium text-gray-500 transition-colors duration-200 hover:text-[#b08d57]">{t.backToHome}</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
