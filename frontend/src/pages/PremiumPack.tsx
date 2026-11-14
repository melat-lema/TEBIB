import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Copy, Loader2, Printer, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { premiumFetch } from '../lib/premiumApi';
import '../styles/landing.css';

const L = {
  en: { back: 'Back', print: 'Print or save as PDF', summary: 'Summary', checklist: 'What to bring', fees: 'Fees', total: 'Estimated total', steps: 'Your steps', tips: 'Tips', missing: 'Confirm with the office', letter: 'Application letter', copy: 'Copy letter', copied: 'Copied', sources: 'Based on these verified facts', note: 'Prepared by Tebib from verified information. Rules and fees can change, so confirm with the office before you go.', loading: 'Loading your pack…' },
  am: { back: 'ተመለስ', print: 'አትም ወይም እንደ PDF አስቀምጥ', summary: 'ማጠቃለያ', checklist: 'ይዘው የሚሄዱት', fees: 'ክፍያዎች', total: 'ግምታዊ ጠቅላላ', steps: 'ደረጃዎችዎ', tips: 'ምክሮች', missing: 'ከመስሪያ ቤቱ ጋር ያረጋግጡ', letter: 'የማመልከቻ ደብዳቤ', copy: 'ደብዳቤውን ቅዳ', copied: 'ተቀድቷል', sources: 'በእነዚህ የተረጋገጡ መረጃዎች ላይ የተመሰረተ', note: 'በጠቢብ ከተረጋገጠ መረጃ የተዘጋጀ። ደንቦች እና ክፍያዎች ሊቀየሩ ይችላሉ፣ ከመሄድዎ በፊት ከመስሪያ ቤቱ ያረጋግጡ።', loading: 'ጥቅልዎን በመጫን ላይ…' },
};

export default function PremiumPack() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    premiumFetch(`/packs/${id}`).then(setPack).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5] p-6 text-center text-gray-600">{error}</div>;
  if (!pack) return <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5]"><Loader2 className="h-8 w-8 animate-spin text-[#b08d57]" /></div>;

  const t = L[pack.language === 'am' ? 'am' : 'en'];
  const c = pack.content;
  const copyLetter = async () => {
    await navigator.clipboard.writeText(`${c.letter.subject}\n\n${c.letter.body}`).catch(() => toast.error('Could not copy'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="break-inside-avoid rounded-2xl border border-gray-200 bg-white p-6 print:rounded-none print:border-0 print:border-b print:p-0 print:py-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="tb-font min-h-screen bg-[#f4f4f5] pb-16 print:bg-white">
      <div className="mx-auto max-w-3xl px-4 pt-6 print:px-0">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#b08d57]"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#b08d57] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8c6b42]"><Printer className="h-4 w-4" />{t.print}</button>
        </div>

        <header className="mb-5 rounded-2xl bg-[#1d1a16] p-7 text-white print:rounded-none print:bg-white print:p-0 print:text-black">
          <p className="text-xs font-semibold text-[#e6cfa0] print:text-[#8c6b42]">Tebib · {pack.services?.name_en}</p>
          <h1 className="mt-2 text-2xl font-semibold">{c.title}</h1>
          <p className="mt-1 text-xs text-gray-400 print:text-gray-500">{new Date(pack.created_at).toLocaleDateString()}</p>
        </header>

        <div className="space-y-4">
          {c.summary && <Section title={t.summary}><p className="leading-relaxed text-gray-700">{c.summary}</p></Section>}

          {c.checklist.length > 0 && (
            <Section title={t.checklist}>
              <ul className="space-y-2.5">
                {c.checklist.map((i: any, k: number) => (
                  <li key={k} className="flex items-start gap-3"><span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#b08d57]"><Check className="h-3.5 w-3.5 text-transparent" /></span><span><span className="font-medium text-gray-900">{i.item}</span>{i.note && <span className="block text-sm text-gray-500">{i.note}</span>}</span></li>
                ))}
              </ul>
            </Section>
          )}

          {c.fees.length > 0 && (
            <Section title={t.fees}>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-100">
                  {c.fees.map((f: any, k: number) => (
                    <tr key={k}><td className="py-2 pr-4 text-gray-800">{f.label}{f.note && <span className="block text-xs text-gray-500">{f.note}</span>}</td><td className="whitespace-nowrap py-2 text-right font-semibold text-gray-900">{f.amount}</td></tr>
                  ))}
                  {c.total_estimate && <tr><td className="py-2 font-semibold text-gray-900">{t.total}</td><td className="py-2 text-right text-base font-bold text-[#8c6b42]">{c.total_estimate}</td></tr>}
                </tbody>
              </table>
            </Section>
          )}

          {c.steps.length > 0 && (
            <Section title={t.steps}>
              <ol className="space-y-4">
                {c.steps.map((s: any, k: number) => (
                  <li key={k} className="flex gap-3"><span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#b08d57] text-sm font-bold text-white print:border print:border-[#b08d57] print:bg-white print:text-[#8c6b42]">{k + 1}</span><div><p className="font-medium text-gray-900">{s.title}</p><p className="text-sm leading-relaxed text-gray-600">{s.detail}</p></div></li>
                ))}
              </ol>
            </Section>
          )}

          {c.tips.length > 0 && <Section title={t.tips}><ul className="list-disc space-y-1.5 pl-5 text-gray-700">{c.tips.map((x: string, k: number) => <li key={k}>{x}</li>)}</ul></Section>}

          {c.missing.length > 0 && (
            <section className="break-inside-avoid rounded-2xl border border-amber-200 bg-amber-50 p-6 print:rounded-none">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-amber-900"><AlertTriangle className="h-5 w-5" />{t.missing}</h2>
              <ul className="list-disc space-y-1 pl-5 text-amber-900">{c.missing.map((x: string, k: number) => <li key={k}>{x}</li>)}</ul>
            </section>
          )}

          {c.letter?.body && (
            <Section title={t.letter}>
              <p className="font-semibold text-gray-900">{c.letter.subject}</p>
              <pre className="font-ethiopic mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 print:bg-white print:p-0">{c.letter.body}</pre>
              <button onClick={copyLetter} className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#8c6b42] hover:underline print:hidden"><Copy className="h-4 w-4" />{copied ? t.copied : t.copy}</button>
            </Section>
          )}

          <Section title={t.sources}>
            <ul className="space-y-2 text-xs text-gray-600">
              {c.sources.map((s: any, k: number) => (
                <li key={k} className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" /><span>{s.text}{s.verifiedAt ? ` · ${new Date(s.verifiedAt).toLocaleDateString()}` : ''}{s.url && <> · <a href={s.url} target="_blank" rel="noreferrer" className="text-[#8c6b42] underline print:hidden">link</a></>}</span></li>
              ))}
            </ul>
          </Section>

          <p className="px-1 text-center text-xs text-gray-500">{t.note}</p>
        </div>
      </div>
    </div>
  );
}
