// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FileCheck, Activity, BarChart3, 
  LogOut, CheckCircle, XCircle, Clock, Globe, RefreshCw, Menu, X
} from 'lucide-react';
import { toast } from 'react-toastify';

const translation = {
  en: {
    overview: "Overview",
    pending: "Pending Approvals",
    logs: "Scraper Logs",
    analytics: "Analytics & Payments",
    logout: "Logout",
    totalApproved: "Total Approved Facts",
    pendingReview: "Pending Review",
    scraperSuccess: "Scraper Success Rate",
    approve: "Approve",
    reject: "Reject",
    service: "Service",
    fact: "Fact",
    evidence: "Evidence",
    source: "Source",
    noPending: "No pending facts to review. Great job!",
    fetchError: "Failed to fetch data. Please try again.",
    approveSuccess: "Fact approved successfully!",
    rejectSuccess: "Fact rejected successfully.",
  },
  am: {
    overview: "አጠቃላይ እይታ",
    pending: "የጸደቁ ጥያቄዎች",
    logs: "የስክራፐር መዝገቦች",
    analytics: "ትንተና እና ክፍያዎች",
    logout: "ውጣ",
    totalApproved: "ጠቅላላ የጸደቁ እውነታዎች",
    pendingReview: "ግምገማ የሚጠብቁ",
    scraperSuccess: "የስክራፐር ስኬት መጠን",
    approve: "አጽድቅ",
    reject: "አትረፍ",
    service: "አገልግሎት",
    fact: "እውነታ",
    evidence: "ማስረጃ",
    source: "ምንጭ",
    noPending: "ለግምገማ የሚጠብቁ እውነታዎች የሉም። ስራዎ በጣም ጥሩ ነው!",
    fetchError: "መረጃውን ማምጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    approveSuccess: "እውነታው በተሳካ ሁኔታ ጸድቋል!",
    rejectSuccess: "እውነታው ተሽሯል።",
  }
};

export default function AdminDashboard() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = translation[lang];
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [pendingFacts, setPendingFacts] = useState<any[]>([]);
  const [scraperLogs, setScraperLogs] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);

  // 1. Auth Check & Initial Data Fetch
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (!storedToken) {
      navigate('/admin/login');
      return;
    }
    setToken(storedToken);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Pending Facts
      const pendingRes = await fetch('http://localhost:3000/admin/pending-facts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingFacts(data);
      }

      // Fetch Scraper Logs
      const logsRes = await fetch('http://localhost:3000/admin/scraper-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const data = await logsRes.json();
        setScraperLogs(data);
      }
    } catch (error) {
      toast.error(t.fetchError);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Approve/Reject Actions
  const handleAction = async (factId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`http://localhost:3000/admin/${action}/${factId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ factId })
      });

      if (res.ok) {
        toast.success(action === 'approve' ? t.approveSuccess : t.rejectSuccess);
        // Optimistically update UI
        setPendingFacts(prev => prev.filter(f => f.id !== factId));
      } else {
        toast.error(t.fetchError);
      }
    } catch (error) {
      toast.error(t.fetchError);
    }
  };

  // 3. Logout Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  // --- UI Components ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        activeTab === id 
          ? 'bg-[#b08d57] text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : 0 }} // Simplified for responsive
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Tebib <span className="text-[#b08d57]">Admin</span></h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <SidebarItem id="overview" icon={LayoutDashboard} label={t.overview} />
          <SidebarItem id="pending" icon={FileCheck} label={`${t.pending} ${pendingFacts.length > 0 ? `(${pendingFacts.length})` : ''}`} />
          <SidebarItem id="logs" icon={Activity} label={t.logs} />
          <SidebarItem id="analytics" icon={BarChart3} label={t.analytics} />
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            {t.logout}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Language Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${lang === 'en' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'}`}>EN</button>
              <button onClick={() => setLang('am')} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${lang === 'am' ? 'bg-white text-[#b08d57] shadow-sm' : 'text-gray-500'}`}>AM</button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t.overview}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard title={t.totalApproved} value="142" icon={CheckCircle} color="text-green-600" bg="bg-green-50" />
                  <StatCard title={t.pendingReview} value={pendingFacts.length.toString()} icon={Clock} color="text-[#b08d57]" bg="bg-[#b08d57]/10" />
                  <StatCard title={t.scraperSuccess} value="98.5%" icon={Activity} color="text-blue-600" bg="bg-blue-50" />
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pending Items</h3>
                  {pendingFacts.length === 0 ? (
                    <p className="text-gray-500 text-sm">{t.noPending}</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingFacts.slice(0, 3).map((fact) => (
                        <div key={fact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{fact.metadata?.service || 'Unknown Service'}</p>
                            <p className="text-xs text-gray-500 truncate max-w-md">{fact.chunk_text}</p>
                          </div>
                          <button onClick={() => setActiveTab('pending')} className="text-xs font-medium text-[#b08d57] hover:underline">Review</button>
                        </div>
                        ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* VIEW 2: PENDING APPROVALS */}
            {activeTab === 'pending' && (
              <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">{t.pending}</h2>
                  <button onClick={fetchData} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#b08d57] transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {pendingFacts.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t.noPending}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">{t.service}</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">{t.fact} (EN)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">{t.evidence}</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">{t.source}</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pendingFacts.map((fact) => (
                            <tr key={fact.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {fact.metadata?.service || 'General'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-900 max-w-xs truncate" title={fact.chunk_text}>
                                {fact.chunk_text}
                              </td>
                              <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate" title={fact.metadata?.evidence}>
                                "{fact.metadata?.evidence}"
                              </td>
                              <td className="px-6 py-4">
                                <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="text-[#b08d57] hover:underline flex items-center gap-1 text-xs">
                                  <Globe className="w-3 h-3" /> View Source
                                </a>
                                <p className="text-xs text-gray-400 mt-1">{new Date(fact.source_published_at).toLocaleDateString()}</p>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button 
                                  onClick={() => handleAction(fact.id, 'approve')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> {t.approve}
                                </button>
                                <button 
                                  onClick={() => handleAction(fact.id, 'reject')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> {t.reject}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW 3: SCRAPER LOGS */}
            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t.logs}</h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 font-semibold text-gray-700">Source</th>
                          <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-4 font-semibold text-gray-700">Items Fetched</th>
                          <th className="px-6 py-4 font-semibold text-gray-700">Updates Made</th>
                          <th className="px-6 py-4 font-semibold text-gray-700">Duration</th>
                          <th className="px-6 py-4 font-semibold text-gray-700">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {scraperLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{log.source_name}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{log.messages_fetched || 0}</td>
                            <td className="px-6 py-4 text-gray-600">{log.updates_made || 0}</td>
                            <td className="px-6 py-4 text-gray-600">{log.duration_ms ? `${log.duration_ms}ms` : 'N/A'}</td>
                            <td className="px-6 py-4 text-gray-500 text-xs">{new Date(log.ran_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 4: ANALYTICS (Placeholder for future Payment/Chapa integration) */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t.analytics}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center h-64">
                    <BarChart3 className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">User Query Analytics</p>
                    <p className="text-xs text-gray-400 mt-1">(Chapa/Telebirr payment tracking coming soon)</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center h-64">
                    <Activity className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Service Usage Breakdown</p>
                    <p className="text-xs text-gray-400 mt-1">(Passport: 45%, Kebele: 30%, etc.)</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Helper Component for Stats
function StatCard({ title, value, icon: Icon, color, bg }: { title: string, value: string, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}