import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, Search, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { Card, Chip, Empty, PageTitle, btn, inputCls, statusTone, timeAgo, useServices, CATEGORY_OPTIONS } from './ui';

type Draft = { id?: string; chunk_text: string; chunk_text_am: string; service_id: string; category: string };
const blank: Draft = { chunk_text: '', chunk_text_am: '', service_id: '', category: 'fee' };

export default function KnowledgeBase() {
  const services = useServices();
  const [status, setStatus] = useState('approved');
  const [serviceId, setServiceId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: any[]; total: number; pageSize: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setData(null);
    const qs = new URLSearchParams({ status, page: String(page), ...(serviceId ? { serviceId } : {}), ...(q ? { q } : {}) });
    try {
      setData(await adminFetch(`/knowledge?${qs}`));
    } catch (e: any) {
      toast.error(e.message);
      setData({ rows: [], total: 0, pageSize: 25 });
    }
  }, [status, serviceId, q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0); // debounce typing
    return () => clearTimeout(t);
  }, [load, q]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const body = { chunk_text: draft.chunk_text, chunk_text_am: draft.chunk_text_am, service_id: draft.service_id || null, category: draft.category };
      if (draft.id) await adminFetch(`/knowledge/${draft.id}`, { method: 'PATCH', body });
      else await adminFetch('/knowledge', { method: 'POST', body });
      toast.success(draft.id ? 'Saved' : 'Added and published');
      setDraft(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const setRowStatus = async (id: string, action: 'archive' | 'restore') => {
    try {
      await adminFetch(`/knowledge/${id}/${action}`, { method: 'POST' });
      toast.success(action === 'archive' ? 'Archived. It no longer appears for users.' : 'Restored and published.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageTitle title="Knowledge base" hint="Everything the chatbot and service pages can say. Editing re-indexes the fact for search.">
        <button className={btn.primary} onClick={() => setDraft(blank)}><Plus className="h-4 w-4" /> Add fact</button>
      </PageTitle>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search text…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {['approved', 'pending', 'rejected', 'archived'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={serviceId} onChange={(e) => { setServiceId(e.target.value); setPage(1); }}>
          <option value="">All services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
        </select>
      </Card>

      <Card className="overflow-hidden">
        {!data ? (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-[#b08d57]" />
        ) : data.rows.length === 0 ? (
          <Empty>No facts match these filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr><th className="px-4 py-3">Fact</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50">
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-3 text-gray-900">{r.chunk_text}</p>
                      <div className="mt-1 flex gap-1">{r.category && <Chip>{r.category}</Chip>}{!r.chunk_text_am && <Chip tone="amber">no Amharic</Chip>}{/UNVERIFIED/i.test(r.source_details ?? '') && <Chip tone="red">unverified</Chip>}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.service_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500"><Chip tone={statusTone(r.status)}>{r.status}</Chip><div className="mt-1 max-w-[12rem] truncate">{r.source_details}</div></td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{timeAgo(r.last_verified_at ?? r.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#8c6b42]" title="Edit" onClick={() => setDraft({ id: r.id, chunk_text: r.chunk_text, chunk_text_am: r.chunk_text_am ?? '', service_id: r.service_id ?? '', category: r.category ?? 'other' })}><Pencil className="h-4 w-4" /></button>
                      {r.status === 'approved' ? (
                        <button className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Archive" onClick={() => window.confirm('Archive this fact? Users will stop seeing it.') && setRowStatus(r.id, 'archive')}><Archive className="h-4 w-4" /></button>
                      ) : r.status === 'archived' ? (
                        <button className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600" title="Restore" onClick={() => setRowStatus(r.id, 'restore')}><RotateCcw className="h-4 w-4" /></button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <span>{data.total} facts</span>
            <div className="flex items-center gap-2">
              <button className={btn.ghost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>{page} / {pages}</span>
              <button className={btn.ghost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </Card>

      {draft && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setDraft(null)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{draft.id ? 'Edit fact' : 'Add fact'}</h2>
              <button onClick={() => setDraft(null)} aria-label="Close"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">English (one clear fact, name the service in the sentence)</label>
            <textarea className={inputCls} rows={3} value={draft.chunk_text} onChange={(e) => setDraft({ ...draft, chunk_text: e.target.value })} />
            <label className="mb-1 mt-4 block text-xs font-semibold text-gray-600">Amharic</label>
            <textarea className={inputCls} rows={3} value={draft.chunk_text_am} onChange={(e) => setDraft({ ...draft, chunk_text_am: e.target.value })} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select className={inputCls} value={draft.service_id} onChange={(e) => setDraft({ ...draft, service_id: e.target.value })}>
                <option value="">No service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
              </select>
              <select className={inputCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className={btn.ghost} onClick={() => setDraft(null)}>Cancel</button>
              <button className={btn.primary} onClick={save} disabled={saving || !draft.chunk_text.trim()}>{saving ? 'Saving…' : draft.id ? 'Save changes' : 'Add and publish'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
