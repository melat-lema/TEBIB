import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, Database, Globe2, Activity, BarChart3, LogOut, Menu, X, ExternalLink, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { adminFetch, adminLogout } from '../lib/adminApi';
import Overview from './admin/Overview';
import Review from './admin/Review';
import KnowledgeBase from './admin/KnowledgeBase';
import Sources from './admin/Sources';
import Logs from './admin/Logs';
import Analytics from './admin/Analytics';
import Diagnostics from './admin/Diagnostics';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'review', label: 'Review queue', Icon: ClipboardCheck },
  { id: 'knowledge', label: 'Knowledge base', Icon: Database },
  { id: 'sources', label: 'Sources', Icon: Globe2 },
  { id: 'logs', label: 'Scraper logs', Icon: Activity },
  { id: 'analytics', label: 'Usage & revenue', Icon: BarChart3 },
  { id: 'diagnostics', label: 'System check', Icon: Stethoscope },
] as const;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'overview') as (typeof TABS)[number]['id'];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [scraper, setScraper] = useState<any>(null);
  const wasRunning = useRef(false);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser') ?? '{}');
    } catch {
      return {};
    }
  })();

  const go = (id: string) => {
    setParams({ tab: id });
    setOpen(false);
  };

  // pending badge in the sidebar
  useEffect(() => {
    adminFetch('/stats').then((s) => setPending(s.knowledge.pending)).catch(() => undefined);
  }, [tab]);

  // Live scraper progress: polls a tiny endpoint every 3 seconds and announces when a run finishes
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await adminFetch('/scraper/status');
        if (!alive) return;
        setScraper(s);
        if (wasRunning.current && !s.running && s.lastFinished) {
          toast.success(`Scraper finished in ${s.lastFinished.seconds}s: ${s.lastFinished.saved} new fact${s.lastFinished.saved === 1 ? '' : 's'} from ${s.lastFinished.sources} source${s.lastFinished.sources === 1 ? '' : 's'}.`, { autoClose: 9000 });
          adminFetch('/stats').then((st) => setPending(st.knowledge.pending)).catch(() => undefined);
        }
        wasRunning.current = !!s.running;
      } catch {
        /* the next tick tries again */
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut().catch(() => undefined);
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f4f4f5]">
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#1d1a16] text-gray-300 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#b08d57] text-sm font-extrabold text-white">ጠ</span>
            <span className="font-bold text-white">Tebib <span className="font-normal text-[#e6cfa0]">Admin</span></span>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab === id ? 'bg-[#b08d57] text-white' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'review' && !!pending && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#8c6b42]">{pending}</span>}
            </button>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <a href="/dashboard" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 hover:text-white">
            <ExternalLink className="h-[18px] w-[18px]" /> View site
          </a>
          <div className="px-3 pb-1 pt-2 text-xs text-gray-500">{user.email}</div>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">
            <LogOut className="h-[18px] w-[18px]" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6 text-gray-700" /></button>
          <span className="ml-3 font-semibold text-gray-900">{TABS.find((t) => t.id === tab)?.label}</span>
        </header>

        {scraper?.running && (
          <div className="border-b border-[#b08d57]/30 bg-[#b08d57]/10 px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#5c4524]">
              <span className="font-semibold">Scraper running · {scraper.sourceName || 'starting…'}</span>
              <span>
                source {Math.min(scraper.sourcesDone + 1, scraper.sourcesTotal || 1)} of {scraper.sourcesTotal || '…'}
                {scraper.itemsTotal ? ` · page ${scraper.itemsDone}/${scraper.itemsTotal}` : ''} · {scraper.elapsedSec}s
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#b08d57]/20">
              <div className="h-full rounded-full bg-[#b08d57] transition-all duration-700" style={{ width: `${Math.min(100, Math.round(((scraper.sourcesDone + (scraper.itemsTotal ? scraper.itemsDone / scraper.itemsTotal : 0)) / (scraper.sourcesTotal || 1)) * 100))}%` }} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {tab === 'overview' && <Overview goTo={go} />}
          {tab === 'review' && <Review />}
          {tab === 'knowledge' && <KnowledgeBase />}
          {tab === 'sources' && <Sources />}
          {tab === 'logs' && <Logs />}
          {tab === 'analytics' && <Analytics />}
          {tab === 'diagnostics' && <Diagnostics />}
        </main>
      </div>
    </div>
  );
}
