import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, ExternalLink, Loader2, RefreshCw, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { Card, Chip, Empty, PageTitle, btn, inputCls, timeAgo, useServices, CATEGORY_OPTIONS } from './ui';

type Filter = 'all' | 'updates' | 'new';

export default function Review() {
  const services = useServices();
  const [items, setItems] = useState<any[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [edit, setEdit] = useState({ chunk_text: '', chunk_text_am: '', service_id: '', category: '' });
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setItems(await adminFetch('/pending'));
    } catch (e: any) {
      setLoadError(e.message);
      setItems([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (items ?? []).filter((i) => (filter === 'all' ? true : filter === 'updates' ? !!i.supersedes_id : !i.supersedes_id)),
    [items, filter],
  );
  const current = visible.find((i) => i.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (current) setEdit({ chunk_text: current.chunk_text ?? '', chunk_text_am: current.chunk_text_am ?? '', service_id: current.service_id ?? '', category: current.category ?? 'other' });
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = (id: string) => {
    const idx = visible.findIndex((i) => i.id === id);
    const next = visible[idx + 1] ?? visible[idx - 1] ?? null;
    setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
    setChecked((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    setSelectedId(next?.id ?? null);
  };

  const decide = useCallback(
    async (action: 'approve' | 'reject') => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const changed: Record<string, any> = {};
        if (edit.chunk_text !== (current.chunk_text ?? '')) changed.chunk_text = edit.chunk_text;
        if (edit.chunk_text_am !== (current.chunk_text_am ?? '')) changed.chunk_text_am = edit.chunk_text_am;
        if (edit.service_id !== (current.service_id ?? '')) changed.service_id = edit.service_id || null;
        if (edit.category !== (current.category ?? 'other')) changed.category = edit.category;

        await adminFetch(`/${action}/${current.id}`, { method: 'POST', body: action === 'approve' && Object.keys(changed).length ? { edits: changed } : {} });
        toast.success(action === 'approve' ? (current.supersedes_id ? 'Approved. The old fact was archived.' : 'Approved and published.') : 'Rejected.');
        advance(current.id);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy(false);
      }
    },
    [current, edit, busy], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // keyboard: j/k move, a approve, r reject (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || e.metaKey || e.ctrlKey) return;
      const idx = visible.findIndex((i) => i.id === current?.id);
      if (e.key === 'j' && visible[idx + 1]) setSelectedId(visible[idx + 1].id);
      if (e.key === 'k' && visible[idx - 1]) setSelectedId(visible[idx - 1].id);
      if (e.key === 'a') decide('approve');
      if (e.key === 'r') decide('reject');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, current, decide]);

  const bulk = async (action: 'approve' | 'reject') => {
    const ids = [...checked];
    if (!ids.length || !window.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} ${ids.length} selected facts without editing?`)) return;
    setBusy(true);
    try {
      const r = await adminFetch('/bulk', { method: 'POST', body: { action, ids } });
      toast.success(`${r.done} done${r.failed.length ? `, ${r.failed.length} failed` : ''}`);
      setChecked(new Set());
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!items) return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin text-[#b08d57]" />;

  const evidence: string | undefined = current?.metadata?.evidence;

  return (
    <>
      <PageTitle title="Review queue" hint="Compare each fact with its source quote. You can edit before approving. Keys: j/k move, a approve, r reject.">
        <button className={btn.ghost} onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
      </PageTitle>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['all', 'updates', 'new'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? 'bg-[#b08d57] text-white' : 'border border-gray-300 bg-white text-gray-600'}`}>
            {f === 'all' ? `All (${items.length})` : f === 'updates' ? `Changes to published facts (${items.filter((i) => i.supersedes_id).length})` : `New (${items.filter((i) => !i.supersedes_id).length})`}
          </button>
        ))}
        {checked.size > 0 && (
          <span className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">{checked.size} selected</span>
            <button className={btn.good} onClick={() => bulk('approve')} disabled={busy}>Approve</button>
            <button className={btn.danger} onClick={() => bulk('reject')} disabled={busy}>Reject</button>
          </span>
        )}
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <b>The review queue could not be loaded.</b> The sidebar counts items separately, so a number there with an empty list means this request failed. Error: {loadError}
        </div>
      )}
      {items.some((i) => i._legacy) && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Some database columns are missing, so the review screen is in basic mode (no categories or "changes a fact" comparison). Run <code className="rounded bg-white px-1">sql/01_migration.sql</code> in the Supabase SQL Editor, then refresh.
        </div>
      )}

      {visible.length === 0 && !loadError ? (
        <Card><Empty>Nothing to review. New facts appear here after the scraper runs.</Empty></Card>
      ) : visible.length === 0 ? null : (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Card className="max-h-[calc(100vh-15rem)] overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {visible.map((i) => (
                <li key={i.id} className={`flex gap-2 p-3 ${current?.id === i.id ? 'bg-[#b08d57]/10' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" className="mt-1 accent-[#b08d57]" checked={checked.has(i.id)} onChange={(e) => setChecked((p) => { const n = new Set(p); e.target.checked ? n.add(i.id) : n.delete(i.id); return n; })} aria-label="Select" />
                  <button onClick={() => setSelectedId(i.id)} className="min-w-0 flex-1 text-left">
                    <div className="mb-1 flex flex-wrap gap-1">
                      <Chip tone="blue">{i.service_name ?? 'No service'}</Chip>
                      {i.category && <Chip>{i.category}</Chip>}
                      {i.supersedes_id && <Chip tone="amber">changes a fact</Chip>}
                      {i.trust_level === 'secondary' && <Chip tone="red">news source</Chip>}
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-800">{i.chunk_text}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{i.source_details} · {timeAgo(i.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {current && (
            <Card className="p-5">
              {current.trust_level === 'secondary' && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /> This came from a news source. Confirm it on the official website before approving.
                </div>
              )}

              {current.supersedes && (
                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900"><ArrowRightLeft className="h-4 w-4" /> Approving replaces this published fact</p>
                  <p className="text-sm text-gray-800"><span className="font-semibold text-gray-500">Published now: </span>{current.supersedes.chunk_text}</p>
                  <p className="mt-1 text-xs text-gray-500">Verified {timeAgo(current.supersedes.last_verified_at)} · similarity {current.metadata?.similar_score ? Number(current.metadata.similar_score).toFixed(2) : '—'}</p>
                </div>
              )}

              <label className="mb-1 block text-xs font-semibold text-gray-600">Fact (English)</label>
              <textarea className={inputCls} rows={3} value={edit.chunk_text} onChange={(e) => setEdit({ ...edit, chunk_text: e.target.value })} />

              <label className="mb-1 mt-4 block text-xs font-semibold text-gray-600">Fact (Amharic). Please have a native speaker check this.</label>
              <textarea className={`${inputCls} font-medium`} rows={3} value={edit.chunk_text_am} onChange={(e) => setEdit({ ...edit, chunk_text_am: e.target.value })} />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Service</label>
                  <select className={inputCls} value={edit.service_id} onChange={(e) => setEdit({ ...edit, service_id: e.target.value })}>
                    <option value="">No service (chat only)</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
                  <select className={inputCls} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold text-gray-500">Quote from the source</p>
                <p className="border-l-2 border-[#b08d57] pl-3 text-sm italic text-gray-700">{evidence ? `“${evidence}”` : 'No quote stored'}</p>
                {current.metadata?.note && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">Note: {current.metadata.note}</p>}
                {current.metadata?.kind === 'starter' && <p className="mt-2 text-xs text-gray-500">Read from the official page on {current.metadata.verified_on} and summarised. Open the source link to double-check before approving.</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{current.source_details}</span>
                  {current.metadata?.effective_date && <span>Effective: {current.metadata.effective_date}</span>}
                  {current.source_url && (
                    <a href={current.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#8c6b42] hover:underline"><ExternalLink className="h-3 w-3" /> Open source</a>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button className={btn.good} onClick={() => decide('approve')} disabled={busy}><Check className="h-4 w-4" /> {current.supersedes_id ? 'Approve and replace' : 'Approve'}</button>
                <button className={btn.danger} onClick={() => decide('reject')} disabled={busy}><X className="h-4 w-4" /> Reject</button>
                {busy && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
