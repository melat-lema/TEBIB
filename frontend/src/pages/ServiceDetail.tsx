import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, FileText, CheckCircle2, Sparkles, Banknote, FileCheck, Calendar, ExternalLink,
  ShieldCheck, AlertCircle, Phone, Building2, Timer, Megaphone, ListOrdered, TriangleAlert, RefreshCw,
} from 'lucide-react';
import img from '../assets/Logo.png';
import ChatWidget from '../components/chat/ChatWidget';

const ORDER = ['fee', 'requirement', 'step', 'office', 'contact', 'deadline', 'update', 'other'] as const;
type Cat = (typeof ORDER)[number];

const CAT: Record<Cat, { Icon: any; en: string; am: string }> = {
  fee: { Icon: Banknote, en: 'Fees', am: 'ክፍያዎች' },
  requirement: { Icon: FileCheck, en: 'Required documents', am: 'የሚያስፈልጉ ሰነዶች' },
  step: { Icon: ListOrdered, en: 'How to apply', am: 'እንዴት ማመልከት ይቻላል' },
  office: { Icon: Building2, en: 'Where to go', am: 'የት መሄድ' },
  contact: { Icon: Phone, en: 'Contact', am: 'ያግኙን' },
  deadline: { Icon: Timer, en: 'Deadlines and processing time', am: 'የጊዜ ገደብ' },
  update: { Icon: Megaphone, en: 'Recent changes', am: 'የቅርብ ጊዜ ለውጦች' },
  other: { Icon: Sparkles, en: 'Good to know', am: 'ማወቅ ጠቃሚ' },
};

const translations = {
  en: {
    back: 'Back to Dashboard',
    overview: 'Overview',
    quickFacts: 'Quick facts',
    notFound: 'Service not found.',
    loading: 'Loading service details...',
    noDetails: 'No verified details for this service yet. Our team is reviewing the latest information. Ask the AI assistant in the meantime.',
    lastVerified: 'Last verified',
    officialSource: 'Official source',
    visitOfficial: 'Visit official website',
    askAI: 'Ask AI Assistant',
    allServices: 'Back to all services',
    category: 'Category',
    verifiedFacts: 'Verified facts',
    updated: 'Updated',
    unconfirmed: 'Not yet confirmed with the office',
    secondary: 'From a news source',
    englishOnly: 'English only',
    manual: 'Added by Tebib team',
    scraper: 'Official website',
    telegram: 'Official channel',
    source: 'Source',
    askPrompt: (n: string) => `Tell me what I need for: ${n}`,
    note: 'This service is managed by the relevant Ethiopian government authority. Check requirements before visiting the office to save time.',
  },
  am: {
    back: 'ወደ ዳሽቦርድ ተመለስ',
    overview: 'አጠቃላይ እይታ',
    quickFacts: 'ፈጣን እውነታዎች',
    notFound: 'አገልግሎቱ አልተገኘም።',
    loading: 'የአገልግሎት ዝርዝሮችን በማምጣት ላይ...',
    noDetails: 'ለዚህ አገልግሎት የተረጋገጡ ዝርዝሮች ገና የሉም። ቡድናችን የቅርብ ጊዜ መረጃን እየገመገመ ነው። እስከዚያው የAI ረዳቱን ይጠይቁ።',
    lastVerified: 'መጨረሻ የተረጋገጠበት',
    officialSource: 'ይፋዊ ምንጭ',
    visitOfficial: 'ይፋዊ ድረ ገጽን ይጎብኙ',
    askAI: 'የAI ረዳትን ይጠይቁ',
    allServices: 'ወደ ሁሉም አገልግሎቶች',
    category: 'ምድብ',
    verifiedFacts: 'የተረጋገጡ መረጃዎች',
    updated: 'ተዘምኗል',
    unconfirmed: 'ከመስሪያ ቤቱ ጋር ገና አልተረጋገጠም',
    secondary: 'ከዜና ምንጭ',
    englishOnly: 'በእንግሊዝኛ ብቻ',
    manual: 'በጠቢብ ቡድን የተጨመረ',
    scraper: 'ይፋዊ ድረ ገጽ',
    telegram: 'ይፋዊ ቻናል',
    source: 'ምንጭ',
    askPrompt: (n: string) => `ስለ ${n} ምን ያስፈልገኛል?`,
    note: 'ይህ አገልግሎት በተገቢው የኢትዮጵያ መንግስት ባለስልጣን የሚተዳደር ነው። ጊዜ ለመቆጠብ ወደ መስሪያ ቤቱ ከመሄድዎ በፊት መስፈርቶችን ያረጋግጡ።',
  },
};

