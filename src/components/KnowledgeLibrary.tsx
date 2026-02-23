import React, { useState, useEffect, useRef } from 'react';
import { Search, Book, Filter, ChevronRight, Hash, CheckCircle2, AlertCircle, HelpCircle, X, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, BookOpen, ExternalLink, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KnowledgeLibraryProps {
    initialTab?: 'quran' | 'hadith';
    initialQuery?: string;
}

// Format surah/ayah numbers with leading zeros for audio CDN
const pad = (n: number, len: number) => String(n).padStart(len, '0');

// Word-by-word Quran API (fawazahmed0 CDN)
const getWordByWordUrl = (surahNum: number) =>
    `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-json@1/data/editions/quran-wordbyword/${surahNum}.json`;

const KnowledgeLibrary: React.FC<KnowledgeLibraryProps> = ({ initialTab, initialQuery }) => {
    const [subTab, setSubTab] = useState<'quran' | 'hadith'>(initialTab || 'quran');
    const [viewMode, setViewMode] = useState<'search' | 'browse'>(initialQuery ? 'search' : 'browse');
    const [searchQuery, setSearchQuery] = useState(initialQuery || '');
    const [results, setResults] = useState<any[]>([]);
    const [surahs, setSurahs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('eng-bukhari');
    const [hadithPage, setHadithPage] = useState(0);
    const [gradeFilter, setGradeFilter] = useState<string | null>('Sahih');
    const [showGlossary, setShowGlossary] = useState(false);
    const [currentSurah, setCurrentSurah] = useState<number | null>(null);
    const [wordByWord, setWordByWord] = useState<Record<number, any[]>>({}); // ayah number → words[]
    const [wbwLoading, setWbwLoading] = useState(false);
    const [showWbw, setShowWbw] = useState(false);

    // Tafsir modal state
    const [tafsirAyah, setTafsirAyah] = useState<any | null>(null); // the verse object
    const [tafsirText, setTafsirText] = useState<string>('');
    const [tafsirLoading, setTafsirLoading] = useState(false);
    const [tafsirExpanded, setTafsirExpanded] = useState(false);

    // Audio state
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingAyah, setPlayingAyah] = useState<string | null>(null); // "surah:ayah"
    const [, setAudioLoading] = useState(false);

    const collections = [
        { id: 'eng-bukhari', name: 'Sahih Bukhari' },
        { id: 'eng-muslim', name: 'Sahih Muslim' },
        { id: 'eng-abudawud', name: 'Sunan Abu Dawud' },
        { id: 'eng-tirmidhi', name: 'Jami at-Tirmidhi' },
        { id: 'eng-nasai', name: "Sunan an-Nasa'i" },
        { id: 'eng-ibnmajah', name: 'Sunan Ibn Majah' },
    ];

    const gradeMap: Record<string, string> = {
        'Sahih': 'Authentic',
        'Hasan': 'Good',
        'Daif': 'Weak',
        'Maudu': 'Fabricated'
    };

    const fetchSurahList = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('https://api.alquran.cloud/v1/surah');
            const data = await res.json();
            setSurahs(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWordByWord = async (surahNum: number) => {
        if (wordByWord[surahNum]) return; // cached
        setWbwLoading(true);
        try {
            const res = await fetch(getWordByWordUrl(surahNum));
            if (!res.ok) return;
            const data = await res.json();
            // data is array of ayahs, each ayah has array of words with {text, translation}
            const byAyah: Record<number, any[]> = {};
            (data || []).forEach((ayah: any) => {
                byAyah[ayah.verse] = ayah.words || [];
            });
            setWordByWord(prev => ({ ...prev, [surahNum]: data }));
        } catch (err) {
            console.error('WBW error:', err);
        } finally {
            setWbwLoading(false);
        }
    };

    const fetchQuran = async (query: string | number) => {
        setIsLoading(true);
        setViewMode('search');
        stopAudio();
        try {
            const isNumber = !isNaN(Number(query));
            if (isNumber) {
                const num = Number(query);
                setCurrentSurah(num);
                const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,en.asad`);
                const data = await res.json();
                const arabicAyahs = data.data[0].ayahs;
                const englishAyahs = data.data[1].ayahs;
                const surahName = data.data[0].englishName;
                const surahNumber = data.data[0].number;

                setResults(arabicAyahs.map((a: any, idx: number) => ({
                    text: englishAyahs[idx].text,
                    arabic: a.text,
                    reference: `${surahName} ${query}:${a.numberInSurah}`,
                    type: 'Quran',
                    surahNumber,
                    ayahNumber: a.numberInSurah,
                })));

                // Prefetch word-by-word in background
                fetchWordByWord(num);
            } else {
                setCurrentSurah(null);
                const res = await fetch(`https://api.alquran.cloud/v1/search/${query}/all/en.asad`);
                const data = await res.json();

                if (data.data && data.data.matches) {
                    const searchResults = data.data.matches.slice(0, 50);
                    setResults(searchResults.map((r: any) => ({
                        text: r.text,
                        reference: `${r.surah.englishName} ${r.surah.number}:${r.numberInSurah}`,
                        type: 'Quran',
                        surahNumber: r.surah.number,
                        ayahNumber: r.numberInSurah,
                    })));
                } else {
                    setResults([]);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHadith = async (query: string = '', page: number = 0) => {
        setIsLoading(true);
        setViewMode('search');
        try {
            const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${selectedCollection}.json`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('API request failed');
            const data = await res.json();

            let hadithList = (data.hadiths || []).filter((h: any) => h.text && h.text.trim().length > 0);

            let filtered = hadithList;
            if (query) {
                const searchTerms = query.toLowerCase().split(' ').filter((t: string) => t.length > 2);
                filtered = filtered.map((h: any) => {
                    let score = 0;
                    const hText = h.text.toLowerCase();
                    const hRef = h.hadithnumber ? h.hadithnumber.toString() : '';
                    if (hText.includes(query.toLowerCase()) || hRef === query) score += 10;
                    searchTerms.forEach((term: string) => {
                        if (hText.includes(term)) score += (hText.split(term).length - 1);
                    });
                    return { ...h, score };
                }).filter((h: any) => h.score > 0 || h.text.toLowerCase().includes(query.toLowerCase()));
                filtered.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
            }

            if (gradeFilter) {
                filtered = filtered.filter((h: any) => {
                    const hGrades = h.grades || [];
                    if (hGrades.length === 0 && (selectedCollection === 'eng-bukhari' || selectedCollection === 'eng-muslim')) {
                        return gradeFilter.toLowerCase() === 'sahih';
                    }
                    return hGrades.some((g: any) => g.grade.toLowerCase().includes(gradeFilter.toLowerCase()));
                });
            }

            const pageSize = 15;
            const chunk = filtered.slice(page * pageSize, (page + 1) * pageSize);

            setResults(chunk.map((h: any) => {
                let hGrades = h.grades || [];
                if (hGrades.length === 0 && (selectedCollection === 'eng-bukhari' || selectedCollection === 'eng-muslim')) {
                    hGrades = [{ grade: 'Sahih', name: 'Al-Bukhari & Muslim' }];
                }

                return {
                    text: h.text,
                    reference: `${collections.find(c => c.id === selectedCollection)?.name} - Hadith ${h.hadithnumber}`,
                    type: 'Hadith',
                    grades: hGrades
                };
            }));
        } catch (err) {
            console.error(err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Audio: Mishary Rashid al-Afasy recitation via everyayah.com
    const playAudio = (surahNum: number, ayahNum: number) => {
        const key = `${surahNum}:${ayahNum}`;
        if (playingAyah === key) {
            stopAudio();
            return;
        }
        stopAudio();
        const url = `https://everyayah.com/data/Alafasy_128kbps/${pad(surahNum, 3)}${pad(ayahNum, 3)}.mp3`;
        const audio = new Audio(url);
        audioRef.current = audio;
        setAudioLoading(true);
        setPlayingAyah(key);
        audio.oncanplay = () => setAudioLoading(false);
        audio.onended = () => {
            setPlayingAyah(null);
            audioRef.current = null;
        };
        audio.onerror = () => {
            setPlayingAyah(null);
            setAudioLoading(false);
            audioRef.current = null;
        };
        audio.play().catch(() => setPlayingAyah(null));
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setPlayingAyah(null);
        setAudioLoading(false);
    };

    // Play all ayahs in sequence (play surah)
    const playNextAyah = (surahNum: number, fromAyah: number, total: number) => {
        if (fromAyah > total) { setPlayingAyah(null); return; }
        const key = `${surahNum}:${fromAyah}`;
        const url = `https://everyayah.com/data/Alafasy_128kbps/${pad(surahNum, 3)}${pad(fromAyah, 3)}.mp3`;
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingAyah(key);
        audio.onended = () => playNextAyah(surahNum, fromAyah + 1, total);
        audio.onerror = () => setPlayingAyah(null);
        audio.play().catch(() => setPlayingAyah(null));
    };

    // Tafsir: Ibn Kathir (English) from jsdelivr CDN
    const fetchTafsir = async (res: any) => {
        setTafsirAyah(res);
        setTafsirText('');
        setTafsirLoading(true);
        setTafsirExpanded(false);
        try {
            const url = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir/${res.surahNumber}/${res.ayahNumber}.json`;
            const r = await fetch(url);
            if (!r.ok) throw new Error('not found');
            const data = await r.json();
            setTafsirText(data.text || data.content || '');
        } catch {
            setTafsirText('');
        } finally {
            setTafsirLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'browse' && subTab === 'quran') {
            fetchSurahList();
            fetchQuran(1);
        }
        if (subTab === 'hadith' && !searchQuery) {
            fetchHadith('', hadithPage);
        }
    }, [subTab, viewMode, selectedCollection, gradeFilter, hadithPage]);

    useEffect(() => {
        if (searchQuery.length > 2 && !initialQuery) {
            const delayDebounceFn = setTimeout(() => {
                if (subTab === 'quran') fetchQuran(searchQuery);
                else fetchHadith(searchQuery, 0);
            }, 600);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (initialQuery) {
            setSearchQuery(initialQuery);
            if (initialTab) {
                setSubTab(initialTab);
                if (initialTab === 'quran') fetchQuran(initialQuery);
                else fetchHadith(initialQuery, 0);
            }
        }
    }, [initialQuery, initialTab]);

    // Get WBW for a specific ayah
    const getAyahWords = (surahNum: number, ayahNum: number): any[] => {
        const surahData = wordByWord[surahNum];
        if (!surahData) return [];
        const ayah = surahData.find((a: any) => a.verse === ayahNum);
        return ayah?.words || [];
    };

    const isPlayingSurah = currentSurah && playingAyah?.startsWith(`${currentSurah}:`);

    return (
        <div className="max-w-7xl mx-auto py-12 px-6 animate-fade-in relative">
            {/* Glossary Overlay */}
            <AnimatePresence>
                {showGlossary && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-md cursor-pointer"
                        onClick={() => setShowGlossary(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass w-full max-w-2xl rounded-[3rem] p-8 md:p-12 relative shadow-2xl bg-slate-900 border border-emerald-500/30 cursor-default"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowGlossary(false)}
                                className="absolute top-6 right-6 md:top-8 md:right-8 text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>

                            <h3 className="text-3xl md:text-4xl font-black mb-10 gold-text uppercase tracking-tighter">Grading Definitions</h3>

                            <div className="space-y-10">
                                <div className="space-y-3">
                                    <h4 className="text-xl md:text-2xl font-bold text-emerald-400">Authentic (Sahih)</h4>
                                    <p className="text-slate-400 text-lg leading-relaxed font-medium">Verified reports with continuous chains of reliable narrators. This is the highest standard of verification.</p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xl md:text-2xl font-bold text-blue-400">Good (Hasan)</h4>
                                    <p className="text-slate-400 text-lg leading-relaxed font-medium">Reliable reports where narrators are trustworthy but might have slightly lower precision than the highest tier.</p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xl md:text-2xl font-bold text-amber-500">Weak (Da'if)</h4>
                                    <p className="text-slate-400 text-lg leading-relaxed font-medium">Reports with identified gaps or flaws in the chain. These are useful for wisdom but not for primary law.</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowGlossary(false)}
                                className="w-full mt-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-sm shadow-xl shadow-emerald-900/20"
                            >
                                Got it, Back to Library
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tafsir Modal */}
            <AnimatePresence>
                {tafsirAyah && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-lg cursor-pointer"
                        onClick={() => { setTafsirAyah(null); setTafsirText(''); }}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] bg-[#0a0f0d] border border-amber-500/20 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl shadow-amber-900/10 cursor-default"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            {/* Modal header */}
                            <div className="flex items-start justify-between gap-4 p-8 pb-4 border-b border-white/5 shrink-0">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-amber-500/10 text-amber-500">Tafsir</span>
                                        <span className="text-sm text-slate-400 font-medium">{tafsirAyah?.reference}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-bold">Explanation by Imam Ibn Kathir</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {tafsirAyah?.surahNumber && tafsirAyah?.ayahNumber && (
                                        <a
                                            href={`https://quran.com/${tafsirAyah.surahNumber}/${tafsirAyah.ayahNumber}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-amber-500/20 text-amber-500/70 hover:text-amber-400 hover:border-amber-500/40 transition-all"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            quran.com
                                        </a>
                                    )}
                                    <button
                                        onClick={() => { setTafsirAyah(null); setTafsirText(''); }}
                                        className="text-slate-500 hover:text-white transition-colors p-1"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable content */}
                            <div className="overflow-y-auto flex-1 p-8 space-y-8">
                                {/* Arabic */}
                                {tafsirAyah?.arabic && (
                                    <p className="text-3xl font-arabic text-right leading-[2.2] text-amber-100/90">
                                        {tafsirAyah.arabic}
                                    </p>
                                )}

                                {/* English translation */}
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-3">Translation (Muhammad Asad)</p>
                                    <p className="text-lg text-slate-200 font-serif leading-relaxed">
                                        {tafsirAyah?.text}
                                    </p>
                                </div>

                                {/* Tafsir body */}
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/50">Commentary</p>
                                    {tafsirLoading ? (
                                        <div className="flex items-center gap-3 py-8 justify-center">
                                            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm font-bold text-slate-500">Loading commentary...</span>
                                        </div>
                                    ) : tafsirText ? (
                                        <div className="space-y-4">
                                            <div className={`text-base text-slate-300 leading-relaxed whitespace-pre-line font-medium transition-all ${tafsirExpanded ? '' : 'line-clamp-[20]'}`}>
                                                {tafsirText}
                                            </div>
                                            {!tafsirExpanded && tafsirText.length > 600 && (
                                                <button
                                                    onClick={() => setTafsirExpanded(true)}
                                                    className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-bold transition-colors"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                    Read full tafsir
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center">
                                            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                                            <p className="text-slate-500 font-medium">Tafsir not available for this verse.</p>
                                            <a
                                                href={`https://quran.com/${tafsirAyah?.surahNumber}/${tafsirAyah?.ayahNumber}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-bold transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                View on quran.com
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
                <div>
                    <h2 className="text-5xl font-black mb-3 gold-text tracking-tighter">Knowledge Library</h2>
                    <p className="text-slate-400 text-lg font-medium">Search thousands of records by keyword or browsing by collection.</p>
                </div>

                <div className="flex gap-4 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-xl shrink-0">
                    <button
                        onClick={() => { setSubTab('quran'); setViewMode('browse'); setResults([]); setSearchQuery(''); stopAudio(); }}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'quran' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Book className="w-4 h-4" />
                        Holy Quran
                    </button>
                    <button
                        onClick={() => { setSubTab('hadith'); setViewMode('search'); setResults([]); setSearchQuery(''); setHadithPage(0); stopAudio(); }}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'hadith' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Hash className="w-4 h-4" />
                        Hadith Corpus
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col gap-6 mb-12">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                        type="text"
                        placeholder={subTab === 'quran' ? "Search for words like 'patience', 'faith', 'prayer'..." : "Search for words like 'intention', 'charity', 'manners'..."}
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 px-16 py-6 rounded-[2rem] text-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                    />
                </div>

                {subTab === 'hadith' && (
                    <div className="flex flex-wrap gap-4 items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mr-2 flex items-center gap-1.5">
                                <Filter className="w-3.5 h-3.5" /> Quality:
                            </span>
                            {['Sahih', 'Hasan', 'Daif'].map(grade => (
                                <button
                                    key={grade}
                                    onClick={() => { setGradeFilter(gradeFilter === grade ? null : grade); setHadithPage(0); }}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${gradeFilter === grade ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-emerald-500/30'}`}
                                >
                                    {gradeMap[grade]}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowGlossary(true)}
                            className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-white transition-colors group"
                        >
                            <HelpCircle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            Guide to Authenticity
                        </button>
                    </div>
                )}

                {/* Quran toolbar: word-by-word toggle + play surah button */}
                {subTab === 'quran' && results.length > 0 && currentSurah && (
                    <div className="flex flex-wrap gap-3 items-center justify-between bg-amber-500/5 p-4 rounded-3xl border border-amber-500/10">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-500/60">Surah Tools:</span>
                            <button
                                onClick={() => {
                                    setShowWbw(!showWbw);
                                    if (!showWbw && currentSurah) fetchWordByWord(currentSurah);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showWbw ? 'bg-amber-500 border-amber-400 text-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:border-amber-500/30'}`}
                            >
                                Word-by-Word Translation
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recitation (Alafasy):</span>
                            <button
                                onClick={() => {
                                    if (isPlayingSurah) {
                                        stopAudio();
                                    } else {
                                        playNextAyah(currentSurah, 1, results.length);
                                    }
                                }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPlayingSurah ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500'}`}
                            >
                                {isPlayingSurah ? <><VolumeX className="w-3.5 h-3.5" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Play Surah</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-[320px_1fr] gap-12">
                {/* Sidebar Navigation */}
                <div className="space-y-8 order-2 lg:order-1">
                    <div className="glass p-6 rounded-[2rem] border border-white/5">
                        <h4 className={`font-black text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2 ${subTab === 'quran' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            <Filter className="w-4 h-4" /> {subTab === 'quran' ? 'Chapters' : 'Collections'}
                        </h4>
                        <div className="space-y-1 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                            {subTab === 'hadith' ? collections.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedCollection(c.id); setResults([]); setHadithPage(0); }}
                                    className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${selectedCollection === c.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                                >
                                    {c.name}
                                    <ChevronRight className={`w-4 h-4 ${selectedCollection === c.id ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                            )) : surahs.map(s => (
                                <button
                                    key={s.number}
                                    onClick={() => fetchQuran(s.number)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all flex items-center gap-3 group ${currentSurah === s.number ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-white/5'}`}
                                >
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${currentSurah === s.number ? 'bg-amber-500 text-black' : 'text-amber-500/50 bg-amber-500/5'}`}>{s.number}</span>
                                    <div className="flex flex-col min-w-0">
                                        {/* Arabic name */}
                                        <span className="text-white font-black text-sm leading-tight">{s.name}</span>
                                        {/* English transliteration */}
                                        <span className={`text-[11px] font-bold ${currentSurah === s.number ? 'text-amber-400' : 'text-slate-500'}`}>{s.englishName}</span>
                                        {/* English meaning */}
                                        <span className={`text-[10px] font-medium italic ${currentSurah === s.number ? 'text-amber-300/70' : 'text-slate-600'}`}>"{s.englishNameTranslation}"</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main View Area */}
                <div className="order-1 lg:order-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-30">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="font-bold tracking-[0.3em] text-[10px] uppercase">Searching Tradition...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {results.length > 0 ? (
                                results.map((res, idx) => {
                                    const ayahKey = `${res.surahNumber}:${res.ayahNumber}`;
                                    const isThisPlaying = playingAyah === ayahKey;
                                    const ayahWords = (showWbw && res.surahNumber && res.ayahNumber)
                                        ? getAyahWords(res.surahNumber, res.ayahNumber) : [];

                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className={`glass p-8 rounded-[2.5rem] border transition-all group ${isThisPlaying ? 'border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-900/20' : 'border-white/5 border-l-4 border-l-transparent hover:border-l-emerald-500'}`}
                                        >
                                            {/* Card header */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                                                <div className="flex items-center gap-3 font-bold">
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${res.type === 'Quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {res.type}
                                                    </span>
                                                    <span className="text-sm text-slate-500 font-medium">{res.reference}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Hadith grades */}
                                                    {res.type === 'Hadith' && res.grades && res.grades.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {res.grades.map((g: any, i: number) => {
                                                                const cleanGrade = g.grade.replace(/ Sahih| Sahih| Hasan| Daif/g, '');
                                                                const simpleLabel = gradeMap[cleanGrade] || gradeMap[g.grade] || g.grade;
                                                                return (
                                                                    <div key={i} className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${g.grade.toLowerCase().includes('sahih') ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-400' : g.grade.toLowerCase().includes('hasan') ? 'bg-blue-400/5 border-blue-400/20 text-blue-400' : 'bg-amber-400/5 border-amber-400/20 text-amber-500'}`}>
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        {simpleLabel} <span className="opacity-40 ml-1 font-medium">— {g.name}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Per-ayah play + tafsir buttons */}
                                                    {res.type === 'Quran' && res.surahNumber && res.ayahNumber && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => playAudio(res.surahNumber, res.ayahNumber)}
                                                                title="Play recitation"
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isThisPlaying ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/5'}`}
                                                            >
                                                                {isThisPlaying
                                                                    ? <><Pause className="w-3 h-3" /> Stop</>
                                                                    : <><Play className="w-3 h-3" /> Play</>
                                                                }
                                                            </button>
                                                            <button
                                                                onClick={() => fetchTafsir(res)}
                                                                title="Read tafsir explanation"
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
                                                            >
                                                                <BookOpen className="w-3 h-3" /> Tafsir
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Arabic text */}
                                            {res.arabic && (
                                                <p className="text-4xl font-arabic text-right mb-8 leading-[2] text-amber-100/90 selection:bg-amber-500/30">
                                                    {res.arabic}
                                                </p>
                                            )}

                                            {/* Word-by-word display */}
                                            {showWbw && ayahWords.length > 0 && (
                                                <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/50 mb-3">Word-by-Word</p>
                                                    <div className="flex flex-wrap gap-3 justify-end" dir="rtl">
                                                        {ayahWords.map((w: any, wi: number) => (
                                                            <div key={wi} className="flex flex-col items-center gap-1" dir="ltr">
                                                                <span className="text-xl font-arabic text-amber-200/80">{w.text}</span>
                                                                <span className="text-[9px] text-slate-500 font-medium text-center max-w-[80px] leading-tight">{w.translation}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {showWbw && !wbwLoading && ayahWords.length === 0 && res.type === 'Quran' && (
                                                <div className="mb-4 text-[10px] text-slate-600 font-bold italic">Word-by-word data loading...</div>
                                            )}

                                            {/* Translation */}
                                            <p className={`text-xl text-slate-200 selection:bg-emerald-500/30 font-medium leading-relaxed ${res.type === 'Quran' ? 'font-serif' : 'font-sans'}`}>
                                                {res.text}
                                            </p>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-32 glass rounded-[3rem] border border-white/5">
                                    <AlertCircle className="w-16 h-16 mx-auto mb-6 opacity-20 text-emerald-400" />
                                    <p className="text-2xl font-bold tracking-tight mb-2 uppercase text-slate-400">Search Yielded No Results</p>
                                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Try searching for broader keywords like "Prayer" or "Faith". Ensuring your spelling is correct.</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setGradeFilter(null); }}
                                        className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            )}

                            {results.length > 0 && !searchQuery && subTab === 'hadith' && (
                                <div className="flex justify-center gap-4 pt-12">
                                    <button
                                        disabled={hadithPage === 0}
                                        onClick={() => { setHadithPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="flex items-center gap-2 px-8 py-3 bg-slate-900 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all hover:bg-slate-800"
                                    >
                                        <SkipBack className="w-3.5 h-3.5" /> Previous
                                    </button>
                                    <button
                                        onClick={() => { setHadithPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 shadow-lg shadow-emerald-500/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 text-white"
                                    >
                                        Next Page <SkipForward className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeLibrary;
