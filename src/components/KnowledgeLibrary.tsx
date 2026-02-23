import React, { useState, useEffect } from 'react';
import { Search, Book, Bookmark, Info, Star, Filter, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KnowledgeLibrary: React.FC = () => {
    const [subTab, setSubTab] = useState<'quran' | 'hadith'>('quran');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('eng-bukhari');

    const collections = [
        { id: 'eng-bukhari', name: 'Sahih Bukhari', explorer: 'Bukhari' },
        { id: 'eng-muslim', name: 'Sahih Muslim', explorer: 'Muslim' },
        { id: 'eng-abudawud', name: 'Sunan Abu Dawud', explorer: 'Abu Dawud' },
        { id: 'eng-tirmidhi', name: 'Jami at-Tirmidhi', explorer: 'Tirmidhi' },
        { id: 'eng-nasai', name: 'Sunan an-Nasa\'i', explorer: 'Nasa\'i' },
        { id: 'eng-ibnmajah', name: 'Sunan Ibn Majah', explorer: 'Ibn Majah' },
    ];

    const fetchQuran = async (query: string) => {
        setIsLoading(true);
        try {
            // If query is a number, treat as Surah
            const isSurahNumber = !isNaN(Number(query));
            const url = isSurahNumber
                ? `https://api.alquran.cloud/v1/surah/${query}/en.asad`
                : `https://api.alquran.cloud/v1/search/${query}/all/en.asad`;

            const res = await fetch(url);
            const data = await res.json();

            if (isSurahNumber) {
                setResults(data.data.ayahs.slice(0, 20).map((a: any) => ({
                    text: a.text,
                    reference: `${data.data.englishName} ${data.data.number}:${a.numberInSurah}`,
                    type: 'Quran'
                })));
            } else {
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

    const fetchHadith = async (query: string) => {
        setIsLoading(true);
        try {
            // Using fawazahmed0 hadith-api
            const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${selectedCollection}.json`);
            const data = await res.json();

            const filtered = data.hadiths.filter((h: any) =>
                h.text.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 15);

            setResults(filtered.map((h: any) => ({
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
        if (searchQuery.length > 2) {
            const delayDebounceFn = setTimeout(() => {
                if (subTab === 'quran') fetchQuran(searchQuery);
                else fetchHadith(searchQuery);
            }, 600);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, subTab, selectedCollection]);

    return (
        <div className="max-w-6xl mx-auto py-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                <div>
                    <h2 className="text-4xl font-black mb-2 gold-text">Knowledge Library</h2>
                    <p className="text-slate-400 font-medium">Browse through thousands of authentic verses and narrations.</p>
                </div>

                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl shrink-0">
                    <button
                        onClick={() => { setSubTab('quran'); setResults([]); }}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'quran' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Book className="w-4 h-4" />
                        Holy Quran
                    </button>
                    <button
                        onClick={() => { setSubTab('hadith'); setResults([]); }}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'hadith' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Hash className="w-4 h-4" />
                        Sahih Hadiths
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="grid lg:grid-cols-[1fr_320px] gap-8">
                {/* Search & Results */}
                <div className="space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder={subTab === 'quran' ? "Search verses (e.g. '1' for Al-Fatiha or keywords like 'patience')" : "Search in selected collection..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/40 border border-white/10 px-14 py-5 rounded-3xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                        />
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-bold tracking-widest text-xs">RETRIEVING SOURCES...</p>
                            </div>
                        ) : results.length > 0 ? (
                            results.map((res, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass p-8 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${res.type === 'Quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {res.type}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500">{res.reference}</span>
                                        </div>
                                        {res.grade && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/5 px-2.5 py-1 rounded-lg border border-emerald-400/20">
                                                <Star className="w-3 h-3 fill-current" />
                                                {res.grade.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-xl leading-relaxed text-slate-200 ${subTab === 'quran' ? 'font-serif' : 'font-sans'}`}>
                                        {res.text}
                                    </p>
                                </motion.div>
                            ))
                        ) : searchQuery.length > 2 ? (
                            <div className="text-center py-20 text-slate-500 italic">No direct matches found. Try different keywords.</div>
                        ) : (
                            <div className="text-center py-20 text-slate-600">
                                <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-bold tracking-tight text-xl mb-1">Start Exploring</p>
                                <p className="text-sm">Enter a keyword or number to search through divine texts.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Filter/Quick Links */}
                <div className="space-y-8">
                    {subTab === 'hadith' && (
                        <div className="glass p-6 rounded-3xl border border-white/5">
                            <div className="flex items-center gap-2 mb-6">
                                <Filter className="w-4 h-4 text-emerald-400" />
                                <h4 className="font-bold text-sm tracking-widest uppercase opacity-60">Collections</h4>
                            </div>
                            <div className="space-y-2">
                                {collections.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedCollection(c.id)}
                                        className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${selectedCollection === c.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                                    >
                                        {c.name}
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedCollection === c.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass p-6 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-2 mb-6">
                            <Bookmark className="w-4 h-4 text-amber-500" />
                            <h4 className="font-bold text-sm tracking-widest uppercase opacity-60">Popular Topics</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['Patience', 'Charity', 'Parenting', 'Fasting', 'Hajj', 'Zakat'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSearchQuery(t)}
                                    className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all border border-white/5"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeLibrary;
