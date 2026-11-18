import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { Card, PageTitle, btn } from './ui';

const ICON = {
  ok: <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />,
  warn: <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />,
  fail: <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />,
};

export default function Diagnostics() {
  const [data, setData] = useState<{ ranAt: string; checks: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminFetch('/diagnostics'));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    run();
  }, [run]);

  const fails = data?.checks.filter((c) => c.status === 'fail').length ?? 0;
  const warns = data?.checks.filter((c) => c.status === 'warn').length ?? 0;

  return (
    <>
      <PageTitle title="System check" hint="Tests the database, keys, AI, and every source, and tells you exactly what to fix. It can take up to 20 seconds.">
        <button className={btn.primary} onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Run checks
        </button>
      </PageTitle>

      {!data ? (
        <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin text-[#b08d57]" />
      ) : (
        <>
          <Card className={`mb-4 p-4 ${fails ? 'border-red-300 bg-red-50' : warns ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
            <p className="font-semibold text-gray-900">{fails ? `${fails} problem(s) need fixing` : warns ? `Working, with ${warns} warning(s)` : 'Everything checked is working'}</p>
          </Card>

          <Card className="divide-y divide-gray-100">
            {data.checks.map((c) => (
              <div key={c.id} className="flex gap-3 p-4">
                {ICON[c.status as 'ok' | 'warn' | 'fail']}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{c.label}</p>
                  <p className="break-words text-sm text-gray-600">{c.detail}</p>
                  {c.fix && c.status !== 'ok' && <p className="mt-1 rounded bg-gray-100 px-2 py-1 text-sm text-gray-800"><b>Fix:</b> {c.fix}</p>}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
