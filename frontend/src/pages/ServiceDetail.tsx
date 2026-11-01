import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Loader2, FileText, CheckCircle2, 
  Clock, MapPin, Sparkles, Banknote, FileCheck, 
  Calendar, ExternalLink, ShieldCheck, AlertCircle
} from 'lucide-react';
import img from '../assets/Logo.png';

const translations = {
  en: {
    back: "Back to Dashboard",
    overview: "Official Overview",
    requirements: "Verified Requirements & Fees",
    details: "Quick Facts",
    loading: "Loading service details...",
    notFound: "Service not found.",
    aiKnowledge: "AI Verified Knowledge Base",
    noDetails: "Our AI scrapers are currently verifying the latest requirements for this service. Please check back soon or ask the AI assistant for real-time help.",
    lastVerified: "Last Verified",
    officialSource: "Official Source",
    askAI: "Ask AI Assistant"
  },
  am: {
    back: "ወደ ዳሽቦርድ ተመለስ",
    overview: "ይፋዊ አጠቃላይ እይታ",
    requirements: "የተረጋገጡ መስፈርቶች እና ክፍያዎች",
    details: "ፈጣን እውነታዎች",
    loading: "የአገልግሎት ዝርዝሮችን በማምጣት ላይ...",
    notFound: "አገልግሎቱ አልተገኘም።",
    aiKnowledge: "በAI የተረጋገጠ የውሂብ ክምችት",
    noDetails: "የAI ስክራፐሮች ለዚህ አገልግሎት የቅርብ ጊዜ መስፈርቶችን እያረጋገጡ ነው። እባክዎ በኋላ ይመለከቱ ወይም ለፈጣን እርዳታ የAI ረዳቱን ይጠይቁ።",
    lastVerified: "መጨረሻ የተረጋገጠበት",
    officialSource: "ይፋዊ ምንጭ",
    askAI: "የAI ረዳትን ይጠይቁ"
  }
};

// Helper to pick an icon based on the source detail or text
const getIconForFact = (detail: string, text: string) => {
  const lower = (detail + ' ' + text).toLowerCase();
  if (lower.includes('fee') || lower.includes('cost') || lower.includes('price') || lower.includes('ክፍያ') || lower.includes('ብር')) return Banknote;
  if (lower.includes('require') || lower.includes('document') || lower.includes('መስፈርት') || lower.includes('ሰነድ')) return FileCheck;
  if (lower.includes('step') || lower.includes('process') || lower.includes('ደረጃ')) return CheckCircle2;
  return Sparkles;
};

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  const [service, setService] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Fetch base service info
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      // 2. Fetch ONLY APPROVED knowledge base chunks for this service
      const { data: detailsData } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('service_id', id)
        .eq('status', 'approved') // 🛡️ CRITICAL: Only show verified/approved data
        .order('created_at', { ascending: false });

      
      // 🔍 DEBUG LOGS: Check your browser console (F12) to see exactly what we got
      console.log("📦 Fetched Service:", serviceData);
      console.log("📚 Fetched Knowledge Base Details:", detailsData);
      if (serviceData) {
        setService(serviceData);
        setDetails(detailsData || []);
        
        // Find the most recent verification date from the approved chunks
        if (detailsData && detailsData.length > 0) {
          const latest = detailsData.reduce((prev, current) => 
            (new Date(prev.last_verified_at || prev.created_at) > new Date(current.last_verified_at || current.created_at)) ? prev : current
          );
          setLastVerified(latest.last_verified_at || latest.created_at);
        }
      }
      setLoading(false);
    };

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#b08d57] animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">{t.loading}</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <p className="text-gray-500 font-medium">{t.notFound}</p>
        <button onClick={() => navigate('/dashboard')} className="text-[#b08d57] hover:underline text-sm">Go Back</button>
      </div>
    );
  }

  const name = lang === 'en' ? service.name_en : service.name_am;
  const description = lang === 'en' ? service.description_en : service.description_am;

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#b08d57] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>
          
          <div className="flex items-center gap-4">
            <img src={img} alt="Tebib Logo" className="h-8 w-auto object-contain" />
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${lang === 'en' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'}`}>🇬🇧 EN</button>
              <button onClick={() => setLang('am')} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${lang === 'am' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'}`}>🇪🇹 AM</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Title Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-[#b08d57]/10 text-[#b08d57] text-xs font-bold uppercase tracking-wider rounded-full">
              {service.category || 'Government Service'}
            </span>
            {lastVerified && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t.lastVerified}: {new Date(lastVerified).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US')}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{name}</h1>
          <p className="text-gray-600 text-lg max-w-3xl leading-relaxed">{description}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Details & Requirements */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Overview Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#b08d57]" />
                {t.overview}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {description}
                <br /><br />
                {lang === 'en' 
                  ? "This service is managed by the relevant Ethiopian government authority. Please ensure you have all required documents before visiting the office to save time."
                  : "ይህ አገልግሎት በተገቢው የኢትዮጵያ መንግስት ባለስልጣን የሚተዳደር ነው። ጊዜ ለመቆጠብ ወደ መስሪያ ቤቱ ከመሄድዎ በፊት ሁሉም አስፈላጊ ሰነዶች እንዳሉዎት ያረጋግጡ።"
                }
              </p>
            </motion.div>

            {/* Knowledge Base / Requirements Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#b08d57]" />
                {t.requirements}
              </h2>

              {details.length > 0 ? (
                <div className="space-y-4">
                  {details.map((chunk, index) => {
                    const Icon = getIconForFact(chunk.source_details, chunk.chunk_text);
                    return (
                      <motion.div 
                        key={chunk.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="group p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#b08d57]/40 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-[#b08d57] group-hover:border-[#b08d57] transition-colors">
                            <Icon className="w-5 h-5 text-[#b08d57] group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-800 leading-relaxed font-medium">
                              {lang === 'en' ? chunk.chunk_text : (chunk.chunk_text_am || chunk.chunk_text)}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-gray-200">
                                <Sparkles className="w-3 h-3 text-[#b08d57]" />
                                {chunk.source_type === 'website' ? 'Web Scraper' : chunk.source_type === 'telegram' ? 'Telegram' : 'Manual Entry'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {chunk.source_published_at ? new Date(chunk.source_published_at).toLocaleDateString() : 'N/A'}
                              </span>
                              {chunk.source_url && (
                                <a href={chunk.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#b08d57] hover:underline font-medium">
                                  <ExternalLink className="w-3 h-3" /> View Source
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm max-w-md mx-auto px-4">{t.noDetails}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column: Sticky Summary Card */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#b08d57]" />
                {t.details}
              </h3>
              
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#b08d57]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#b08d57]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm font-medium text-gray-900">{service.category || 'General'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-medium text-green-600">Active & Verified</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.officialSource}</p>
                    <a href={service.official_link || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#b08d57] hover:underline flex items-center gap-1">
                      {service.official_link ? 'Visit Official Website' : 'Government Portal'} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                <button 
                  onClick={() => navigate(`/chat?service=${id}`)}
                  className="w-full bg-[#b08d57] text-white font-semibold py-3 rounded-xl hover:bg-[#8c6b42] transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {t.askAI}
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-white text-gray-700 font-medium py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 text-sm"
                >
                  Back to All Services
                </button>
              </div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}