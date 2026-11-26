import { useEffect, useState, type ReactNode } from 'react';
import { API_URL } from '../../lib/config';

export const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/25';

export const btn = {
  primary: 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#b08d57] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#8c6b42] disabled:cursor-not-allowed disabled:opacity-50',
  ghost: 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
  danger: 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50',
  good: 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50',
};

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
);

const tones: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  gold: 'bg-[#b08d57]/15 text-[#7a5d33]',
};
export const Chip = ({ tone = 'gray', children }: { tone?: keyof typeof tones; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
);

export const statusTone = (s: string) =>
  ({ success: 'green', partial: 'amber', failed: 'red', empty: 'gray', approved: 'green', pending: 'amber', rejected: 'red', archived: 'gray' } as Record<string, string>)[s] ?? 'gray';

export function timeAgo(iso?: string | null) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const PageTitle = ({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

export function Bars({ data, valueKey, label }: { data: Array<Record<string, any>>; valueKey: string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {data.map((d) => (
          // h-full is what makes the percentage height of the bar work (a flex child has no height of its own)
          <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${d[valueKey]} ${label}`}>
            <div className={`w-full rounded-t transition ${d[valueKey] ? 'bg-[#b08d57]/80 group-hover:bg-[#b08d57]' : 'bg-gray-200'}`} style={{ height: d[valueKey] ? `${Math.max(6, (d[valueKey] / max) * 100)}%` : '3px' }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function Pager({ page, total, pageSize, onPage, onSize, sizes = [10, 25, 50, 100] }: { page: number; total: number; pageSize: number; onPage: (p: number) => void; onSize?: (n: number) => void; sizes?: number[] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const nums: Array<number | '…'> = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const cell = 'min-w-[2rem] rounded-md border px-2 py-1 text-sm';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button className={`${cell} border-gray-300 bg-white disabled:opacity-40`} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        {nums.map((n, i) => n === '…' ? <span key={`e${i}`} className="px-1">…</span> : (
          <button key={n} onClick={() => onPage(n)} className={`${cell} ${n === page ? 'border-[#b08d57] bg-[#b08d57] font-semibold text-white' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>{n}</button>
        ))}
        <button className={`${cell} border-gray-300 bg-white disabled:opacity-40`} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
      {onSize && (
        <label className="flex items-center gap-2">Per page
          <select className="rounded-md border border-gray-300 bg-white px-2 py-1" value={pageSize} onChange={(e) => onSize(Number(e.target.value))}>{sizes.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
      )}
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="px-6 py-14 text-center text-sm text-gray-500">{children}</div>;

export function useServices() {
  const [services, setServices] = useState<Array<{ id: string; name_en: string }>>([]);
  useEffect(() => {
    fetch(`${API_URL}/services`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setServices(d))
      .catch(() => undefined);
  }, []);
  return services;
}

export const CATEGORY_OPTIONS = ['fee', 'requirement', 'step', 'contact', 'office', 'deadline', 'update', 'other'];
