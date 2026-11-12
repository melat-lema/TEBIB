import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle2, RefreshCw, Activity, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { Card, Chip, PageTitle, Bars, btn, timeAgo } from './ui';

export default function Overview({ goTo }: { goTo: (tab: string) => void }) {
  const [s, setS] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(() => adminFetch('/stats').then(setS).catch((e) => toast.error(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const runAll = async () => {
    setRunning(true);
    try {
      const r = await adminFetch('/scraper/run', { method: 'POST', body: {} });
      toast[r.started ? 'success' : 'info'](r.started ? 'Scraper started. Results appear in Scraper logs and the Review queue.' : r.reason);
      setTimeout(load, 4000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  if (!s) return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin text-[#b08d57]" />;

  const k = s.knowledge;
  const attention: Array<{ tone: 'amber' | 'red'; text: string; tab: string }> = [];
  if (k.pending > 0) attention.push({ tone: 'amber', text: `${k.pending} facts waiting for review${k.updatesPending ? ` (${k.updatesPending} change an existing fact)` : ''}`, tab: 'review' });
  if (s.scraper.sources.failing > 0) attention.push({ tone: 'red', text: `${s.scraper.sources.failing} active source(s) failed on their last run`, tab: 'sources' });
  if (s.scraper.sources.active === 0) attention.push({ tone: 'red', text: 'No active sources. The scraper has nothing to check.', tab: 'sources' });
  for (const c of s.coverage) {
    if (c.facts === 0) attention.push({ tone: 'red', text: `${c.name} has no verified facts`, tab: 'knowledge' });
    else if (c.lastVerified && Date.now() - new Date(c.lastVerified).getTime() > 60 * 86_400_000) attention.push({ tone: 'amber', text: `${c.name} was last verified ${timeAgo(c.lastVerified)}`, tab: 'knowledge' });
  }

  const stat = (label: string, value: string | number, Icon: any, tone: string, tab: string, sub?: string) => (
    <button onClick={() => goTo(tab)} className="text-left">
      <Card className="p-5 transition hover:border-[#b08d57]/50 hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
        </div>
        <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      </Card>
    </button>
  );

  return (
    <>
      <PageTitle title="Overview" hint="What needs your attention, and how the scraper is doing.">
        <button className={btn.ghost} onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
        <button className={btn.primary} onClick={runAll} disabled={running}><Play className="h-4 w-4" /> Run scraper now</button>
      </PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat('Awaiting review', k.pending, ClipboardCheck, 'bg-amber-100 text-amber-700', 'review', s.oldestPending ? `Oldest: ${timeAgo(s.oldestPending)}` : 'Queue is empty')}
        {stat('Published facts', k.approved, CheckCircle2, 'bg-green-100 text-green-700', 'knowledge', `${k.rejected} rejected · ${k.archived} archived`)}
        {stat('Scraper success', s.scraper.successRate === null ? '—' : `${s.scraper.successRate}%`, Activity, 'bg-blue-100 text-blue-700', 'logs', `${s.scraper.runs} runs in 14 days · last ${timeAgo(s.scraper.lastRun)}`)}
        {stat('Active sources', `${s.scraper.sources.active}/${s.scraper.sources.total}`, RefreshCw, 'bg-[#b08d57]/15 text-[#7a5d33]', 'sources', s.scraper.sources.failing ? `${s.scraper.sources.failing} failing` : 'All healthy')}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-gray-900">New facts found per day</h2>
          <Bars data={s.scraper.factsPerDay} valueKey="facts" label="facts" />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing urgent.</p>
          ) : (
            <ul className="space-y-2">
              {attention.slice(0, 7).map((a, i) => (
                <li key={i}>
                  <button onClick={() => goTo(a.tab)} className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm text-gray-700 transition hover:bg-gray-50">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${a.tone === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
                    {a.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-900">Coverage by service</h2></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="px-5 py-2.5">Service</th><th className="px-5 py-2.5">Verified facts</th><th className="px-5 py-2.5">Last verified</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {s.coverage.map((c: any) => (
              <tr key={c.id}>
                <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-5 py-3">{c.facts === 0 ? <Chip tone="red">none</Chip> : c.facts}</td>
                <td className="px-5 py-3 text-gray-600">{timeAgo(c.lastVerified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
