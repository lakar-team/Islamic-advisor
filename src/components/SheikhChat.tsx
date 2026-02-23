import React, { useState, useRef, useEffect } from 'react';
import { Send, Scroll, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types';
import { checkRateLimit, incrementUsage } from '../lib/rate-limit';

const SheikhChat: React.FC = () => {
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
            const aiContent = data.choices[0].message.content;

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiContent,
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
        <div className="chat-container glass rounded-3xl overflow-hidden flex flex-col h-[700px] max-w-4xl mx-auto my-8 shadow-2xl border border-emerald-900/30">
            {/* Header */}
            <div className="p-6 border-b border-emerald-900/20 bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-600 p-2 rounded-xl shadow-lg shadow-amber-900/20">
                        <Scroll className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl gold-text">Al-Sheikh AI</h3>
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            Grounded in Quran & Sunnah
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                        Free Tier Limit
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
            >
                <AnimatePresence>
                    {messages.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] message-bubble ${m.role === 'user'
                                ? 'user-bubble shadow-lg'
                                : 'assistant-bubble shadow-xl backdrop-blur-md'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {m.role === 'assistant' ? <Sparkles className="w-4 h-4 text-amber-500" /> : <MessageSquare className="w-4 h-4 text-emerald-300" />}
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                                        {m.role === 'assistant' ? 'The Sheikh' : 'You'}
                                    </span>
                                </div>
                                <div className="text-[1.05rem] leading-relaxed select-text">{m.content}</div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-slate-800/50 p-4 rounded-2xl flex gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </motion.div>
                )}

                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-900/50 border-t border-emerald-900/10">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask for advice, guidance, or knowledge..."
                        className="w-full bg-slate-800 border border-slate-700 text-white px-6 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-500 shadow-inner"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="absolute right-2 p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="mt-3 text-[10px] text-center text-slate-500 uppercase tracking-widest font-bold">
                    All guidance is subject to scholarly review • Reference: Quran & Authentic Sunnah
                </p>
            </div>
        </div>
    );
};

export default SheikhChat;
