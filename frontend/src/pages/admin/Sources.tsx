import { useCallback, useEffect, useState } from 'react';
import { Plus, Play, FlaskConical, Trash2, Loader2, Power, Link2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { useSearchParams } from 'react-router-dom';
import { Card, Chip, Empty, PageTitle, btn, inputCls, timeAgo, useServices } from './ui';
import ImportCard from './ImportCard';

const blank = { name: '', url: '', source_type: 'website', fetch_method: 'html', css_selector: '', service_id: '', trust_level: 'official', notes: '' };

export default function Sources() {
  const services = useServices();
  const [, setParams] = useSearchParams();
  const [sources, setSources] = useState<any[] | null>(null);
  const [form, setForm] = useState<typeof blank | null>(null);
  const [test, setTest] = useState<{ id: string; loading: boolean; result?: any } | null>(null);

  const load = useCallback(async () => {
    try {
      setSources(await adminFetch('/sources'));
    } catch (e: any) {
      toast.error(e.message);
      setSources([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      await adminFetch('/sources', { method: 'POST', body: form });
      toast.success('Source added (inactive). Test it, then switch it on.');
      setForm(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const patch = async (id: string, body: object) => {
    try {
      await adminFetch(`/sources/${id}`, { method: 'PATCH', body });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runTest = async (src: any) => {
    setTest({ id: src.id ?? 'new', loading: true });
    try {
      const result = await adminFetch('/sources/test', { method: 'POST', body: { url: src.url, source_type: src.source_type, fetch_method: src.fetch_method, css_selector: src.css_selector } });
      setTest({ id: src.id ?? 'new', loading: false, result });
    } catch (e: any) {
      setTest({ id: src.id ?? 'new', loading: false, result: { ok: false, error: e.message } });
    }
  };

  const [starterBusy, setStarterBusy] = useState(false);

  const loadStarter = async () => {
    setStarterBusy(true);
    try {
      const r = await adminFetch('/starter-facts', { method: 'POST' });
      toast.success(`${r.added} added to the Review queue${r.skipped ? `, ${r.skipped} were already there` : ''}.`);
      if (r.missingServices?.length) toast.warn(`No service named: ${r.missingServices.join(', ')}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setStarterBusy(false);
    }
  };

  const run = async (id: string) => {
    try {
      const r = await adminFetch('/scraper/run', { method: 'POST', body: { sourceId: id } });
      toast[r.started ? 'success' : 'info'](r.started ? 'Run started. The result appears on this card in a moment.' : r.reason);
      if (r.started) [6000, 20000, 45000].forEach((ms) => setTimeout(load, ms));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const TestResult = ({ id }: { id: string }) => {
    if (test?.id !== id) return null;
    if (test.loading) return <p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Fetching…</p>;
    const r = test.result;
    if (!r?.ok) return <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{r?.error ?? 'Test failed'}</p>;
    return (
      <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <p className="font-semibold text-gray-900">{r.itemCount} item(s) found</p>
        {r.hints?.map((h: string) => <p key={h} className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">{h}</p>)}
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {r.items.map((i: any) => (
            <li key={i.url} className="flex items-center gap-2 text-xs text-gray-700">
              <Chip tone={i.relevant ? 'green' : 'gray'}>{i.relevant ? 'relevant' : 'no keywords'}</Chip>
              <span className="truncate">{i.title || i.url}</span>
              <span className="ml-auto flex-shrink-0 text-gray-400">{i.words} words</span>
            </li>
          ))}
        </ul>
        {r.sample && (
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-[#8c6b42]">Show extracted text of the first item</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-xs text-gray-700">{r.sample}</pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <>
      <PageTitle title="Sources" hint="Add facts by pasting text below, or set up a source for the scraper to watch. Test a source first: if you can't see fees or requirements in its extracted text, the scraper won't find them either.">
        <button className={btn.primary} onClick={() => setForm(blank)}><Plus className="h-4 w-4" /> Add source</button>
      </PageTitle>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold text-gray-900">Starter facts</h2>
          <p className="text-sm text-gray-500">14 facts read from official pages (Fayda, Addis Ababa DVLCA, ICS, e-Trade). They go to the Review queue as pending: nothing is published until you approve it.</p>
        </div>
        <button className={btn.primary} onClick={loadStarter} disabled={starterBusy}>{starterBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading… about 15 seconds</> : 'Load starter facts'}</button>
      </Card>

      <ImportCard goReview={() => setParams({ tab: 'review' })} />

      {form && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-semibold text-gray-900">New source</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Name (e.g. ICS passport page)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <select className={inputCls} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value, fetch_method: e.target.value === 'telegram' ? 'telegram_preview' : 'html' })}>
              <option value="website">Website</option><option value="telegram">Telegram channel</option>
            </select>
            <select className={inputCls} value={form.fetch_method} onChange={(e) => setForm({ ...form, fetch_method: e.target.value })}>
              <option value="html">One HTML page</option><option value="html_index">Index page + every page it links to</option><option value="wordpress_api">WordPress API (JSON)</option><option value="telegram_preview">Telegram preview</option>
            </select>
            <input className={inputCls} placeholder="CSS selector (optional, HTML only)" value={form.css_selector} onChange={(e) => setForm({ ...form, css_selector: e.target.value })} />
            <select className={inputCls} value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
              <option value="">Service: detect automatically</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
            </select>
            <select className={inputCls} value={form.trust_level} onChange={(e) => setForm({ ...form, trust_level: e.target.value })}>
              <option value="official">Official (government)</option><option value="secondary">Secondary (news)</option>
            </select>
            <input className={inputCls} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <TestResult id="new" />
          <div className="mt-4 flex gap-2">
            <button className={btn.ghost} onClick={() => runTest(form)} disabled={!form.url}><FlaskConical className="h-4 w-4" /> Test without saving</button>
            <button className={btn.primary} onClick={create} disabled={!form.name || !form.url}>Save source</button>
            <button className={btn.ghost} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </Card>
      )}

      {!sources ? (
        <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-[#b08d57]" />
      ) : sources.length === 0 ? (
        <Card><Empty>No sources yet. Add the official page that lists fees or requirements for a service.</Empty></Card>
      ) : (
        <div className="space-y-4">
          {sources.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <Chip tone={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'active' : 'inactive'}</Chip>
                    <Chip>{s.fetch_method ?? s.source_type}</Chip>
                    {s.trust_level === 'secondary' && <Chip tone="red">news</Chip>}
                    {s.service_name && <Chip tone="blue">{s.service_name}</Chip>}
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 truncate text-xs text-[#8c6b42] hover:underline"><Link2 className="h-3 w-3" />{s.url}</a>
                  <p className="mt-1 text-xs text-gray-500">Checked {timeAgo(s.last_checked_at)} · content changed {timeAgo(s.last_changed_at)}</p>
                  {s.lastRun && (
                    <p className="mt-2 rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                      <b>Last run ({timeAgo(s.lastRun.ranAt)}):</b> {s.lastRun.status}. {s.lastRun.items} items read, <b>{s.lastRun.saved} new facts</b>
                      {s.lastRun.items > 0 && s.lastRun.saved === 0 ? ` — nothing new because: ${s.lastRun.unchanged} unchanged since the last run, ${s.lastRun.notRelevant} not relevant or too old, ${s.lastRun.duplicates} duplicates, ${s.lastRun.rejected} rejected by checks` : ''}.
                    </p>
                  )}
                  {s.last_error && <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">Last error: {s.last_error}</p>}
                  {s.notes && <p className="mt-1 text-xs italic text-gray-500">{s.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btn.ghost} onClick={() => runTest(s)}><FlaskConical className="h-4 w-4" /> Test</button>
                  <button className={btn.ghost} onClick={() => run(s.id)}><Play className="h-4 w-4" /> Run</button>
                  <button className={s.is_active ? btn.ghost : btn.good} onClick={() => patch(s.id, { is_active: !s.is_active })}><Power className="h-4 w-4" /> {s.is_active ? 'Turn off' : 'Turn on'}</button>
                  <select className={`${inputCls} w-auto`} value={s.service_id ?? ''} onChange={(e) => patch(s.id, { service_id: e.target.value || null })} title="Service for facts from this source">
                    <option value="">Auto service</option>
                    {services.map((x) => <option key={x.id} value={x.id}>{x.name_en}</option>)}
                  </select>
                  <button className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => window.confirm(`Delete "${s.name}"?`) && adminFetch(`/sources/${s.id}`, { method: 'DELETE' }).then(load)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <TestResult id={s.id} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
