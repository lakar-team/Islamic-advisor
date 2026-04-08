import React, { useState, useRef, useEffect } from 'react';
import { Send, Scroll, ShieldAlert, Sparkles, MessageSquare, ExternalLink, BookOpen, Hash, Trash2, Plus, Menu, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types';
import { checkRateLimit, incrementUsage } from '../lib/rate-limit';

const SESSIONS_STORAGE_KEY = 'sheikh_chat_sessions_v2';

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

interface SheikhChatProps {
    onOpenLibrary: (tab: 'quran' | 'hadith', query: string) => void;
}

const SheikhChat: React.FC<SheikhChatProps> = ({ onOpenLibrary }) => {
    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        try {
            const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return [];
    });

    const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
        try {
            const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.length > 0) return parsed[0].id;
            }
        } catch { /* ignore */ }
        return null;
    });

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sendingRef = useRef(false);

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [{
        id: 'initial',
        role: 'assistant',
        content: 'Assalamu Alaikum. I am Online Sheikh AI. How can I assist you in your search for knowledge today?',
        timestamp: Date.now(),
    }];

    // Persistence
    useEffect(() => {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }, [sessions]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Textarea auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const createNewSession = (initialQuery?: string) => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: initialQuery ? (initialQuery.length > 30 ? initialQuery.slice(0, 30) + '...' : initialQuery) : 'New Consultation',
            messages: [{
                id: '1',
                role: 'assistant',
                content: 'Assalamu Alaikum. I am your scholarly assistant. How can I guide you today?',
                timestamp: Date.now(),
            }],
            timestamp: Date.now(),
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setShowSidebar(false);
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            if (currentSessionId === id) {
                setCurrentSessionId(next.length > 0 ? next[0].id : null);
            }
            return next;
        });
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || sendingRef.current) return;

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

        sendingRef.current = true;
        setIsLoading(true);
        setError(null);

        // If no session exists, create one
        let sessionId = currentSessionId;
        if (!sessionId) {
            const newId = Date.now().toString();
            const newSession: ChatSession = {
                id: newId,
                title: input.length > 30 ? input.slice(0, 30) + '...' : input,
                messages: [userMsg],
                timestamp: Date.now(),
            };
            setSessions([newSession]);
            setCurrentSessionId(newId);
            sessionId = newId;
        } else {
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    return { ...s, messages: [...s.messages, userMsg], timestamp: Date.now() };
                }
                return s;
            }));
        }

        const currentInput = input;
        setInput('');

        try {
            const contextMessages = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: contextMessages })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to reach the AI");

            const aiRawContent = data.choices[0].message.content;
            const { cleanedContent, references } = parseCitations(aiRawContent);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: cleanedContent,
                references: references.length > 0 ? references : undefined,
                timestamp: Date.now(),
            };

            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    return { 
                        ...s, 
                        messages: [...s.messages, assistantMsg],
                        // Update title if it was the default one
                        title: s.title === 'New Consultation' ? (currentInput.length > 30 ? currentInput.slice(0, 30) + '...' : currentInput) : s.title 
                    };
                }
                return s;
            }));
            incrementUsage();
        } catch (err: any) {
            setError(err.message || "Message transmission interrupted.");
        } finally {
            setIsLoading(false);
            sendingRef.current = false;
        }
    };

    const parseCitations = (content: string) => {
        // Multi-stage regex to catch various patterns of JSON and CITATION tags
        const jsonBlockRegex = /```(?:json|javascript)?\s*(\[[\s\S]*?\])\s*```/gi;
        const tagRegex = /\[\[CITATIONS:\s*(\[[\s\S]*?\])\s*\]\]/gi;
        
        let references: any[] = [];
        let match;

        // 1. Extract from [[CITATIONS: [...] ]] tags
        while ((match = tagRegex.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (Array.isArray(parsed)) references.push(...parsed);
            } catch { /* ignore invalid JSON */ }
        }

        // 2. Extract from ```json [...] ``` blocks that look like references
        while ((match = jsonBlockRegex.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (Array.isArray(parsed) && parsed.some(item => typeof item === 'object' && (item.type === 'quran' || item.type === 'hadith'))) {
                    references.push(...parsed);
                }
            } catch { /* ignore */ }
        }

        // 3. Clean the content by removing ALL matches
        let cleanedContent = content
            .replace(tagRegex, '')
            .replace(jsonBlockRegex, (matchStr, p1) => {
                try {
                    const parsed = JSON.parse(p1);
                    if (Array.isArray(parsed) && parsed.some(item => typeof item === 'object' && (item.type === 'quran' || item.type === 'hadith'))) {
                        return ''; // remove it
                    }
                } catch {}
                return matchStr; // keep if it wasn't a library citation
            })
            .trim();

        return { cleanedContent, references };
    };

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
                        parts.push(<strong key={i++} className="font-bold text-on-surface dark:text-white">{matched.slice(2, -2)}</strong>);
                    } else {
                        parts.push(<em key={i++} className="italic text-emerald-600 dark:text-emerald-400 font-medium">{matched.slice(1, -1)}</em>);
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
                        <span className="shrink-0 w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 border border-emerald-500/20">
                            {numberedMatch[1]}
                        </span>
                        <span className="text-on-surface-variant dark:text-slate-200">{renderInline(numberedMatch[2])}</span>
                    </div>
                );
            }

            const bulletMatch = line.match(/^[*-]\s+(.*)/);
            if (bulletMatch) {
                return (
                    <div key={lineIdx} className="flex gap-3 mb-2">
                        <span className="shrink-0 mt-2.5 w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                        <span className="text-on-surface-variant dark:text-slate-200">{renderInline(bulletMatch[1])}</span>
                    </div>
                );
            }

            if (line.trim() === '') return <div key={lineIdx} className="h-3" />;
            return (
                <p key={lineIdx} className="mb-2 text-on-surface-variant dark:text-slate-200 leading-relaxed font-medium">
                    {renderInline(line)}
                </p>
            );
        });
    };

    return (
        <div className="flex gap-6 max-w-6xl mx-auto my-8 h-[750px] relative">
            {/* Sidebar Toggle for Mobile */}
            <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden absolute -top-14 left-0 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-outline-variant/30 text-[#34D399] z-20"
            >
                {showSidebar ? <CloseIcon /> : <Menu />}
            </button>

            {/* Sessions Sidebar */}
            <aside className={`
                ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
                lg:translate-x-0 transition-transform duration-300
                absolute lg:relative z-30 lg:z-0
                w-72 h-full flex flex-col gap-4 shrink-0
            `}>
                <button 
                    onClick={() => createNewSession()}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-bold shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-98 transition-all uppercase tracking-widest text-[10px]"
                >
                    <Plus className="w-5 h-5" /> New Consultation
                </button>
                
                <div className="flex-1 bg-surface dark:bg-slate-900 rounded-[2.5rem] p-4 border border-outline-variant/30 overflow-hidden flex flex-col shadow-sm">
                    <h4 className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-500 mb-2">Past Consultations</h4>
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-outline-variant opacity-30" />
                                <p className="text-xs text-on-surface-variant dark:text-slate-500 font-medium italic">No sessions saved yet.</p>
                            </div>
                        ) : (
                            sessions.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => { setCurrentSessionId(s.id); setShowSidebar(false); }}
                                    className={`
                                        group relative p-4 rounded-3xl cursor-pointer transition-all border border-transparent
                                        ${currentSessionId === s.id 
                                            ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-600' 
                                            : 'hover:bg-surface-container-low dark:hover:bg-white/5 text-on-surface-variant dark:text-slate-400 font-medium'}
                                    `}
                                >
                                    <p className="text-sm font-bold truncate pr-6">{s.title}</p>
                                    <p className="text-[10px] font-medium opacity-50 mt-1 uppercase tracking-wider">{new Date(s.timestamp).toLocaleDateString()}</p>
                                    <button 
                                        onClick={(e) => deleteSession(s.id, e)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-on-surface-variant/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all font-medium"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 bg-surface dark:bg-slate-900 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30 transition-colors duration-300">
                {/* Header */}
                <header className="px-8 py-6 border-b border-outline-variant/30 bg-surface-container-low/50 dark:bg-slate-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-2.5 rounded-2xl">
                            <Scroll className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-on-surface dark:text-white leading-tight">Online Sheikh AI</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-bold uppercase tracking-widest">Active Consultation</span>
                            </div>
                        </div>
                    </div>
                    {currentSessionId && (
                        <div className="hidden sm:flex flex-col items-end opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Session ID</span>
                            <span className="text-[9px] font-mono">{currentSessionId}</span>
                        </div>
                    )}
                </header>

                {/* Messages Body */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed dark:bg-none"
                >
                    <AnimatePresence>
                        {messages.map((m) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`
                                    max-w-[85%] p-6 rounded-[2rem] transition-colors
                                    ${m.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-xl shadow-emerald-900/20'
                                        : 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-white rounded-tl-none shadow-sm border border-outline-variant/20'}
                                `}>
                                    <div className="flex items-center gap-2 mb-3 opacity-60">
                                        {m.role === 'assistant' ? <Sparkles className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                            {m.role === 'assistant' ? 'Verified Scholarly AI' : 'Your Query'}
                                        </span>
                                    </div>

                                    <div className="text-[1rem] leading-relaxed font-medium">
                                        {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                                    </div>

                                    {/* References Block */}
                                    {m.references && m.references.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-outline-variant/40">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                                                <ExternalLink className="w-3 h-3" /> Scholarly Citations
                                            </p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {m.references.map((ref, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => onOpenLibrary(ref.type, ref.source)}
                                                        className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white dark:bg-white/5 hover:bg-emerald-500/10 border border-outline-variant/20 hover:border-emerald-500/30 transition-all group text-left"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`p-2 rounded-xl ${ref.type === 'quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                                {ref.type === 'quran' ? <BookOpen className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold text-on-surface dark:text-slate-200 uppercase tracking-tighter truncate">{ref.source}</p>
                                                                <p className="text-[9px] text-on-surface-variant dark:text-slate-500 font-medium uppercase tracking-widest leading-none mt-1">Verified Source</p>
                                                            </div>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-outline-variant group-hover:text-emerald-600 transition-colors" />
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
                        <div className="flex justify-start">
                            <div className="bg-surface-container-low dark:bg-slate-800 p-5 rounded-3xl flex gap-1.5 shadow-sm border border-outline-variant/10">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-emerald-600 rounded-full" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-emerald-600 rounded-full" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-emerald-600 rounded-full" />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl text-red-600 dark:text-red-400 text-sm flex items-center gap-4 mx-auto max-w-lg">
                            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                            <p className="font-bold">{error}</p>
                        </div>
                    )}
                </div>

                {/* Input Footer */}
                <footer className="p-6 bg-surface dark:bg-slate-900 border-t border-outline-variant/30 transition-colors duration-300">
                    <div className="relative flex items-end max-w-3xl mx-auto">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask the Sheikh..."
                            className="w-full bg-surface-container-low dark:bg-slate-800 border-none text-on-surface dark:text-white pl-8 pr-16 py-5 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-lg placeholder:text-on-surface-variant/40 shadow-inner resize-none overflow-y-auto min-h-[64px]"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 bottom-2 p-4 bg-emerald-600 disabled:grayscale disabled:opacity-30 text-white rounded-full transition-all shadow-lg shadow-emerald-900/20 hover:scale-110 active:scale-90"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="mt-4 text-[9px] text-center text-on-surface-variant dark:text-slate-600 uppercase tracking-[0.3em] font-black">
                        Tradition • Authenticity • Intelligence
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default SheikhChat;
