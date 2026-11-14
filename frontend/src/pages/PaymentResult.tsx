import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { premiumFetch } from '../lib/premiumApi';

type View = 'checking' | 'preparing' | 'failed' | 'error';

/** Chapa sends people back here. Nothing is unlocked by this page itself: the server asks Chapa whether the payment succeeded. */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const txRef = params.get('tx_ref') ?? params.get('trx_ref') ?? '';
  const navigate = useNavigate();
  const [view, setView] = useState<View>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!txRef) {
      setView('error');
      setMessage('This payment link is missing its reference.');
      return;
    }
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 24 && !cancelled; attempt++) {
        try {
          const r = await premiumFetch(`/verify/${encodeURIComponent(txRef)}`);
          if (r.status === 'completed' && r.packId) return navigate(`/premium/${r.packId}`, { replace: true });
          if (r.status === 'failed') return !cancelled && setView('failed');
          if (r.status === 'completed') setView('preparing');
        } catch (e: any) {
          if (!cancelled) {
            setView('error');
            setMessage(e.message);
          }
          return;
        }
        await new Promise((res) => setTimeout(res, 2500));
      }
      if (!cancelled) {
        setView('error');
        setMessage('We are still waiting for the payment to be confirmed. If you were charged, your pack will appear under “Your packs” shortly. Nothing is lost.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [txRef, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
        {view === 'failed' ? <XCircle className="mx-auto h-12 w-12 text-red-500" /> : view === 'error' ? <XCircle className="mx-auto h-12 w-12 text-amber-500" /> : view === 'preparing' ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#b08d57]" />}
        <h1 className="mt-4 text-xl font-semibold text-gray-900">
          {view === 'checking' && 'Confirming your payment…'}
          {view === 'preparing' && 'Payment received. Preparing your pack…'}
          {view === 'failed' && 'The payment did not go through'}
          {view === 'error' && 'We could not finish this yet'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {view === 'checking' && 'This usually takes a few seconds. Please keep this page open.'}
          {view === 'preparing' && 'Your pack is being built from verified information.'}
          {view === 'failed' && 'You were not charged for a pack. You can try again from the service page.'}
          {view === 'error' && message}
        </p>
        {(view === 'failed' || view === 'error') && (
          <Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-[#b08d57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8c6b42]">Back to dashboard</Link>
        )}
      </div>
    </div>
  );
}
