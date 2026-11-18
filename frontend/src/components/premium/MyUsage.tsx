import { useEffect, useState } from 'react';
import { BarChart3, Crown, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { premiumFetch } from '../../lib/premiumApi';

/** The user's own numbers: plan, questions asked, packs used. */
export default function MyUsage({ lang }: { lang: 'en' | 'am' }) {
  const [me, setMe] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    premiumFetch('/me').then(setMe).catch(() => setMe(null));
    premiumFetch('/config').then(setConfig).catch(() => undefined);
  }, []);

  if (!me) return null;
  const am = lang === 'am';
  const t = {
    title: am ? 'የእርስዎ አጠቃቀም' : 'Your usage',
    plan: am ? 'እቅድ' : 'Plan',
    free: am ? 'ነፃ' : 'Free',
    plus: am ? 'ጠቢብ ፕላስ' : 'Tebib Plus',
    left: (d: number) => (am ? `${d} ቀን ቀርቷል` : `${d} day${d === 1 ? '' : 's'} left`),
    qMonth: am ? 'ጥያቄዎች በዚህ ወር' : 'Questions this month',
    qAll: am ? 'ጠቅላላ ጥያቄዎች' : 'Questions in total',
    packs: am ? 'ጥቅሎች በዚህ ማለፊያ' : 'Packs this pass',
    get: (p: number) => (am ? `ፕላስ ያግኙ · ${p} ብር / 30 ቀን` : `Get Plus · ${p} ETB / 30 days`),
    renew: am ? '30 ቀን ጨምር' : 'Add 30 days',
  };

  const subscribe = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem('tebib_return', '/dashboard');
      const r = await premiumFetch('/checkout', { method: 'POST', body: {} });
      window.location.href = r.checkoutUrl;
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  const plus = me.plan === 'plus';
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900"><BarChart3 className="h-4 w-4 text-[#b08d57]" />{t.title}</h3>
      <div className={`mb-4 flex items-center justify-between rounded-xl px-3 py-2.5 ${plus ? 'bg-[#b08d57]/10' : 'bg-gray-50'}`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Crown className={`h-4 w-4 ${plus ? 'text-[#b08d57]' : 'text-gray-400'}`} />{t.plan}: {plus ? t.plus : t.free}</span>
        {plus && <span className="text-xs font-medium text-[#7a5d33]">{t.left(me.daysLeft)}</span>}
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-gray-500">{t.qMonth}</dt><dd className="font-semibold text-gray-900">{me.usage.questionsThisMonth}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">{t.qAll}</dt><dd className="font-semibold text-gray-900">{me.usage.questionsAllTime}</dd></div>
        {plus && <div className="flex justify-between"><dt className="text-gray-500">{t.packs}</dt><dd className="font-semibold text-gray-900">{me.packsUsed} / {me.packsLimit}</dd></div>}
      </dl>
      {config?.enabled && (
        <button onClick={subscribe} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b08d57] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8c6b42] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{plus ? t.renew : t.get(config.monthlyEtb)}
        </button>
      )}
    </div>
  );
}
