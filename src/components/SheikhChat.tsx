import React, { useState, useRef, useEffect } from 'react';
import { Send, Scroll, ShieldAlert, Sparkles, MessageSquare, ExternalLink, BookOpen, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types';
import { checkRateLimit, incrementUsage } from '../lib/rate-limit';

const CHAT_STORAGE_KEY = 'sheikh_chat_history';

interface SheikhChatProps {
    onOpenLibrary: (tab: 'quran' | 'hadith', query: string) => void;
}

// Render markdown-like formatting into JSX
const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
        const renderInline = (str: string): React.ReactNode[] => {
            const parts: React.ReactNode[] = [];
            const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
            let lastIndex = 0;
            let match;
            let i = 0;
            while ((match = regex.exec(str)) !== null) {
                if (match.index > lastIndex) parts.push(str.slice(lastIndex, match.index));
                const matched = match[0];
                if (matched.startsWith('**')) {
                    parts.push(<strong key={i++} className="font-black text-white">{matched.slice(2, -2)}</strong>);
                } else {
                    parts.push(<em key={i++} className="italic text-amber-200/80">{matched.slice(1, -1)}</em>);
                }
                lastIndex = regex.lastIndex;
            }
            if (lastIndex < str.length) parts.push(str.slice(lastIndex));
            return parts;
        };

        const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
            return (
                <div key={lineIdx} className="flex gap-3 mb-3 mt-1">
                    <span className="shrink-0 w-7 h-7 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black flex items-center justify-center mt-0.5 border border-emerald-500/20">
                        {numberedMatch[1]}
                    </span>
                    <span className="text-slate-200">{renderInline(numberedMatch[2])}</span>
                </div>
            );
        }

        const bulletMatch = line.match(/^[*-]\s+(.*)/);
        if (bulletMatch) {
            return (
                <div key={lineIdx} className="flex gap-3 mb-2">
                    <span className="shrink-0 mt-2 w-1.5 h-1.5 bg-emerald-400/60 rounded-full"></span>
                    <span className="text-slate-200">{renderInline(bulletMatch[1])}</span>
                </div>
            );
        }

        if (line.trim() === '') return <div key={lineIdx} className="h-3" />;

        return (
            <p key={lineIdx} className="mb-2 text-slate-200 leading-relaxed">
                {renderInline(line)}
            </p>
        );
    });
};

