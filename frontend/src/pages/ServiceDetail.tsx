import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Loader2, FileText, CheckCircle2, 
  Clock, MapPin, Sparkles 
} from 'lucide-react';
import img from '../assets/Logo.png';

const translations = {
  en: {
    back: "Back to Dashboard",
    overview: "Overview",
    requirements: "Requirements & Steps",
    details: "Detailed Information",
    loading: "Loading service details...",
    notFound: "Service not found.",
    aiKnowledge: "AI Knowledge Base",
    noDetails: "Detailed step-by-step requirements are currently being updated by our AI scrapers. Please check back soon or ask the AI assistant."
  },
  am: {
    back: "ወደ ዳሽቦር ተመለስ",
    overview: "አጠቃይ እይታ",
    requirements: "መስፈርቶች እና ደረጃዎች",
    details: "ዝርዝር መረጃ",
    loading: "የአገልግሎት ርዝሮችን በማምት ላይ...",
    notFound: "አገልግቱ አልተገም።",
    aiKnowledge: "የAI የውሂብ ከማቻ",
    noDetails: "ዝርዝር መስፈርቶች በAI እየተዘመኑ ነው። እባክ በኋላ ይመለከቱ ወይም የAI ረዳቱን ይጠይቁ።"
  }
};

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translations[lang];

  const [service, setService] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]); // From knowledge_base
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      const { data: detailsData } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('service_id', id);

      if (serviceData) {
        setService(serviceData);
        setDetails(detailsData || []);
      }
      setLoading(false);
    };

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#b08d57] animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <p className="text-gray-500">{t.notFound}</p>
      </div>
    );
  }

  const name = lang === 'en' ? service.name_en : service.name_am;
  const description = lang === 'en' ? service.description_en : service.description_am;

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#b08d57] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <img src={img} alt="Tebib Logo" className="h-8 w-auto object-contain" />
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  lang === 'en' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'
                }`}
              >
                🇬🇧 EN
              </button>
              <button 
                onClick={() => setLang('am')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  lang === 'am' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'
                }`}
              >
                🇪🇹 AM
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Breadcrumb & Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-[#b08d57] font-medium">{name}</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{name}</h1>
          <p className="text-gray-600 text-lg max-w-3xl leading-relaxed">{description}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Details & Requirements */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Overview Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#b08d57]" />
                {t.overview}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {description} 
                {/* In a real app, you'd have a longer overview text here */}
                <br /><br />
                {lang === 'en' 
                  ? "This service is managed by the relevant Ethiopian government authority. Please ensure you have all required documents before visiting the office to save time."
                  : "ይህ አገልግሎት በተገቢው የኢትዮጵያ መንግስት ባለስልጣን የሚተዳደር ነው። ዜ ለማን ከመስሪያ ቱ በፊት ሉም አስፈላጊ ሰነች እንዳሉዎት ረጋግጡ።"
                }
              </p>
            </motion.div>

            {/* Knowledge Base / Requirements Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#b08d57]" />
                {t.requirements}
              </h2>

              {details.length > 0 ? (
                <div className="space-y-4">
                  {details.map((chunk, index) => (
                    <div 
                      key={chunk.id} 
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#b08d57]/30 transition-colors"
                    >
                      <p className="text-gray-700 leading-relaxed">
                        {lang === 'en' ? chunk.chunk_text : chunk.chunk_text_am || chunk.chunk_text}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        <Sparkles className="w-3 h-3" />
                        <span>{chunk.source_type || 'Manual'} • {chunk.source_details || 'Tebib Database'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm max-w-md mx-auto">{t.noDetails}</p>
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
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t.details}</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#b08d57]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#b08d57]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm font-medium text-gray-900">{service.category}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#b08d57]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#b08d57]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-medium text-green-600">Active & Verified</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#b08d57]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#b08d57]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{service.source_type || 'Official'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <button className="w-full bg-[#b08d57] text-white font-semibold py-2.5 rounded-lg hover:bg-[#8c6b42] transition-colors text-sm">
                  {lang === 'en' ? 'Ask AI about this service' : 'ስለዚህ አገልሎት AI ይጠይ'}
                </button>
              </div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}