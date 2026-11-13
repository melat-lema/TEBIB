import { useEffect, useState } from 'react';
import { Loader2, Users, MessageSquare, Languages, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminFetch } from '../../lib/adminApi';
import { useSearchParams } from 'react-router-dom';
import { Card, PageTitle, Bars, btn } from './ui';

export default function Analytics() {
  const [a, setA] = useState<any>(null);
  const [, setParams] = useSearchParams();
  useEffect(() => {
    adminFetch('/analytics').then(setA).catch((e) => toast.error(e.message));
  }, []);

  if (!a) return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin text-[#b08d57]" />;

  const kpi = (label: string, value: string | number, Icon: any) => (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#b08d57]/15 text-[#7a5d33]"><Icon className="h-5 w-5" /></span>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
    </Card>
  );

  return (
    <>
      <PageTitle title="Usage" hint="How people use the assistant. Frequent questions show which facts are worth keeping fresh." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpi('Registered users', a.users, Users)}
        {kpi('Questions (30 days)', a.chatsLast30, MessageSquare)}
        {kpi('Questions all time', a.chatsTotal, MessageSquare)}
        {kpi('Asked in Amharic', `${a.amharicShare}%`, Languages)}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold text-gray-900">Questions Tebib could not answer</h2>
        <p className="mb-3 mt-1 text-sm text-gray-500">People asked these and nothing verified matched. This is your to-do list for the knowledge base. Add the answer, then it works for everyone.</p>
        {!a.unanswered?.length ? (
          <p className="text-sm text-gray-500">None yet. (Only questions asked after you ran <code className="rounded bg-gray-100 px-1">04_unanswered_tracking.sql</code> are tracked.)</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {a.unanswered.map((q: any, i: number) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{q.count}×</span>
                <span className="flex-1 text-gray-800">{q.question}</span>
                <button className={btn.ghost} onClick={() => setParams({ tab: 'knowledge', ask: q.question })}>Add answer</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold text-gray-900">Questions per day</h2><Bars data={a.chatsPerDay} valueKey="chats" label="questions" /></Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Most asked questions</h2>
          {a.topQuestions.length === 0 ? <p className="text-sm text-gray-500">No questions recorded yet.</p> : (
            <ol className="space-y-2">
              {a.topQuestions.map((q: any, i: number) => (
                <li key={i} className="flex items-center gap-3 text-sm"><span className="w-5 text-gray-400">{i + 1}</span><span className="flex-1 truncate text-gray-800">{q.question}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{q.count}</span></li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-6 flex items-center gap-4 border-dashed p-5">
        <Wallet className="h-6 w-6 text-gray-300" />
        <p className="text-sm text-gray-500">Payment tracking (Chapa / Telebirr) will appear here once payments are connected. The <code className="rounded bg-gray-100 px-1">payments</code> table is already in your schema.</p>
      </Card>
    </>
  );
}
