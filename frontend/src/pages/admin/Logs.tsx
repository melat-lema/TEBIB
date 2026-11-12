import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { Card, Chip, Empty, PageTitle, btn, statusTone } from './ui';

const OUTCOME_TONE: Record<string, string> = { saved: 'green', no_facts: 'gray', unchanged: 'gray', not_relevant: 'gray', failed: 'red' };

export default function Logs() {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLogs(await adminFetch('/scraper-logs?limit=40'));
    } catch (e: any) {
      toast.error(e.message);
      setLogs([]);
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // picks up a run you just started
    return () => clearInterval(id);
  }, [load]);

  if (!logs) return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin text-[#b08d57]" />;

  return (
    <>
      <PageTitle title="Scraper logs" hint="Open a row to see what happened to each page or message, and why facts were rejected.">
        <button className={btn.ghost} onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
      </PageTitle>

      <Card className="overflow-hidden">
        {logs.length === 0 ? (
          <Empty>No runs yet. Start one from Overview or Sources.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr><th className="w-8 px-3 py-3" /><th className="px-3 py-3">Source</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">New facts</th><th className="px-3 py-3">Rejected</th><th className="px-3 py-3">Time</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const d = l.details ?? {};
                const isOpen = open === l.id;
                return (
                  <Fragment key={l.id}>
                    <tr className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => setOpen(isOpen ? null : l.id)}>
                      <td className="px-3 py-3 text-gray-400">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      <td className="px-3 py-3 font-medium text-gray-900">{l.source_name}</td>
                      <td className="px-3 py-3"><Chip tone={statusTone(l.status)}>{l.status}</Chip></td>
                      <td className="px-3 py-3 text-gray-600">{l.messages_fetched ?? 0}</td>
                      <td className="px-3 py-3 text-gray-600">{l.updates_made ?? 0}{d.updates ? <span className="text-xs text-amber-700"> ({d.updates} changes)</span> : null}</td>
                      <td className="px-3 py-3 text-gray-600">{d.rejected ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">{new Date(l.ran_at).toLocaleString()}{l.duration_ms ? ` · ${(l.duration_ms / 1000).toFixed(1)}s` : ''}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="space-y-4 px-6 py-4 text-sm">
                          {l.error_message && <p className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{l.error_message}</p>}
                          <p className="text-xs text-gray-500">Unchanged since last run: {d.unchanged ?? 0} · skipped as not relevant: {d.not_relevant ?? 0} · duplicates: {d.duplicates ?? 0} · extraction failures: {l.items_failed ?? 0}</p>

                          {!!d.rejected_samples?.length && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-700">Why facts were rejected (samples)</p>
                              <ul className="space-y-1">
                                {d.rejected_samples.map((r: any, i: number) => (
                                  <li key={i} className="rounded border border-gray-200 bg-white p-2 text-xs"><Chip tone="red">{r.reason}</Chip> <span className="text-gray-800">{r.fact}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {!!d.trace?.length && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-700">Items</p>
                              <ul className="max-h-64 space-y-1 overflow-y-auto">
                                {d.trace.map((t: any, i: number) => (
                                  <li key={i} className="flex items-center gap-2 text-xs">
                                    <Chip tone={OUTCOME_TONE[t.outcome] ?? 'gray'}>{t.outcome.replace('_', ' ')}</Chip>
                                    <a href={t.url} target="_blank" rel="noreferrer" className="truncate text-gray-700 hover:underline">{t.title || t.url}</a>
                                    <span className="ml-auto flex-shrink-0 text-gray-400">{t.chars} chars · {t.found} found · {t.saved} saved</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
