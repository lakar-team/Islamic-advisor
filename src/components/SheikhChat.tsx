import React, { useState, useRef, useEffect } from 'react';
import { Send, Scroll, ShieldAlert, Sparkles, MessageSquare, ExternalLink, BookOpen, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types';
import { checkRateLimit, incrementUsage } from '../lib/rate-limit';

interface SheikhChatProps {
    onOpenLibrary: (tab: 'quran' | 'hadith', query: string) => void;
}

const SheikhChat: React.FC<SheikhChatProps> = ({ onOpenLibrary }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Assalamu Alaikum. I am your Online Sheikh AI. How can I assist you in your deen today?',
            timestamp: Date.now(),
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const parseCitations = (content: string) => {
        const regex = /\[\[CITATIONS:\s*(\[.*?\])\s*\]\]/s;
        const match = content.match(regex);
        let cleanedContent = content;
        let references: any[] = [];

        if (match) {
            try {
                references = JSON.parse(match[1]);
                cleanedContent = content.replace(regex, '').trim();
            } catch (e) {
                console.error("Failed to parse citations:", e);
            }
        }
        return { cleanedContent, references };
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const { allowed } = checkRateLimit();
        if (!allowed) {
            setError("You've reached your daily limit for the free tier. Join our community to support the project!");
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };

        setMessages((prev: Message[]) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages.concat(userMsg).map((msg: Message) => ({ role: msg.role, content: msg.content }))
                })
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const aiRawContent = data.choices[0].message.content;

            const { cleanedContent, references } = parseCitations(aiRawContent);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: cleanedContent,
                references: references.length > 0 ? references : undefined,
                timestamp: Date.now(),
            };

            setMessages((prev: Message[]) => [...prev, assistantMsg]);
            setIsLoading(false);
            incrementUsage();
        } catch (err) {
            setError("The connection to the Sheikh was interrupted. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container glass rounded-[3rem] overflow-hidden flex flex-col h-[750px] max-w-4xl mx-auto my-8 shadow-2xl border border-emerald-900/30">
            {/* Header */}
            <div className="p-8 border-b border-emerald-900/20 bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-600 p-3 rounded-2xl shadow-lg shadow-amber-900/40 rotate-3">
                        <Scroll className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl gold-text tracking-tighter">Al-Sheikh AI</h3>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                            Live Scholarly Advice
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
            >
                <AnimatePresence>
                    {messages.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[90%] message-bubble ${m.role === 'user'
                                ? 'user-bubble shadow-xl'
                                : 'assistant-bubble shadow-2xl backdrop-blur-xl border border-white/5'
                                }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    {m.role === 'assistant' ? <Sparkles className="w-4 h-4 text-amber-500" /> : <MessageSquare className="w-4 h-4 text-emerald-300" />}
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                        {m.role === 'assistant' ? 'The Sheikh' : 'You'}
                                    </span>
                                </div>
                                <div className="text-[1.1rem] leading-relaxed select-text font-medium text-slate-100">{m.content}</div>

                                {/* References UI */}
                                {m.references && m.references.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 gap-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Sources Found:</p>
                                        {m.references.map((ref, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onOpenLibrary(ref.type, ref.source)}
                                                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${ref.type === 'quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {ref.type === 'quran' ? <BookOpen className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black text-slate-200 uppercase tracking-tighter leading-none mb-1">{ref.source}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold truncate max-w-[200px]">{ref.text}</p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-slate-800/80 p-5 rounded-3xl flex gap-3 shadow-xl backdrop-blur-md border border-white/5">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </motion.div>
                )}

                {error && (
                    <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-3xl text-red-200 text-sm flex items-center gap-4 animate-shake">
                        <ShieldAlert className="w-6 h-6 flex-shrink-0 text-red-500" />
                        <p className="font-bold">{error}</p>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-8 bg-slate-900/80 border-t border-emerald-900/20 backdrop-blur-md">
                <div className="relative flex items-center group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Seeking guidance? Type your question here..."
                        className="w-full bg-slate-800/80 border border-slate-700 text-white px-8 py-5 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-lg placeholder:text-slate-600 shadow-inner group-hover:border-slate-600 focus:group-hover:border-emerald-500"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="absolute right-3 p-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95 group-hover:scale-105"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>
                <p className="mt-4 text-[10px] text-center text-slate-500 uppercase tracking-[0.2em] font-black opacity-60">
                    Prophetic Guidance • Powered by Authentic Sources
                </p>
            </div>
        </div>
    );
};

export default SheikhChat;