// Convert a reference string like "Al-Imran 3:185" into a searchable query
// Returns "surahNum:ayahNum" for Quran so the library can scroll to the exact verse
const resolveLibraryQuery = (ref: { type: 'quran' | 'hadith'; source: string }): string => {
    if (ref.type === 'quran') {
        // Extract "surahNum:ayahNum" e.g. "2:255" from patterns like "Al-Baqarah 2:255" or "2:30"
        const surahAyahMatch = ref.source.match(/(\d+):(\d+)/);
        if (surahAyahMatch) return `${surahAyahMatch[1]}:${surahAyahMatch[2]}`;
        return ref.source;
    }
    // For hadith, return "collectionId:number" (e.g. "muslim:7139") so the library
    // can auto-select the right collection and fetch directly by number.
    const collectionMap: Record<string, string> = {
        'bukhari': 'eng-bukhari',
        'muslim': 'eng-muslim',
        'tirmidhi': 'eng-tirmidhi',
        'abu dawud': 'eng-abudawud',
        'abudawud': 'eng-abudawud',
        "nasa'i": 'eng-nasai',
        'nasai': 'eng-nasai',
        'ibn majah': 'eng-ibnmajah',
        'ibnmajah': 'eng-ibnmajah',
    };
    const hadithNumMatch = ref.source.match(/Hadith\s+(\d+)/i);
    const collectionRaw = ref.source.match(/^(\w[\w\s']*?)(?:\s*[-–]|\s+Hadith)/i);
    const collectionKey = collectionRaw ? collectionRaw[1].trim().toLowerCase() : '';
    const collectionId = collectionMap[collectionKey] || 'eng-bukhari';
    if (hadithNumMatch) return `${collectionId}:${hadithNumMatch[1]}`;
    return ref.source;
};

const loadMessages = (): Message[] => {
    try {
        const stored = localStorage.getItem(CHAT_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [{
        id: '1',
        role: 'assistant',
        content: 'Assalamu Alaikum. I am Online Sheikh AI. How can I assist you in your deen today?',
        timestamp: Date.now(),
    }];
};

const saveMessages = (messages: Message[]) => {
    try {
        // Keep last 50 messages to avoid bloating localStorage
        const toSave = messages.slice(-50);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
};

const SheikhChat: React.FC<SheikhChatProps> = ({ onOpenLibrary }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>(loadMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        saveMessages(messages);
    }, [messages]);

    const parseCitations = (content: string) => {
        const regex = /\[\[CITATIONS:\s*(\[[\s\S]*?\])\s*\]\]/;
        const match = content.match(regex);
        let cleanedContent = content;
        let references: any[] = [];

        if (match) {
            try {
                references = JSON.parse(match[1]);
                cleanedContent = content.replace(regex, '').trim();
            } catch (e) {
                cleanedContent = content.replace(regex, '').trim();
            }
        }

        // Fallback: scan text for inline references
        if (references.length === 0) {
            const seen = new Set<string>();

            const quranPattern = /\(?(?:Surah\s+)?([\w\s-]+),?\s*(\d+):(\d+)\)?/g;
            let q;
            while ((q = quranPattern.exec(cleanedContent)) !== null) {
                const source = `${q[1].trim()} ${q[2]}:${q[3]}`;
                if (!seen.has(source)) {
                    seen.add(source);
                    references.push({ type: 'quran', text: '', source });
                }
            }

            // Matches: "Sahih Muslim (Book 042, Hadith 7139)" or "Bukhari - Hadith 1234" or just "Muslim 1234"
            const hadithPattern = /\b(?:Sahih\s+)?(Bukhari|Muslim|Tirmidhi|Abu\s*Dawud|Nasa['']?i|Ibn\s*Majah)(?:[^\d()]*(?:Book\s*\d+,?\s*)?(?:Hadith\s*)?(\d+))?\b/gi;
            let h;
            while ((h = hadithPattern.exec(cleanedContent)) !== null) {
                const source = h[2] ? `${h[1]} – Hadith ${h[2]}` : h[1];
                if (!seen.has(source)) {
                    seen.add(source);
                    references.push({ type: 'hadith', text: '', source });
                }
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
            incrementUsage();
        } catch (err) {
            setError("The connection to the Sheikh was interrupted. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = () => {
        const initial: Message = {
            id: 'reset',
            role: 'assistant',
            content: 'Assalamu Alaikum. Starting a new session. How can I assist you today?',
            timestamp: Date.now(),
        };
        setMessages([initial]);
    };

    return (
        <div className="chat-container glass rounded-[3rem] overflow-hidden flex flex-col h-[750px] max-w-4xl mx-auto my-8 shadow-2xl border border-emerald-900/30">
            {/* Header */}
            <div className="p-6 border-b border-emerald-900/20 bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-600 p-3 rounded-2xl shadow-lg shadow-amber-900/40 rotate-3">
                        <Scroll className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl gold-text tracking-tighter">Online Sheikh AI</h3>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                            Live Scholarly Advice
                        </span>
                    </div>
                </div>
                <button
                    onClick={clearHistory}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors px-4 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5"
                >
                    New Session
                </button>
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
                                <div className="flex items-center gap-2 mb-4">
                                    {m.role === 'assistant' ? <Sparkles className="w-4 h-4 text-amber-500" /> : <MessageSquare className="w-4 h-4 text-emerald-300" />}
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                        {m.role === 'assistant' ? 'Online Sheikh AI' : 'You'}
                                    </span>
                                </div>

                                <div className="text-[1.05rem] leading-relaxed select-text font-medium">
                                    {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                                </div>

                                {/* References UI */}
                                {m.references && m.references.length > 0 && (
                                    <div className="mt-6 pt-5 border-t border-white/10">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3" />
                                            Open in Knowledge Library
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {m.references.map((ref, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => onOpenLibrary(ref.type, resolveLibraryQuery(ref))}
                                                    className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all group text-left"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`shrink-0 p-2 rounded-lg ${ref.type === 'quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                            {ref.type === 'quran' ? <BookOpen className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-slate-200 uppercase tracking-tight leading-none truncate">{ref.source}</p>
                                                            {ref.text && <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{ref.text}</p>}
                                                        </div>
                                                    </div>
                                                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                                </button>
                                            ))}
                                        </div>
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
                    <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-3xl text-red-200 text-sm flex items-center gap-4">
                        <ShieldAlert className="w-6 h-6 flex-shrink-0 text-red-500" />
                        <p className="font-bold">{error}</p>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-900/80 border-t border-emerald-900/20 backdrop-blur-md">
                <div className="relative flex items-center group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Seeking guidance? Type your question here..."
                        className="w-full bg-slate-800/80 border border-slate-700 text-white px-8 py-5 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-lg placeholder:text-slate-600 shadow-inner"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="absolute right-3 p-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>
                <p className="mt-3 text-[10px] text-center text-slate-500 uppercase tracking-[0.2em] font-black opacity-60">
                    Prophetic Guidance • Powered by Authentic Sources
                </p>
            </div>
        </div>
    );
};

export default SheikhChat;
