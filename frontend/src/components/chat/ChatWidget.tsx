// src/components/chat/ChatWidget.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  sources?: { text: string; source: string }[];
  isError?: boolean;
}

export default function ChatWidget({ lang = 'en' }: { lang?: 'en' | 'am' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: 'Hello! I am your Tebib AI assistant. Ask me anything about Ethiopian government services, fees, or requirements.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
 const API_URL = import.meta.env.VITE_API_URL;
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Listen for "Open Chat" commands from other pages (Contextual Chat)
  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.message) {
        setInput(customEvent.detail.message);
      }
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Connect to Backend
           const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: userMessage.text, language: lang, sessionId }),
      });

      // 2. Handle Network/Server Errors
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      // 3. Handle API Logic Errors
      if (!data.success) {
        throw new Error(data.response || 'Failed to get response');
      }

      // 4. Add AI Response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.response,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      // 5. Graceful Error Handling (Show a nice error bubble in chat)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "I'm having trouble connecting to the server. Please make sure the backend is running and try again.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            // Responsive sizing for Day 21 prep
            className="mb-4 w-[calc(100vw-3rem)] sm:w-[380px] h-[60vh] sm:h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#b08d57] text-white p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Tebib AI Assistant</h3>
                  <p className="text-xs text-white/80">Always here to help</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-[#b08d57] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] space-y-2`}>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.isError 
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm flex items-start gap-2' 
                        : msg.role === 'user' 
                          ? 'bg-[#b08d57] text-white rounded-tr-sm' 
                          : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                    }`}>
                      {msg.isError && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                      {msg.text}
                    </div>
                    
                    {/* Sources */}
                    {msg.role === 'ai' && !msg.isError && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sources:</p>
                        {msg.sources.slice(0, 2).map((source, idx) => (
                          <div key={idx} className="text-[11px] text-gray-500 bg-gray-100 p-2 rounded-lg border border-gray-200">
                            {source.text.substring(0, 80)}...
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading State */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm p-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#b08d57] animate-spin" />
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-[#b08d57]/20 focus-within:border-[#b08d57] transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about passports, IDs, fees..."
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-800 placeholder-gray-400 max-h-24 py-1.5 px-2"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-[#b08d57] text-white rounded-lg hover:bg-[#8c6b42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                AI can make mistakes. Verify important info with official offices.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#b08d57] text-white rounded-full shadow-lg hover:shadow-xl hover:bg-[#8c6b42] transition-all flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}