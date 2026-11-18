import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { API_URL } from '../../lib/config';

interface Source {
  text: string;
  source: string;
  url?: string | null;
  verifiedAt?: string | null;
}
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  sources?: Source[];
  isError?: boolean;
  streaming?: boolean;
}

const copy = {
  en: {
    greeting: 'Hello! I am your Tebib AI assistant. Ask me anything about Ethiopian government services, fees, or requirements.',
    title: 'Tebib AI Assistant',
    subtitle: 'Answers come from reviewed information',
    placeholder: 'Ask about passports, IDs, fees...',
    thinking: 'Searching verified information…',
    sources: 'Sources',
    verified: 'Verified',
    disclaimer: 'AI can make mistakes. Verify important info with official offices.',
    error: "I couldn't reach the server. Please check your connection and try again.",
    newChat: 'New chat',
  },
  am: {
    greeting: 'ሰላም! እኔ የጠቢብ AI ረዳት ነኝ። ስለ ኢትዮጵያ መንግስት አገልግሎቶች፣ ክፍያዎች ወይም መስፈርቶች ማንኛውንም ይጠይቁኝ።',
    title: 'የጠቢብ AI ረዳት',
    subtitle: 'መልሶች ከተመረመረ መረጃ የተወሰዱ ናቸው',
    placeholder: 'ስለ ፓስፖርት፣ መታወቂያ፣ ክፍያ ይጠይቁ...',
    thinking: 'የተረጋገጠ መረጃ በመፈለግ ላይ…',
    sources: 'ምንጮች',
    verified: 'የተረጋገጠ',
    disclaimer: 'AI ሊሳሳት ይችላል። አስፈላጊ መረጃን ከኦፊሴላዊ መስሪያ ቤቶች ያረጋግጡ።',
    error: 'ከአገልጋዩ ጋር መገናኘት አልተቻለም። እባክዎ ግንኙነትዎን ያረጋግጡ እና እንደገና ይሞክሩ።',
    newChat: 'አዲስ ውይይት',
  },
};

export default function ChatWidget({ lang = 'en' }: { lang?: 'en' | 'am' }) {
  const t = copy[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patchLast = (patch: Partial<Message>) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m)));
  const appendLast = (text: string) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: m.text + text } : m)));

  const send = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text || isLoading) return;

      setInput('');
      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', text },
        { id: crypto.randomUUID(), role: 'ai', text: '', streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(`${API_URL}/chat/stream`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ message: text, language: lang, sessionId }),
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let failed = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith('data:')) continue;
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === 'token') appendLast(evt.text);
            else if (evt.type === 'done') patchLast({ sources: evt.sources, streaming: false });
            else if (evt.type === 'error') {
              failed = true;
              patchLast({ text: evt.message, isError: true, streaming: false });
            }
          }
        }
        if (!failed) patchLast({ streaming: false });
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Chat error:', error);
          patchLast({ text: t.error, isError: true, streaming: false });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, lang, sessionId, t.error],
  );

  // "Open chat" from other pages. detail: { message?: string, send?: boolean }
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      setIsOpen(true);
      if (detail.message) {
        if (detail.send) setTimeout(() => sendRef.current(detail.message), 50);
        else setInput(detail.message);
      }
    };
    window.addEventListener('open-chat', handler);
    return () => window.removeEventListener('open-chat', handler);
  }, []);

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setIsLoading(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const bubble = (msg: Message) =>
    msg.isError
      ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm flex items-start gap-2'
      : msg.role === 'user'
        ? 'bg-[#b08d57] text-white rounded-tr-sm'
        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 flex h-[60vh] w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:h-[560px] sm:w-[390px]"
          >
            <div className="flex flex-shrink-0 items-center justify-between bg-[#b08d57] p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{t.title}</h3>
                  <p className="text-xs text-white/80">{t.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={newChat} title={t.newChat} aria-label={t.newChat} className="rounded-lg p-1.5 transition-colors hover:bg-white/20">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setIsOpen(false)} aria-label="Close" className="rounded-lg p-1.5 transition-colors hover:bg-white/20">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
              {/* greeting is rendered from the current language, so it changes with the EN/AM toggle */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-3 text-sm leading-relaxed text-gray-800 shadow-sm">{t.greeting}</div>
              </div>

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-[#b08d57] text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="max-w-[80%] space-y-2">
                    <div className={`whitespace-pre-wrap rounded-2xl p-3 text-sm leading-relaxed ${bubble(msg)}`}>
                      {msg.isError && <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                      {msg.text || (msg.streaming ? <span className="text-gray-400">{t.thinking}</span> : null)}
                      {msg.streaming && msg.text && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[#b08d57] align-middle" />}
                    </div>

                    {msg.role === 'ai' && !msg.isError && !!msg.sources?.length && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold tracking-wide text-gray-400">{t.sources}</p>
                        {msg.sources.slice(0, 3).map((s, i) => (
                          <div key={i} className="rounded-lg border border-gray-200 bg-gray-100 p-2 text-[11px] leading-snug text-gray-600">
                            <p className="line-clamp-2">{s.text}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400">
                              <span>{s.source}</span>
                              {s.verifiedAt && <span>· {t.verified} {new Date(s.verifiedAt).toLocaleDateString()}</span>}
                              {s.url && (
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-[#b08d57] hover:underline">
                                  <ExternalLink className="h-2.5 w-2.5" /> link
                                </a>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4">
              <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 transition-all focus-within:border-[#b08d57] focus-within:ring-2 focus-within:ring-[#b08d57]/20">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t.placeholder}
                  rows={1}
                  className="max-h-24 flex-1 resize-none border-none bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none placeholder-gray-400"
                  disabled={isLoading}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
                  aria-label="Send"
                  className="flex-shrink-0 rounded-lg bg-[#b08d57] p-2 text-white transition-colors hover:bg-[#8c6b42] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-gray-400">{t.disclaimer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#b08d57] text-white shadow-lg transition-all hover:bg-[#8c6b42] hover:shadow-xl"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
