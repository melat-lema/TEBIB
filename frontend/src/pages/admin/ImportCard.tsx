import { useState } from 'react';
import { ClipboardPaste, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { Card, btn, inputCls, useServices } from './ui';

/** Paste text from an official page, PDF or notice. Facts are extracted, checked against the text, and sent to the review queue. */
export default function ImportCard({ goReview }: { goReview: () => void }) {
  const services = useServices();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [trust, setTrust] = useState('official');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await adminFetch('/import', { method: 'POST', body: { text, url, service_id: serviceId || null, trust_level: trust } });
      setResult(r);
      if (r.saved > 0) toast.success(`${r.saved} fact(s) are waiting in the Review queue.`);
      else toast.info('No new facts were created. See the details below.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 p-5">
      <div className="mb-1 flex items-center gap-2">
        <ClipboardPaste className="h-5 w-5 text-[#b08d57]" />
        <h2 className="font-semibold text-gray-900">Import from text</h2>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        The fastest way to add accurate information: copy the fee list, requirements or notice from the official page, PDF or office (Amharic or English), paste it here, and Tebib turns it into facts for you to review. Every fact must quote the text you pasted, so nothing is invented.
      </p>
      <textarea className={inputCls} rows={7} placeholder="Paste the text here…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <input className={inputCls} placeholder="Where it came from (link, optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select className={inputCls} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Service: detect automatically</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
        </select>
        <select className={inputCls} value={trust} onChange={(e) => setTrust(e.target.value)}>
          <option value="official">Official source</option>
          <option value="secondary">News or other secondary source</option>
        </select>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className={btn.primary} onClick={run} disabled={busy || text.trim().length < 40}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Extract facts
        </button>
        {result?.saved > 0 && <button className={btn.ghost} onClick={goReview}>Open Review queue</button>}
      </div>

      {result && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            Found {result.found} · saved for review <b>{result.saved}</b>
            {result.updates ? ` (${result.updates} change existing facts)` : ''} · duplicates {result.duplicates} · rejected {result.rejected}
            {result.outcome === 'unchanged' ? ' · this exact text was already imported' : ''}
            {result.failed ? ' · the AI was busy, try again in a minute' : ''}
          </p>
          {result.rejectedSamples?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {result.rejectedSamples.map((r: any, i: number) => (
                <li key={i}><span className="font-semibold text-red-700">{r.reason}:</span> {r.fact}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
