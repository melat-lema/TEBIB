import type { ReactNode } from 'react';

const clean = (s: string) => s.replace(/\*\*/g, '').replace(/`/g, '');

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(clean(text.slice(last, m.index)));
    out.push(<strong key={key++} className="font-semibold">{clean(m[1])}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(clean(text.slice(last)));
  return out;
}

export default function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={key++} className={`my-1 space-y-0.5 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'}`}>
        {list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
      </Tag>,
    );
    list = null;
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[*\-•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (!line.trim()) {
      flush();
    } else {
      flush();
      blocks.push(<p key={key++} className="my-1 first:mt-0 last:mb-0">{inline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}
