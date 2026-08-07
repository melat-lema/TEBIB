import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  FileText, Shield, Building, Car, UserCheck, 
  LogOut, Search, Sparkles, Loader2 
} from 'lucide-react';
import img from '../assets/Logo.png';

const iconMap: Record<string, any> = {
  'Immigration': FileText,
  'Civil Registration': Shield,
  'Business & Trade': Building,
  'Transport': Car,
  'Default': UserCheck,
};

const translations = {
  en: {
    welcome: "Welcome back",
    subtitle: "What government service do you need help with today?",
    searchPlaceholder: "Search for passports, IDs, licenses...",
    explore: "Explore",
    noServices: "No services found matching your search.",
    loading: "Loading services..."
  },
  am: {
    welcome: "እንኳን ደህና መጡ",
    subtitle: "ዛሬ ከየትኛው የመንግስት አገልግሎት ጋር እንድንረዳዎ እንችላለን?",
    searchPlaceholder: "ፓስፖርት፣ መታወቂያ፣ ፈቃድ ይፈልጉ...",
    explore: "ይመልከቱ",
    noServices: "ከፍለጋዎ ጋር የሚዛመድ አገልግሎት አልተገኘም።",
    loading: "አገልግሎቶችን በማምጣት ላይ..."
  }
};

export default function Dashboard(){
     const [lang, setLang]=useState<'en' | 'am'>('en');
     const t= translations[lang];

     const [services, setServices]=useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [searchQuery, setSearchQuery] = useState('');
     const [userName, setUserName] = useState('User');
     const navigate = useNavigate();

     useEffect(()=>{

        const getUser= async()=>{
            const {data:{user}}=await supabase.auth.getUser();
             if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      } else if (user?.email) {
        setUserName(user.email.split('@')[0]); // Fallback to email username
      }
        }
        getUser();

        const fetchServices=async()=>{
            setLoading(true);
            const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('is_featured', { ascending: false }) // Show featured services first
        .order('created_at', { ascending: false });

       if (error) {
        console.error("Supabase Fetch Error:", error);
      } else if (data) {
        console.log("✅ Successfully fetched services:", data); // DEBUG LOG
        setServices(data);
      }
      setLoading(false);
    };
        fetchServices();

     },[]);

       const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

   const filteredServices = services.filter(service => {
    const query = searchQuery.toLowerCase();
    return (
      service.name_en.toLowerCase().includes(query) ||
      service.name_am.includes(query) ||
      service.description_en.toLowerCase().includes(query) ||
      service.description_am.includes(query) ||
      service.category.toLowerCase().includes(query)
    );
  });

    return(
         <div className="min-h-screen bg-[#f4f4f5] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={img} alt="Tebib Logo" className="h-8 w-auto object-contain" />
            <span className="text-lg font-bold text-gray-900 hidden sm:block">Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  lang === 'en' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🇬🇧 EN
              </button>
              <button 
                onClick={() => setLang('am')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  lang === 'am' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🇪🇹 AM
              </button>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">Active User</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Welcome & Search Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {t.welcome}, <span className="text-[#b08d57]">{userName}</span>!
          </h1>
          <p className="text-gray-600 mb-8 max-w-2xl">{t.subtitle}</p>

          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#b08d57] focus:border-transparent outline-none text-sm sm:text-base transition-all duration-200"
            />
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b08d57]" />
          </div>
        </motion.div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#b08d57] animate-spin mb-4" />
            <p className="text-gray-500 text-sm">{t.loading}</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300"
          >
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t.noServices}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service, index) => {
              const Icon = iconMap[service.category] || iconMap['Default'];
              // Dynamically pick English or Amharic based on state
              const name = lang === 'en' ? service.name_en : service.name_am;
              const description = lang === 'en' ? service.description_en : service.description_am;

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/services/${service.id}`)}
                  className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#b08d57]/30 transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-[#b08d57]/10 rounded-xl flex items-center justify-center group-hover:bg-[#b08d57] transition-colors duration-300">
                      <Icon className="w-6 h-6 text-[#b08d57] group-hover:text-white transition-colors duration-300" />
                    </div>
                    {service.is_featured && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#b08d57] transition-colors">
                    {name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 flex-grow leading-relaxed">
                    {description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {service.category}
                    </span>
                    <span className="text-sm font-semibold text-[#b08d57] flex items-center gap-1 group-hover:gap-2 transition-all">
                      {t.explore} <span className="text-lg">→</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
    )
}