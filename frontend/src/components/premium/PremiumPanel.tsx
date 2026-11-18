import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MessageCircle, Crown, Check, Loader2, FileText, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import { premiumFetch } from '../../lib/premiumApi';

const copy = {
  en: {
    title: 'AI Assistant',
    freeTitle: 'Ask a question',
    freeText: 'Quick answers from verified information. Free, always.',
    freeCta: 'Open the chat',
    freePrompt: (n: string) => `Tell me what I need for: ${n}`,
    plus: 'Tebib Plus',
    plusText: (n: number) => `A monthly pass. Includes up to ${n} personal Application Packs a month, each built from verified facts only.`,
    perks: ['A checklist of what to bring, for your situation', 'Fees taken from verified sources, never guessed', 'Step-by-step plan for the office visit', 'A ready-to-fill application letter', 'Printable page, save it as PDF'],
    subscribe: (p: number) => `Get Plus · ${p} ETB / 30 days`,
    paying: 'Opening payment…',
    secure: 'Pay securely with Chapa. Payment methods (such as Telebirr, bank or card) are chosen on the Chapa page. This is a 30-day pass, not an automatic charge: renew whenever you like and the days are added.',
    active: (d: number) => `Plus is active · ${d} day${d === 1 ? '' : 's'} left`,
    packsLeft: (u: number, l: number) => `${u} of ${l} packs used`,
    renew: (p: number) => `Add 30 days · ${p} ETB`,
    situation: 'Your situation',
    situations: { new: 'First time', renewal: 'Renewal', lost_or_damaged: 'Lost or damaged', other: 'Something else' },
    urgency: 'How soon do you need it?',
    normal: 'Normal',
    urgent: 'Urgent',
    notes: 'Anything else we should know? (optional)',
    create: 'Create my pack',
    creating: 'Preparing your pack…',
    notReady: (f: number, m: number) => `Packs are not available for this service yet. We have ${f} of the ${m} verified facts needed to prepare a reliable one.`,
    off: 'Payments are being set up. Please check back soon.',
    myPacks: 'Your packs',
    none: 'No packs yet.',
    fail: 'Something went wrong.',
  },
  am: {
    title: 'የAI ረዳት',
    freeTitle: 'ጥያቄ ይጠይቁ',
    freeText: 'ከተረጋገጠ መረጃ ፈጣን መልሶች። ሁልጊዜ ነፃ።',
    freeCta: 'ውይይቱን ክፈት',
    freePrompt: (n: string) => `ስለ ${n} ምን ያስፈልገኛል?`,
    plus: 'ጠቢብ ፕላስ',
    plusText: (n: number) => `ወርሃዊ ማለፊያ። በወር እስከ ${n} የግል የማመልከቻ ጥቅሎችን ያካትታል፣ እያንዳንዱ ከተረጋገጡ መረጃዎች ብቻ የተዘጋጀ።`,
    perks: ['ለእርስዎ ሁኔታ የሚሆን ይዞ የሚሄዱት ዝርዝር', 'ከተረጋገጡ ምንጮች የተወሰዱ ክፍያዎች፣ በግምት አይደለም', 'ለቢሮ ጉብኝት ደረጃ በደረጃ እቅድ', 'ለመሙላት የተዘጋጀ የማመልከቻ ደብዳቤ', 'ሊታተም የሚችል ገጽ፣ እንደ PDF ያስቀምጡ'],
    subscribe: (p: number) => `ፕላስ ያግኙ · ${p} ብር / 30 ቀን`,
    paying: 'ክፍያ በመክፈት ላይ…',
    secure: 'በቻፓ በደህና ይክፈሉ። የክፍያ መንገዶች (ቴሌብር፣ ባንክ ወይም ካርድ) በቻፓ ገጽ ላይ ይመረጣሉ። ይህ የ30 ቀን ማለፊያ ነው፣ በራስ-ሰር የሚቆረጥ አይደለም፡ በፈለጉት ጊዜ ያድሱ፣ ቀኖቹ ይጨመራሉ።',
    active: (d: number) => `ፕላስ ንቁ ነው · ${d} ቀን ቀርቷል`,
    packsLeft: (u: number, l: number) => `${u} ከ${l} ጥቅሎች ተጠቅመዋል`,
    renew: (p: number) => `30 ቀን ጨምር · ${p} ብር`,
    situation: 'የእርስዎ ሁኔታ',
    situations: { new: 'የመጀመሪያ ጊዜ', renewal: 'እድሳት', lost_or_damaged: 'የጠፋ ወይም የተበላሸ', other: 'ሌላ' },
    urgency: 'ምን ያህል በፍጥነት ይፈልጉታል?',
    normal: 'መደበኛ',
    urgent: 'አስቸኳይ',
    notes: 'ሌላ ማወቅ ያለብን ነገር አለ? (አማራጭ)',
    create: 'ጥቅሌን አዘጋጅ',
    creating: 'ጥቅልዎን በማዘጋጀት ላይ…',
    notReady: (f: number, m: number) => `ለዚህ አገልግሎት ጥቅሎች ገና አይገኙም። አስተማማኝ ጥቅል ለማዘጋጀት ከሚያስፈልጉት ${m} የተረጋገጡ መረጃዎች ${f} አሉን።`,
    off: 'ክፍያ በመዘጋጀት ላይ ነው። እባክዎ በቅርቡ ይመለሱ።',
    myPacks: 'የእርስዎ ጥቅሎች',
    none: 'ገና ጥቅል የለም።',
    fail: 'የሆነ ስህተት ተፈጥሯል።',
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  service: { id: string; name_en: string; name_am: string };
  lang: 'en' | 'am';
}

export default function PremiumPanel({ open, onClose, service, lang }: Props) {
  const t = copy[lang];
  const navigate = useNavigate();
  const name = lang === 'am' ? service.name_am : service.name_en;

  const [config, setConfig] = useState<{ monthlyEtb: number; packsPerMonth: number; enabled: boolean } | null>(null);
  const [me, setMe] = useState<any>(null);
  const [elig, setElig] = useState<{ facts: number; minFacts: number; eligible: boolean } | null>(null);
  const [packs, setPacks] = useState<any[]>([]);
  const [situation, setSituation] = useState('new');
  const [urgency, setUrgency] = useState('normal');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'pay' | 'pack' | null>(null);

  useEffect(() => {
    if (!open) return;
    premiumFetch('/config').then(setConfig).catch(() => setConfig({ monthlyEtb: 0, packsPerMonth: 0, enabled: false }));
    premiumFetch('/me').then(setMe).catch(() => setMe({ plan: 'free' }));
    premiumFetch(`/eligibility/${service.id}`).then(setElig).catch(() => setElig(null));
    premiumFetch('/packs').then(setPacks).catch(() => setPacks([]));
  }, [open, service.id]);

  const freeChat = () => {
    onClose();
    setTimeout(() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { message: t.freePrompt(name), send: true } })), 150);
  };

  const subscribe = async () => {
    setBusy('pay');
    try {
      sessionStorage.setItem('tebib_return', window.location.pathname);
      const r = await premiumFetch('/checkout', { method: 'POST', body: {} });
      window.location.href = r.checkoutUrl;
    } catch (e: any) {
      toast.error(e.message || t.fail);
      setBusy(null);
    }
  };

  const createPack = async () => {
    setBusy('pack');
    try {
      const r = await premiumFetch('/packs', { method: 'POST', body: { serviceId: service.id, language: lang, answers: { situation, urgency, notes } } });
      onClose();
      navigate(`/premium/${r.packId}`);
    } catch (e: any) {
      toast.error(e.message || t.fail);
      setBusy(null);
    }
  };

  const active = me?.plan === 'plus';
  const choice = (selected: boolean) => `rounded-lg border px-3 py-2 text-sm transition ${selected ? 'border-[#b08d57] bg-[#b08d57]/10 font-semibold text-[#7a5d33]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28 }} className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-[#b08d57]">{t.title}</p>
                <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#b08d57]" /><h3 className="font-semibold text-gray-900">{t.freeTitle}</h3></div>
                <p className="mt-1 text-sm text-gray-600">{t.freeText}</p>
                <button onClick={freeChat} className="mt-4 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">{t.freeCta}</button>
              </div>

              <div className="rounded-2xl border-2 border-[#b08d57] bg-gradient-to-b from-[#b08d57]/10 to-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Crown className="h-5 w-5 text-[#b08d57]" /><h3 className="font-semibold text-gray-900">{t.plus}</h3></div>
                  {active && <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white">{t.active(me.daysLeft)}</span>}
                </div>

                {!config || !me ? (
                  <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-[#b08d57]" />
                ) : (
                  <>
                    <p className="mt-1 text-sm text-gray-600">{t.plusText(config.packsPerMonth)}</p>
                    <ul className="mt-3 space-y-1.5">
                      {t.perks.map((p) => (<li key={p} className="flex items-start gap-2 text-sm text-gray-700"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />{p}</li>))}
                    </ul>

                    {!config.enabled && !active ? (
                      <p className="mt-4 flex items-center gap-2 rounded-lg bg-gray-100 p-3 text-sm text-gray-600"><Lock className="h-4 w-4" />{t.off}</p>
                    ) : !active ? (
                      <div className="mt-5">
                        <button onClick={subscribe} disabled={busy !== null} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b08d57] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#8c6b42] disabled:opacity-60">
                          {busy === 'pay' ? <><Loader2 className="h-4 w-4 animate-spin" />{t.paying}</> : t.subscribe(config.monthlyEtb)}
                        </button>
                        <p className="mt-2 text-center text-[11px] leading-snug text-gray-500">{t.secure}</p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        <p className="text-xs font-medium text-gray-500">{t.packsLeft(me.packsUsed, me.packsLimit)}</p>
                        {!elig ? null : !elig.eligible ? (
                          <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />{t.notReady(elig.facts, elig.minFacts)}</p>
                        ) : (
                          <>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t.situation}</label>
                              <div className="grid grid-cols-2 gap-2">{Object.entries(t.situations).map(([k, v]) => (<button key={k} onClick={() => setSituation(k)} className={choice(situation === k)}>{v}</button>))}</div>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t.urgency}</label>
                              <div className="grid grid-cols-2 gap-2">{(['normal', 'urgent'] as const).map((k) => (<button key={k} onClick={() => setUrgency(k)} className={choice(urgency === k)}>{t[k]}</button>))}</div>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t.notes}</label>
                              <textarea value={notes} maxLength={300} rows={2} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/25" />
                            </div>
                            <button onClick={createPack} disabled={busy !== null || me.packsUsed >= me.packsLimit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b08d57] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#8c6b42] disabled:opacity-60">
                              {busy === 'pack' ? <><Loader2 className="h-4 w-4 animate-spin" />{t.creating}</> : t.create}
                            </button>
                          </>
                        )}
                        {config.enabled && <button onClick={subscribe} disabled={busy !== null} className="w-full text-center text-xs font-semibold text-[#8c6b42] hover:underline">{busy === 'pay' ? t.paying : t.renew(config.monthlyEtb)}</button>}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{t.myPacks}</h3>
                {packs.length === 0 ? (<p className="text-sm text-gray-400">{t.none}</p>) : (
                  <ul className="space-y-1.5">
                    {packs.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <Link to={`/premium/${p.id}`} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-[#b08d57]/50">
                          <FileText className="h-4 w-4 text-[#b08d57]" />
                          <span className="flex-1 truncate">{p.title || p.service?.name_en}</span>
                          <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
