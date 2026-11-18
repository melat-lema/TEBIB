import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import {
  FileText, Shield, Building, Car, UserCheck, LogOut, Search, Sparkles, Loader2,
  ShieldCheck, MessageSquare, Clock, PenLine, ArrowUpRight,
} from 'lucide-react';
import img from '../assets/Logo.png';
import ChatWidget from '../components/chat/ChatWidget';
import MyUsage from '../components/premium/MyUsage';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css'; // loads the Ethiopic font used in the banner

const iconMap: Record<string, any> = {
  Immigration: FileText,
  'Civil Registration': Shield,
  'Business & Trade': Building,
  Business: Building,
  Transport: Car,
  Default: UserCheck,
};

const translations = {
  en: {
    welcome: 'Welcome back',
    subtitle: 'What government service do you need help with today?',
    searchPlaceholder: 'Search for passports, IDs, licenses...',
    explore: 'Explore',
    noServices: 'No services found matching your search.',
    loading: 'Loading services...',
    all: 'All',
    services: 'Services',
    verifiedFacts: 'Verified facts',
    lastUpdated: 'Last updated',
    askQuick: 'Ask a quick question',
    recent: 'Recently verified',
    recentEmpty: 'Verified updates will appear here.',
    yourQuestions: 'Your recent questions',
    letterTitle: 'Need a letter or application?',
    letterText: 'The assistant can draft a formal letter for you to fill in.',
    letterCta: 'Draft a letter',
    letterPrompt: 'Write a formal letter to request a copy of my birth certificate',
    facts: 'verified facts',
    noFacts: 'being verified',
    today: 'today',
    daysAgo: (n: number) => `${n}d ago`,
    featured: 'Featured',
    active: 'Active User',
    suggestions: [
      'How much does a new passport cost?',
      'What documents do I need for a Kebele ID?',
      'How do I register a birth?',
      'What do I need for a driving license?',
    ],
  },
  am: {
    welcome: 'እንኳን ደህና መጡ',
    subtitle: 'ዛሬ ከየትኛው የመንግስት አገልግሎት ጋር እንድንረዳዎ እንችላለን?',
    searchPlaceholder: 'ፓስፖርት፣ መታወቂያ፣ ፈቃድ ይፈልጉ...',
    explore: 'ይመልከቱ',
    noServices: 'ከፍለጋዎ ጋር የሚዛመድ አገልግሎት አልተገኘም።',
    loading: 'አገልግሎቶችን በማምጣት ላይ...',
    all: 'ሁሉም',
    services: 'አገልግሎቶች',
    verifiedFacts: 'የተረጋገጡ መረጃዎች',
    lastUpdated: 'መጨረሻ የተዘመነው',
    askQuick: 'ፈጣን ጥያቄ ይጠይቁ',
    recent: 'በቅርቡ የተረጋገጡ',
    recentEmpty: 'የተረጋገጡ ዝመናዎች እዚህ ይታያሉ።',
    yourQuestions: 'የእርስዎ የቅርብ ጊዜ ጥያቄዎች',
    letterTitle: 'ደብዳቤ ወይም ማመልከቻ ይፈልጋሉ?',
    letterText: 'ረዳቱ እርስዎ የሚሞሉት መደበኛ ደብዳቤ ሊያዘጋጅልዎ ይችላል።',
    letterCta: 'ደብዳቤ አዘጋጅ',
    letterPrompt: 'የልደት ምስክር ወረቀቴን ቅጂ ለመጠየቅ መደበኛ ደብዳቤ ጻፍልኝ',
    facts: 'የተረጋገጡ መረጃዎች',
    noFacts: 'በመረጋገጥ ላይ',
    today: 'ዛሬ',
    daysAgo: (n: number) => `ከ${n} ቀን በፊት`,
    featured: 'ተመራጭ',
    active: 'ንቁ ተጠቃሚ',
    suggestions: [
      'አዲስ ፓስፖርት ስንት ነው?',
      'ለቀበሌ መታወቂያ ምን ሰነዶች ያስፈልጋሉ?',
      'ልደትን እንዴት መመዝገብ እችላለሁ?',
      'ለመንጃ ፈቃድ ምን ያስፈልጋል?',
    ],
  },
};

