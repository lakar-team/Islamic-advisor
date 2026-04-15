import React, { useState, useRef, useEffect } from 'react';
import { Send, Scroll, ShieldAlert, Sparkles, MessageSquare, ExternalLink, BookOpen, Hash, Trash2, Plus, Menu, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initiateLogin } from '../lib/oauth-utils';
import { qfApiClient } from '../lib/qf-api-client';
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
    isLoggedIn: boolean;
    onOpenLibrary: (tab: 'quran' | 'hadith', query: string) => void;
}

const SheikhChat: React.FC<SheikhChatProps> = ({ isLoggedIn, onOpenLibrary }) => {
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
    const [hiddenRefs, setHiddenRefs] = useState<Set<string>>(new Set());

    const toggleRefs = (id: string) => {
        const newSet = new Set(hiddenRefs);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setHiddenRefs(newSet);
    };

    // OAuth & Activity States
    const [oauthToken, setOauthToken] = useState<string | null>(() => localStorage.getItem('quran_access_token'));
    const [quranApiBase, setQuranApiBase] = useState<string>(() => localStorage.getItem('quran_api_base') || 'https://api.quran.com');
    const [quranClientId, setQuranClientId] = useState<string | null>(() => localStorage.getItem('quran_client_id'));
    const [studyHistory, setStudyHistory] = useState<any[]>([]);
    const [userNotes, setUserNotes] = useState<any[]>([]);
    const [readingSessions, setReadingSessions] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    
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

    // Sync Local Token State with Storage
    useEffect(() => {
        const token = localStorage.getItem('quran_access_token');
        setOauthToken(token);
        setQuranApiBase(localStorage.getItem('quran_api_base') || 'https://apis-prelive.quran.foundation');
        setQuranClientId(localStorage.getItem('quran_client_id'));
    }, [isLoggedIn]);

    // Fetch User Activity (Bookmarks/History/Notes) from Quran.com User API
    useEffect(() => {
        if (!oauthToken) return;

        const fetchActivity = async () => {
            setHistoryLoading(true);
            try {
                // Parallel fetch all user activity using the Step 4 API Client helper
                // This ensures automatic header injection and 401 refresh handling
                const [bookRes, noteRes, sessionRes] = await Promise.all([
                    qfApiClient.fetch('user/bookmarks'),
                    qfApiClient.fetch('user/notes'),
                    qfApiClient.fetch('user/reading_sessions')
                ]);

                if (bookRes.ok) {
                    const data = await bookRes.json();
                    setStudyHistory(data.bookmarks || data.data || []);
                }
                if (noteRes.ok) {
                    const data = await noteRes.json();
                    setUserNotes(data.notes || data.data || []);
                }
                if (sessionRes.ok) {
                    const data = await sessionRes.json();
                    setReadingSessions(data.reading_sessions || data.data || []);
                }
            } catch (e) {
                console.error('Failed to fetch user activity', e);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchActivity();
    }, [oauthToken]);

    const handleConnect = () => {
        initiateLogin('chat');
    };

    const handleDisconnect = () => {
        setOauthToken(null);
        setStudyHistory([]);
        localStorage.removeItem('quran_access_token');
        localStorage.removeItem('quran_refresh_token');
        localStorage.removeItem('quran_api_base');
        localStorage.removeItem('quran_client_id');
    };

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
            // Inject study context (bookmarks, notes, history) if connected
            let finalUserQuery = currentInput;
            if (oauthToken && (studyHistory.length > 0 || userNotes.length > 0 || readingSessions.length > 0)) {
                const recentBooks = studyHistory.slice(0, 3).map(b => `${b.surah_name} ${b.verse_key}`).join(', ');
                const recentNotes = userNotes.slice(0, 2).map(n => `Reflected on ${n.verse_key}: "${n.text.slice(0, 40)}..."`).join('; ');
                const recentHistory = readingSessions.slice(0, 2).map(s => `Read ${s.surah_name}`).join(', ');
                
                finalUserQuery = `[USER STUDY CONTEXT: 
- Recent Bookmarks: ${recentBooks || 'None'} 
- Recent Reflections: ${recentNotes || 'None'}
- Latest Reading Activity: ${recentHistory || 'None'}]

${currentInput}`;
            }

            const contextMessages = messages.concat({ ...userMsg, content: finalUserQuery }).map(m => ({ role: m.role, content: m.content }));
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
        let references: any[] = [];
        let cleanedContent = content;

        // 1. Extract from [[CITATIONS: ... prefix at the end (robust against missing brackets)
        const citPrefix = "[[CITATIONS:";
        const idx = cleanedContent.lastIndexOf(citPrefix);
        if (idx !== -1) {
            const rawJson = cleanedContent.substring(idx + citPrefix.length).replace(/\]+[\s<]*$/, '').trim();
            try {
                const parsed = JSON.parse(rawJson);
                if (Array.isArray(parsed)) references.push(...parsed);
            } catch {
                // Try appending a missing closing bracket just in case
                try {
                    const parsed = JSON.parse(rawJson + ']');
                    if (Array.isArray(parsed)) references.push(...parsed);
                } catch { /* ignore invalid JSON */ }
            }
            cleanedContent = cleanedContent.substring(0, idx).trim();
        }

        // 2. Extract from ```json [...] ``` blocks that look like references
        const jsonBlockRegex = /```(?:json|javascript)?\s*(\[[\s\S]*?\])\s*```/gi;
        let match;
        while ((match = jsonBlockRegex.exec(cleanedContent)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (Array.isArray(parsed) && parsed.some(item => typeof item === 'object' && (item.type === 'quran' || item.type === 'hadith'))) {
                    references.push(...parsed);
                }
            } catch { /* ignore */ }
        }

        // 3. Clean the content by removing JSON blocks that we extracted
        cleanedContent = cleanedContent
            .replace(jsonBlockRegex, (matchStr, p1) => {
                try {
                    const parsed = JSON.parse(p1);
                    if (Array.isArray(parsed) && parsed.some(item => typeof item === 'object' && (item.type === 'quran' || item.type === 'hadith'))) {
                        return ''; // remove it
                    }
                } catch {}
                return matchStr; // keep if it wasn't a library citation
            })
            // Catch-all: strip any remaining ```json...``` or ```javascript...``` blocks
            .replace(/```(?:json|javascript)?\s*[\s\S]*?```/gi, '')
            // Strip unclosed trailing json blocks
            .replace(/```(?:json|javascript)?[\s\S]*$/i, '')
            .trim();

        // 4. Inline fallback: scan text for Quran/Hadith references when no structured citations found
        if (references.length === 0) {
            const seen = new Set<string>();

            // Match patterns like: (Surah Al-Baqarah, 2:255) or Al-Imran 3:185 or (5:4)
            const quranPattern = /\(?(?:Surah\s+)?([a-zA-Z\s'-]+),?\s*(\d+):(\d+)\)?/g;
            let q;
            while ((q = quranPattern.exec(cleanedContent)) !== null) {
                const source = `${q[1].trim()} ${q[2]}:${q[3]}`;
                if (!seen.has(source)) {
                    seen.add(source);
                    references.push({ type: 'quran', text: '', source });
                }
            }

            // Match patterns like: Sahih Bukhari #1234 or Muslim (Book 042, Hadith 7139) or Tirmidhi - Hadith 50
            const hadithPattern = /\b(?:Sahih\s+)?(Bukhari|Muslim|Tirmidhi|Abu\s*Da[vw]ud|Nasa[''\u2019]?i|Ibn\s*Majah|Riyad[h\s]us\s+Salihin|Adab\s+Al-Mufrad|Nawawi|Sunan\s+Ibn\s+Majah)(?:[^\d()#]*(?:Book\s*\d+,?\s*)?(?:Hadith\s*|#\s*)?(\d+))?\b/gi;
            let h;
            while ((h = hadithPattern.exec(cleanedContent)) !== null) {
                const source = h[2] ? `${h[1]} \u2013 Hadith ${h[2]}` : h[1];
                if (!seen.has(source)) {
                    seen.add(source);
                    references.push({ type: 'hadith', text: '', source });
                }
            }
        }

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
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto my-4 lg:my-8 h-auto lg:h-[750px] relative">
            {/* Sidebar Toggle for Mobile */}
            <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden absolute -top-12 left-0 p-3 bg-white dark:bg-slate-900 rounded-xl border border-outline-variant/30 text-[#34D399] z-50 shadow-md"
            >
                {showSidebar ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sessions Sidebar */}
            <aside className={`
                ${showSidebar ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'} 
                lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto
                transition-all duration-300
                absolute top-0 lg:relative z-50 lg:z-0
                w-[85%] sm:w-80 lg:w-72 h-full flex flex-col gap-4 shrink-0
            `}>
                <button 
                    onClick={() => createNewSession()}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-bold shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-98 transition-all uppercase tracking-widest text-[10px]"
                >
                    <Plus className="w-5 h-5" /> New Consultation
                </button>
                
                <div className="flex-1 bg-surface dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-4 border border-outline-variant/30 overflow-hidden flex flex-col shadow-sm">
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
            <div className="flex-1 flex flex-col bg-transparent lg:bg-surface dark:bg-transparent lg:dark:bg-slate-900 rounded-none lg:rounded-[3rem] shadow-none lg:shadow-2xl border-none lg:border lg:border-outline-variant/30 overflow-visible lg:overflow-hidden transition-colors duration-300 relative">
                {/* Header */}
                <header className="px-8 py-6 border-b border-outline-variant/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md lg:bg-surface-container-low/50 lg:dark:bg-slate-950/20 flex items-center justify-between sticky top-16 lg:relative z-30">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-2.5 rounded-2xl">
                            <Scroll className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base md:text-lg text-on-surface dark:text-white leading-tight">Sheikh AI</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-bold uppercase tracking-widest">Verified Scholarly Context</span>
                                {oauthToken && !historyLoading && (
                                    <>
                                        <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5" /> Study Synced
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {oauthToken ? (
                            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1.5">
                                        {historyLoading && <span className="w-2 h-2 border border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                                        Personal Library Connected
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-bold uppercase transition-all">
                                        {historyLoading ? 'Loading study context…' : `${studyHistory.length} Bookmarks · ${userNotes.length} Notes · ${readingSessions.length} History`}
                                    </span>
                                </div>
                                <button 
                                    onClick={handleDisconnect}
                                    className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                    title="Disconnect"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnect}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-outline-variant/30 hover:border-emerald-500/40 rounded-2xl transition-all group"
                            >
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#34D399]">Connect Quran.com</span>
                                    <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Discuss My Study</span>
                                </div>
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                    </div>
                </header>

                {/* Messages Body */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-visible lg:overflow-y-auto p-4 md:p-8 pt-28 lg:pt-32 space-y-6 md:space-y-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed dark:bg-none"
                    style={{ minHeight: '300px' }}
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
                                    max-w-[90%] md:max-w-[85%] p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] transition-colors
                                    ${m.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-xl shadow-emerald-900/20'
                                        : 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-white rounded-tl-none shadow-sm border border-outline-variant/20'}
                                `}>
                                    <div className="flex items-center gap-2 mb-3 opacity-60">
                                        {m.role === 'assistant' ? <Sparkles className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                            {m.role === 'assistant' ? 'Sheikh AI' : 'Your Query'}
                                        </span>
                                    </div>

                                    <div className="text-sm md:text-base leading-relaxed font-medium">
                                        {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                                    </div>

                                    {/* References Block */}
                                    {m.references && m.references.length > 0 && (
                                        <div className="mt-6 border border-outline-variant/30 rounded-3xl bg-surface-container-low dark:bg-white/[0.02] shadow-sm overflow-hidden transition-all">
                                            <button 
                                                onClick={() => toggleRefs(m.id)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-emerald-500/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-black tracking-[0.2em] uppercase text-[10px]">
                                                    {hiddenRefs.has(m.id) ? 'SEE CITATIONS' : 'SEE LESS'}
                                                </div>
                                            </button>
                                            
                                            <div className={`px-4 pb-4 transition-all duration-300 ${hiddenRefs.has(m.id) ? 'hidden' : 'block'}`}>
                                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant dark:text-slate-500 mb-3 pl-2 border-t border-outline-variant/20 pt-4">
                                                    <ExternalLink className="w-3.5 h-3.5" /> OPEN IN KNOWLEDGE LIBRARY
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {m.references.map((ref, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (ref.type === 'hadith') {
                                                                    // Parse 'Sahih Bukhari 1234' or 'Bukhari — Hadith 1234' into library deep-link format
                                                                    const collMap: Record<string, string> = {
                                                                        'bukhari': 'eng-bukhari', 'muslim': 'eng-muslim', 'abu dawud': 'eng-abudawud', 'abudawud': 'eng-abudawud',
                                                                        'tirmidhi': 'eng-tirmidhi', "nasa'i": 'eng-nasai', 'nasai': 'eng-nasai',
                                                                        'ibn majah': 'eng-ibnmajah', 'ibnmajah': 'eng-ibnmajah', 'nawawi': 'eng-nawawi',
                                                                        'riyadhus': 'eng-riyadussalihin', 'riyadussalihin': 'eng-riyadussalihin', 'adab': 'eng-adab',
                                                                    };
                                                                    const src = ref.source || '';
                                                                    const numMatch = src.match(/(\d+)/);
                                                                    const num = numMatch ? numMatch[1] : '';
                                                                    const srcLower = src.toLowerCase();
                                                                    let collId = 'eng-bukhari'; // default
                                                                    for (const [key, val] of Object.entries(collMap)) {
                                                                        if (srcLower.includes(key)) { collId = val; break; }
                                                                    }
                                                                    onOpenLibrary('hadith', `${collId}:${num}`);
                                                                } else if (ref.type === 'quran') {
                                                                    const qMatch = (ref.source || '').match(/(\d+:\d+)/);
                                                                    const cleanQuery = qMatch ? qMatch[1] : ref.source;
                                                                    onOpenLibrary(ref.type, cleanQuery);
                                                                } else {
                                                                    onOpenLibrary(ref.type, ref.source);
                                                                }
                                                            }}
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
                <footer className="p-4 md:p-6 bg-surface dark:bg-slate-900 border-t border-outline-variant/30 transition-colors duration-300 sticky bottom-0 lg:relative z-20">
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
                            className="w-full bg-surface-container-low dark:bg-slate-800 border-none text-on-surface dark:text-white pl-6 md:pl-8 pr-16 py-4 md:py-5 rounded-[2rem] md:rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-base md:text-lg placeholder:text-on-surface-variant/40 shadow-inner resize-none overflow-y-auto min-h-[56px] md:min-h-[64px]"
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