/** Older rows have no category column value: guess it so they still land in the right group */
function inferCategory(text: string): Cat {
  const l = text.toLowerCase();
  if (/\b(fee|fees|cost|costs|price|etb|birr|usd)\b/.test(l) || /ክፍያ|ብር/.test(text)) return 'fee';
  if (/\b(call|phone|email|free call)\b/.test(l) || /ስልክ/.test(text)) return 'contact';
  if (/\b(require|requirements|documents?|photo|certificate)\b/.test(l) || /ሰነድ|መስፈርት/.test(text)) return 'requirement';
  if (/\b(register|apply|portal|online|visit)\b/.test(l) || /ማመልከ|ምዝገባ/.test(text)) return 'step';
  return 'other';
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  const [service, setService] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: serviceData }, { data: detailsData }] = await Promise.all([
        supabase.from('services').select('*').eq('id', id).single(),
        supabase.from('knowledge_base').select('*').eq('service_id', id).eq('status', 'approved').order('created_at', { ascending: false }),
      ]);
      setService(serviceData ?? null);
      setDetails(detailsData ?? []);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const lastVerified = useMemo(() => details.map((d) => d.last_verified_at ?? d.created_at).sort().pop() ?? null, [details]);

  const groups = useMemo(() => {
    const map = new Map<Cat, any[]>();
    for (const d of details) {
      const cat: Cat = ORDER.includes(d.category) ? d.category : inferCategory(d.chunk_text);
      map.set(cat, [...(map.get(cat) ?? []), d]);
    }
    return ORDER.filter((c) => map.has(c)).map((c) => ({ cat: c, items: map.get(c)! }));
  }, [details]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f4f5]">
        <Loader2 className="h-10 w-10 animate-spin text-[#b08d57]" />
        <p className="animate-pulse text-sm font-medium text-gray-500">{t.loading}</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f4f5]">
        <AlertCircle className="h-12 w-12 text-gray-400" />
        <p className="font-medium text-gray-500">{t.notFound}</p>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-[#b08d57] hover:underline">{t.back}</button>
      </div>
    );
  }

  const name = lang === 'en' ? service.name_en : service.name_am;
  const description = lang === 'en' ? service.description_en : service.description_am;
  const askAI = () => window.dispatchEvent(new CustomEvent('open-chat', { detail: { message: t.askPrompt(name), send: true } }));
  const sourceLabel = (d: any) => (d.source_type === 'website' ? t.scraper : d.source_type === 'telegram' ? t.telegram : t.manual);

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f4f5]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-[#b08d57]">
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </button>
          <div className="flex items-center gap-4">
            <img src={img} alt="Tebib Logo" className="h-8 w-auto object-contain" />
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
              {(['en', 'am'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${lang === l ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'}`}>
                  {l === 'en' ? '🇬🇧 EN' : '🇪🇹 AM'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#b08d57]/10 px-3 py-1 text-xs font-bold text-[#b08d57]">{service.category || 'Government Service'}</span>
            {lastVerified && (
              <span className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.lastVerified}: {new Date(lastVerified).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US')}
              </span>
            )}
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900 sm:text-4xl">{name}</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-gray-600">{description}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900">
                <FileText className="h-5 w-5 text-[#b08d57]" /> {t.overview}
              </h2>
              <p className="leading-relaxed text-gray-600">{t.note}</p>
            </div>

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="mx-auto max-w-md px-4 text-sm text-gray-500">{t.noDetails}</p>
              </div>
            ) : (
              groups.map(({ cat, items }) => {
                const { Icon } = CAT[cat];
                return (
                  <section key={cat} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="mb-5 flex items-center gap-2.5 text-xl font-bold text-gray-900">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#b08d57]/10">
                        <Icon className="h-5 w-5 text-[#b08d57]" />
                      </span>
                      {CAT[cat][lang]}
                    </h2>

                    <ul className="space-y-3">
                      {items.map((chunk) => {
                        const hasAm = !!chunk.chunk_text_am;
                        const unconfirmed = /UNVERIFIED/i.test(chunk.source_details ?? '');
                        return (
                          <li key={chunk.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-[#b08d57]/40">
                            <p className="font-medium leading-relaxed text-gray-800">{lang === 'am' && hasAm ? chunk.chunk_text_am : chunk.chunk_text}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500">
                              {chunk.supersedes_id && (
                                <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                                  <RefreshCw className="h-3 w-3" /> {t.updated}
                                </span>
                              )}
                              {unconfirmed && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                  <TriangleAlert className="h-3 w-3" /> {t.unconfirmed}
                                </span>
                              )}
                              {chunk.trust_level === 'secondary' && <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-600">{t.secondary}</span>}
                              {lang === 'am' && !hasAm && <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-600">{t.englishOnly}</span>}

                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-[#b08d57]" /> {sourceLabel(chunk)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(chunk.last_verified_at ?? chunk.source_published_at ?? chunk.created_at).toLocaleDateString()}
                              </span>
                              {chunk.source_url && (
                                <a href={chunk.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-[#b08d57] hover:underline">
                                  <ExternalLink className="h-3 w-3" /> {t.source}
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            )}
          </div>

          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-bold text-gray-900">{t.quickFacts}</h3>

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#b08d57]/10"><FileText className="h-4 w-4 text-[#b08d57]" /></div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{t.category}</p>
                    <p className="text-sm font-medium text-gray-900">{service.category || 'General'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{t.verifiedFacts}</p>
                    <p className="text-sm font-medium text-green-700">{details.length}</p>
                  </div>
                </div>

                {service.official_link && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50"><ExternalLink className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">{t.officialSource}</p>
                      <a href={service.official_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium text-[#b08d57] hover:underline">
                        {t.visitOfficial} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3 border-t border-gray-100 pt-6">
                <button onClick={askAI} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b08d57] py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#8c6b42] hover:shadow-lg">
                  <Sparkles className="h-4 w-4" /> {t.askAI}
                </button>
                <button onClick={() => navigate('/dashboard')} className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50">
                  {t.allServices}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <ChatWidget lang={lang} />
    </div>
  );
}
