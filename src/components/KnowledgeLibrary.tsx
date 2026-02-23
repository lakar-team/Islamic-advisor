import React, { useState, useEffect } from 'react';
import { Search, Book, Bookmark, Info, Star, Filter, ChevronRight, Hash, LayoutGrid, List, Languages } from 'lucide-react';
import { motion } from 'framer-motion';

const KnowledgeLibrary: React.FC = () => {
    const [subTab, setSubTab] = useState<'quran' | 'hadith'>('quran');
    const [viewMode, setViewMode] = useState<'search' | 'browse'>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [surahs, setSurahs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('eng-bukhari');
    const [hadithPage, setHadithPage] = useState(0);

    const collections = [
        { id: 'eng-bukhari', name: 'Sahih Bukhari' },
        { id: 'eng-muslim', name: 'Sahih Muslim' },
        { id: 'eng-abudawud', name: 'Sunan Abu Dawud' },
        { id: 'eng-tirmidhi', name: 'Jami at-Tirmidhi' },
        { id: 'eng-nasai', name: 'Sunan an-Nasa\'i' },
        { id: 'eng-ibnmajah', name: 'Sunan Ibn Majah' },
    ];

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

    const fetchQuran = async (query: string | number) => {
        setIsLoading(true);
        setViewMode('search');
        try {
            const isNumber = !isNaN(Number(query));

            if (isNumber) {
                // Fetch both Arabic (uthmani) and English (asad)
                const res = await fetch(`https://api.alquran.cloud/v1/surah/${query}/editions/quran-uthmani,en.asad`);
                const data = await res.json();

                const arabicAyahs = data.data[0].ayahs;
                const englishAyahs = data.data[1].ayahs;
                const surahName = data.data[0].englishName;

                setResults(arabicAyahs.slice(0, 50).map((a: any, idx: number) => ({
                    text: englishAyahs[idx].text,
                    arabic: a.text,
                    reference: `${surahName} ${query}:${a.numberInSurah}`,
                    type: 'Quran'
                })));
            } else {
                const res = await fetch(`https://api.alquran.cloud/v1/search/${query}/all/en.asad`);
                const data = await res.json();

                setResults(data.data.results.slice(0, 20).map((r: any) => ({
                    text: r.text,
                    reference: `${r.surah.englishName} ${r.surah.number}:${r.numberInSurah}`,
                    type: 'Quran'
                })));
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
            const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${selectedCollection}.json`);
            const data = await res.json();

            let filtered = data.hadiths;
            if (query) {
                filtered = filtered.filter((h: any) =>
                    h.text.toLowerCase().includes(query.toLowerCase())
                );
            }

            const pageSize = 15;
            const chunk = filtered.slice(page * pageSize, (page + 1) * pageSize);

            setResults(chunk.map((h: any) => ({
                text: h.text,
                reference: `${collections.find(c => c.id === selectedCollection)?.name} - Hadith ${h.hadithnumber}`,
                type: 'Hadith',
                grade: h.grades?.[0]?.grade || 'Sahih'
            })));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'browse' && subTab === 'quran') fetchSurahList();
        if (subTab === 'hadith' && !searchQuery) fetchHadith('', 0);
    }, [subTab, viewMode, selectedCollection]);

    useEffect(() => {
        if (searchQuery.length > 2) {
            const delayDebounceFn = setTimeout(() => {
                if (subTab === 'quran') fetchQuran(searchQuery);
                else fetchHadith(searchQuery, 0);
            }, 600);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery]);

    return (
        <div className="max-w-7xl mx-auto py-12 px-6 animate-fade-in">
            {/* Header / Tabs */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
                <div>
                    <h2 className="text-5xl font-black mb-3 gold-text tracking-tighter">Knowledge Library</h2>
                    <p className="text-slate-400 text-lg font-medium">Authentic reference with full Arabic text and graded narrations.</p>
                </div>

                <div className="flex gap-4 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <button
                        onClick={() => { setSubTab('quran'); setViewMode('browse'); setResults([]); setSearchQuery(''); }}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'quran' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Book className="w-4 h-4" />
                        Holy Quran
                    </button>
                    <button
                        onClick={() => { setSubTab('hadith'); setViewMode('search'); setResults([]); setSearchQuery(''); }}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'hadith' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Hash className="w-4 h-4" />
                        Hadith Corpus
                    </button>
                </div>
            </div>

            {/* View Selection & Search */}
            <div className="flex flex-col md:flex-row gap-6 mb-12">
                <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                        type="text"
                        placeholder={subTab === 'quran' ? "Search by keyword or verse number..." : "Search across collections..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 px-16 py-6 rounded-[2rem] text-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-700 font-medium"
                    />
                </div>

                <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 shrink-0">
                    <button
                        onClick={() => setViewMode('browse')}
                        className={`p-3 rounded-xl transition-all ${viewMode === 'browse' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                        title="Browse Mode"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('search')}
                        className={`p-3 rounded-xl transition-all ${viewMode === 'search' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                        title="Search Results"
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[280px_1fr] gap-12">
                {/* Sidebar Navigation */}
                <div className="space-y-8 order-2 lg:order-1">
                    <div className="glass p-6 rounded-[2rem] border border-white/5">
                        <h4 className={`font-black text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2 ${subTab === 'quran' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            <Filter className="w-4 h-4" /> {subTab === 'quran' ? 'Browse Index' : 'Hadith Sources'}
                        </h4>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                            {subTab === 'hadith' ? collections.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedCollection(c.id); setResults([]); }}
                                    className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${selectedCollection === c.id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                >
                                    {c.name}
                                    <ChevronRight className={`w-4 h-4 ${selectedCollection === c.id ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                            )) : surahs.map(s => (
                                <button
                                    key={s.number}
                                    onClick={() => fetchQuran(s.number)}
                                    className="w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all flex items-center gap-3"
                                >
                                    <span className="text-amber-500/50 w-6">{s.number}</span>
                                    {s.englishName}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent">
                        <Languages className="w-8 h-8 text-amber-500 mb-6" />
                        <h4 className="font-black text-xs tracking-[0.2em] uppercase text-amber-500 mb-4">Dual Language</h4>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            Quranic results now show the original Uthmani Arabic text alongside English translations.
                        </p>
                    </div>
                </div>

                {/* Main View Area */}
                <div className="order-1 lg:order-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-30">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="font-bold tracking-[0.3em] text-[10px] uppercase">Retrieving Sacred Text...</p>
                        </div>
                    ) : viewMode === 'browse' && subTab === 'quran' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {surahs.map(s => (
                                <motion.button
                                    key={s.number}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    onClick={() => fetchQuran(s.number)}
                                    className="glass p-6 rounded-3xl border border-white/5 text-left group hover:border-amber-500/30 transition-all flex items-center gap-4 bg-white/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500 transition-colors">
                                        <span className="font-black text-amber-500 group-hover:text-white transition-colors">{s.number}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors">{s.englishName}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.englishNameTranslation}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-xl font-arabic text-amber-500/40 font-bold">{s.name.replace('سُورَةُ ', '')}</p>
                                        <p className="text-[10px] text-slate-600 font-bold">{s.numberOfAyahs} V</p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {results.length > 0 ? (
                                results.map((res, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="glass p-10 rounded-[2.5rem] border border-white/5 border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5 opacity-60">
                                            <div className="flex items-center gap-4">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${res.type === 'Quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    {res.type}
                                                </span>
                                                <span className="text-sm font-bold text-slate-500 tracking-tight">{res.reference}</span>
                                            </div>
                                            {res.grade && (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-400/5 px-4 py-2 rounded-xl border border-emerald-400/20">
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                    {res.grade.toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {res.arabic && (
                                            <p className="text-4xl font-arabic text-right mb-10 leading-[1.8] text-amber-100/90 selection:bg-amber-500/30">
                                                {res.arabic}
                                            </p>
                                        )}

                                        <p className={`text-2xl text-slate-300 selection:bg-emerald-500/30 font-medium leading-relaxed ${res.type === 'Quran' ? 'font-serif' : 'font-sans'}`}>
                                            {res.text}
                                        </p>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-32 text-slate-600">
                                    <Info className="w-16 h-16 mx-auto mb-6 opacity-10" />
                                    <p className="text-2xl font-bold tracking-tight mb-2 uppercase">End of Index</p>
                                    <p className="text-slate-500 max-w-sm mx-auto">Selected source is currently being indexed. Try searching for a specific topic above.</p>
                                </div>
                            )}

                            {subTab === 'hadith' && results.length > 0 && !searchQuery && (
                                <div className="flex justify-center gap-4 pt-8">
                                    <button
                                        disabled={hadithPage === 0}
                                        onClick={() => { setHadithPage(p => p - 1); fetchHadith('', hadithPage - 1); window.scrollTo(0, 0); }}
                                        className="px-8 py-3 bg-slate-900 border border-white/5 rounded-2xl font-bold disabled:opacity-20 transition-all hover:bg-slate-800"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => { setHadithPage(p => p + 1); fetchHadith('', hadithPage + 1); window.scrollTo(0, 0); }}
                                        className="px-8 py-3 bg-emerald-600 shadow-lg shadow-emerald-600/20 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                                    >
                                        Next Page
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