const askChat = (message: string) => window.dispatchEvent(new CustomEvent('open-chat', { detail: { message, send: true } }));

export default function Dashboard() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];
  const { user } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<any[]>([]);
  const [facts, setFacts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');

  const userName: string = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatar: string | undefined = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [svc, kb] = await Promise.all([
        supabase.from('services').select('*').order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
        supabase
          .from('knowledge_base')
          .select('id, service_id, chunk_text, chunk_text_am, last_verified_at, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(400),
      ]);
      if (svc.error) console.error('Services error:', svc.error);
      setServices(svc.data ?? []);
      setFacts(kb.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // Needs the "chat read own" policy from sql/01_migration.sql; stays hidden if there is nothing to show
  useEffect(() => {
    if (!user) return;
    supabase
      .from('chat_history')
      .select('id, user_message, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const seen = new Set<string>();
        setChats((data ?? []).filter((c) => (seen.has(c.user_message) ? false : (seen.add(c.user_message), true))).slice(0, 4));
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const stats = useMemo(() => {
    const perService = new Map<string, { count: number; last: string | null }>();
    for (const f of facts) {
      if (!f.service_id) continue;
      const cur = perService.get(f.service_id) ?? { count: 0, last: null };
      const when = f.last_verified_at ?? f.created_at;
      perService.set(f.service_id, { count: cur.count + 1, last: !cur.last || when > cur.last ? when : cur.last });
    }
    const last = facts.map((f) => f.last_verified_at ?? f.created_at).sort().pop() ?? null;
    return { perService, last };
  }, [facts]);

  const serviceName = (id: string | null) => {
    const s = services.find((x) => x.id === id);
    return s ? (lang === 'en' ? s.name_en : s.name_am) : null;
  };

  const ago = (iso: string | null) => {
    if (!iso) return '—';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return days <= 0 ? t.today : t.daysAgo(days);
  };

  const categories = useMemo(() => ['all', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))], [services]);

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matches =
      s.name_en?.toLowerCase().includes(q) || s.name_am?.includes(searchQuery) || s.description_en?.toLowerCase().includes(q) || s.description_am?.includes(searchQuery) || s.category?.toLowerCase().includes(q);
    return matches && (category === 'all' || s.category === category);
  });

  const recent = useMemo(
    () => [...facts].sort((a, b) => (b.last_verified_at ?? b.created_at).localeCompare(a.last_verified_at ?? a.created_at)).slice(0, 5),
    [facts],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f4f5]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={img} alt="Tebib Logo" className="h-8 w-auto object-contain" />
            <span className="hidden text-lg font-bold text-gray-900 sm:block">Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
              {(['en', 'am'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all duration-200 ${lang === l ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {l === 'en' ? '🇬🇧 EN' : '🇪🇹 AM'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              {avatar ? (
                <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b08d57] text-sm font-bold text-white">{userName.charAt(0).toUpperCase()}</div>
              )}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{t.active}</p>
              </div>
              <button onClick={handleLogout} className="rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-500" title="Logout" aria-label="Logout">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-[#1d1a16] p-7 text-white sm:p-10"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#b08d57]/25 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 right-6 select-none text-[14rem] font-extrabold leading-none text-white/[0.04]" style={{ fontFamily: "'Noto Sans Ethiopic', sans-serif" }}>
            ጠ
          </span>

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t.welcome}, <span className="text-[#e6cfa0]">{userName}</span>
              </h1>
              <p className="mt-2 max-w-xl text-gray-300">{t.subtitle}</p>

              <div className="relative mt-6 max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full rounded-xl border border-white/10 bg-white py-3.5 pl-12 pr-4 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-[#b08d57] sm:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t.services, value: String(services.length), Icon: FileText },
                { label: t.verifiedFacts, value: String(facts.length), Icon: ShieldCheck },
                { label: t.lastUpdated, value: ago(stats.last), Icon: Clock },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <Icon className="h-4 w-4 text-[#e6cfa0]" />
                  <p className="mt-2 text-xl font-bold">{value}</p>
                  <p className="text-[11px] leading-tight text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Quick questions */}
        <section className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Sparkles className="h-4 w-4 text-[#b08d57]" /> {t.askQuick}
          </p>
          <div className="flex flex-wrap gap-2">
            {t.suggestions.map((q) => (
              <button key={q} onClick={() => askChat(q)} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:border-[#b08d57] hover:text-[#8c6b42] hover:shadow-sm">
                {q}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Services */}
          <section className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${category === c ? 'bg-[#b08d57] text-white shadow-md' : 'border border-gray-200 bg-white text-gray-600 hover:border-[#b08d57]/50'}`}
                >
                  {c === 'all' ? t.all : c}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#b08d57]" />
                <p className="text-sm text-gray-500">{t.loading}</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-500">{t.noServices}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {filteredServices.map((service, index) => {
                  const Icon = iconMap[service.category] || iconMap.Default;
                  const name = lang === 'en' ? service.name_en : service.name_am;
                  const description = lang === 'en' ? service.description_en : service.description_am;
                  const info = stats.perService.get(service.id);

                  return (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => navigate(`/services/${service.id}`)}
                      className="group flex cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#b08d57]/30 hover:shadow-xl"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#b08d57]/10 transition-colors duration-300 group-hover:bg-[#b08d57]">
                          <Icon className="h-6 w-6 text-[#b08d57] transition-colors duration-300 group-hover:text-white" />
                        </div>
                        {service.is_featured && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">{t.featured}</span>}
                      </div>

                      <h3 className="mb-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-[#b08d57]">{name}</h3>
                      <p className="mb-5 line-clamp-3 flex-grow text-sm leading-relaxed text-gray-500">{description}</p>

                      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${info ? 'text-green-700' : 'text-gray-400'}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {info ? `${info.count} ${t.facts} · ${ago(info.last)}` : t.noFacts}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-semibold text-[#b08d57] transition-all group-hover:gap-2">
                          {t.explore} <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Side panels */}
          <aside className="space-y-6">
            <MyUsage lang={lang} />
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                <ShieldCheck className="h-4 w-4 text-green-600" /> {t.recent}
              </h3>
              {recent.length === 0 ? (
                <p className="text-sm text-gray-400">{t.recentEmpty}</p>
              ) : (
                <ul className="space-y-4">
                  {recent.map((f) => (
                    <li key={f.id}>
                      <button onClick={() => f.service_id && navigate(`/services/${f.service_id}`)} className="group block w-full text-left">
                        <p className="line-clamp-2 text-sm leading-snug text-gray-700 transition-colors group-hover:text-[#8c6b42]">
                          {lang === 'am' && f.chunk_text_am ? f.chunk_text_am : f.chunk_text}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {serviceName(f.service_id) ?? '—'} · {ago(f.last_verified_at ?? f.created_at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {chats.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <MessageSquare className="h-4 w-4 text-[#b08d57]" /> {t.yourQuestions}
                </h3>
                <ul className="space-y-1">
                  {chats.map((c) => (
                    <li key={c.id}>
                      <button onClick={() => askChat(c.user_message)} className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-[#b08d57]/10 hover:text-[#8c6b42]">
                        {c.user_message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl bg-gradient-to-br from-[#b08d57] to-[#8c6b42] p-5 text-white shadow-md">
              <PenLine className="h-6 w-6 text-white/80" />
              <h3 className="mt-3 font-bold">{t.letterTitle}</h3>
              <p className="mt-1 text-sm text-white/80">{t.letterText}</p>
              <button onClick={() => askChat(t.letterPrompt)} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#8c6b42] transition-shadow hover:shadow-lg">
                {t.letterCta}
              </button>
            </div>
          </aside>
        </div>

        <ChatWidget lang={lang} />
      </main>
    </div>
  );
}
