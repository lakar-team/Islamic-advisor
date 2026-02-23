import React, { useState, useEffect } from 'react';
import { Search, Book, Info, Filter, ChevronRight, Hash, LayoutGrid, CheckCircle2, AlertCircle, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KnowledgeLibrary: React.FC = () => {
    const [subTab, setSubTab] = useState<'quran' | 'hadith'>('quran');
    const [viewMode, setViewMode] = useState<'search' | 'browse'>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [surahs, setSurahs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('eng-bukhari');
    const [hadithPage, setHadithPage] = useState(0);
    const [hadithSections, setHadithSections] = useState<Record<string, string>>({});
    const [selectedHadithSection, setSelectedHadithSection] = useState<string | null>(null);
    const [gradeFilter, setGradeFilter] = useState<string | null>(null);
    const [showGlossary, setShowGlossary] = useState(false);

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

    const fetchHadith = async (query: string = '', page: number = 0, sectionNo: string | null = null) => {
        setIsLoading(true);
        setViewMode('search');
        try {
            // We ALWAYS fetch the full edition occasionally to keep the sections list
            // But if a section is selected, we fetch that specific one for speed
            const url = sectionNo
                ? `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${selectedCollection}/sections/${sectionNo}.json`
                : `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${selectedCollection}.json`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('API request failed');
            const data = await res.json();

            // If we fetched the full edition, sync sections
            if (!sectionNo && data.metadata?.sections) {
                setHadithSections(data.metadata.sections);
            }

            let hadithList = data.hadiths || [];

            // Apply Filters Locally
            let filtered = hadithList;
            if (query) {
                filtered = filtered.filter((h: any) => h.text.toLowerCase().includes(query.toLowerCase()));
            }
            if (gradeFilter) {
                filtered = filtered.filter((h: any) =>
                    h.grades?.some((g: any) => g.grade.toLowerCase().includes(gradeFilter.toLowerCase()))
                );
            }

            const pageSize = 15;
            const chunk = filtered.slice(page * pageSize, (page + 1) * pageSize);

            setResults(chunk.map((h: any) => ({
                text: h.text,
                reference: `${collections.find(c => c.id === selectedCollection)?.name} - Hadith ${h.hadithnumber}`,
                type: 'Hadith',
                grades: h.grades || []
            })));
        } catch (err) {
            console.error(err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'browse' && subTab === 'quran') fetchSurahList();
        if (subTab === 'hadith' && !searchQuery) {
            fetchHadith('', hadithPage, selectedHadithSection);
        }
    }, [subTab, viewMode, selectedCollection, selectedHadithSection, gradeFilter, hadithPage]);

    useEffect(() => {
        if (searchQuery.length > 2) {
            const delayDebounceFn = setTimeout(() => {
                if (subTab === 'quran') fetchQuran(searchQuery);
                else fetchHadith(searchQuery, 0, null);
            }, 600);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery]);

    return (
        <div className="max-w-7xl mx-auto py-12 px-6 animate-fade-in relative">
            {/* Glossary Overlay */}
            <AnimatePresence>
                {showGlossary && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-slate-900 border border-emerald-500/30 w-full max-w-2xl rounded-[3rem] p-10 relative shadow-2xl"
                        >
                            <button onClick={() => setShowGlossary(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                                <X className="w-8 h-8" />
                            </button>

                            <h3 className="text-3xl font-black mb-8 gold-text uppercase tracking-tighter">Understanding Hadith Grades</h3>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                        <h4 className="text-xl font-bold text-emerald-400">Sahih (Authentic)</h4>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed pl-6">The highest grade of authenticity. These narrations have a continuous chain of reliable, precise narrators from start to finish, with no conflicting versions.</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <h4 className="text-xl font-bold text-blue-400">Hasan (Good)</h4>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed pl-6">Highly reliable narrations. The narrators are trustworthy but might have slightly lower precision (memory) than those in Sahih chains. These are fully acceptable for legal rulings.</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                        <h4 className="text-xl font-bold text-amber-500">Da'if (Weak)</h4>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed pl-6">Narrations where there is a known flaw in the chain or narrator precision. While they contain wisdom, they are generally not used for primary Islamic law.</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowGlossary(false)}
                                className="w-full mt-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                            >
                                Got it, thanks.
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
                <div>
                    <h2 className="text-5xl font-black mb-3 gold-text tracking-tighter">Knowledge Library</h2>
                    <p className="text-slate-400 text-lg font-medium">Browse by tradition, collection, or spiritual grade.</p>
                </div>

                <div className="flex gap-4 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-xl shrink-0">
                    <button
                        onClick={() => { setSubTab('quran'); setViewMode('browse'); setResults([]); setSearchQuery(''); }}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'quran' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Book className="w-4 h-4" />
                        Holy Quran
                    </button>
                    <button
                        onClick={() => { setSubTab('hadith'); setViewMode('search'); setResults([]); setSearchQuery(''); setHadithSections({}); setSelectedHadithSection(null); setHadithPage(0); }}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'hadith' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Hash className="w-4 h-4" />
                        Hadith Corpus
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col gap-6 mb-12">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder={subTab === 'quran' ? "Search verses..." : "Search in selected corpus..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 px-16 py-6 rounded-[2rem] text-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {subTab === 'hadith' && (
                    <div className="flex flex-wrap gap-4 items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mr-2 flex items-center gap-1.5">
                                <Filter className="w-3.5 h-3.5" /> Authenticity:
                            </span>
                            {['Sahih', 'Hasan', 'Daif'].map(grade => (
                                <button
                                    key={grade}
                                    onClick={() => { setGradeFilter(gradeFilter === grade ? null : grade); setHadithPage(0); }}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${gradeFilter === grade ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-emerald-500/30'}`}
                                >
                                    {grade === 'Daif' ? 'Dha\'eef' : grade}
                                </button>
                            ))}
                            {gradeFilter && (
                                <button onClick={() => setGradeFilter(null)} className="text-[10px] font-bold text-slate-500 hover:text-white ml-2">Clear</button>
                            )}
                        </div>

                        <button
                            onClick={() => setShowGlossary(true)}
                            className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-white transition-colors group"
                        >
                            <HelpCircle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            What do these mean?
                        </button>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-[320px_1fr] gap-12">
                {/* Sidebar Navigation */}
                <div className="space-y-8 order-2 lg:order-1">
                    {/* Collection Selector */}
                    <div className="glass p-6 rounded-[2rem] border border-white/5">
                        <h4 className={`font-black text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2 ${subTab === 'quran' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            <Filter className="w-4 h-4" /> {subTab === 'quran' ? 'Chapters' : 'Collections'}
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                            {subTab === 'hadith' ? collections.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedCollection(c.id); setResults([]); setSelectedHadithSection(null); setHadithPage(0); }}
                                    className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${selectedCollection === c.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
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
                                    <span className="text-amber-500/50 w-6 font-black">{s.number}</span>
                                    {s.englishName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Book/Section Index for Hadith */}
                    {subTab === 'hadith' && Object.keys(hadithSections).length > 0 && (
                        <div className="glass p-6 rounded-[2rem] border border-white/5 bg-emerald-500/5">
                            <h4 className="font-black text-xs tracking-[0.2em] uppercase text-emerald-400 mb-6 flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" /> Subject Index
                            </h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                                {Object.entries(hadithSections).map(([no, title]) => (
                                    <button
                                        key={no}
                                        onClick={() => { setSelectedHadithSection(no); setHadithPage(0); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border border-transparent ${selectedHadithSection === no ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                    >
                                        <span className="opacity-40 mr-2 text-[10px]">{no}</span>
                                        {title || 'General'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main View Area */}
                <div className="order-1 lg:order-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-30">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="font-bold tracking-[0.3em] text-[10px] uppercase">Retrieving Sacret Texts...</p>
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
                                        className="glass p-10 rounded-[2.5rem] border border-white/5 border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all group"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/5">
                                            <div className="flex items-center gap-3 font-bold">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${res.type === 'Quran' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    {res.type}
                                                </span>
                                                <span className="text-sm text-slate-500 font-medium">{res.reference}</span>
                                            </div>

                                            {res.grades && res.grades.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {res.grades.map((g: any, i: number) => (
                                                        <div key={i} className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${g.grade.toLowerCase().includes('sahih') ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-400' : g.grade.toLowerCase().includes('hasan') ? 'bg-blue-400/5 border-blue-400/20 text-blue-400' : 'bg-amber-400/5 border-amber-400/20 text-amber-500'}`}>
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {g.grade} <span className="opacity-40 ml-1 font-medium">— {g.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {res.arabic && (
                                            <p className="text-4xl font-arabic text-right mb-10 leading-[1.8] text-amber-100/90 selection:bg-amber-500/30">
                                                {res.arabic}
                                            </p>
                                        )}

                                        <p className={`text-2xl text-slate-200 selection:bg-emerald-500/30 font-medium leading-relaxed ${res.type === 'Quran' ? 'font-serif' : 'font-sans'}`}>
                                            {res.text}
                                        </p>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-32 glass rounded-[3rem] border border-white/5">
                                    <AlertCircle className="w-16 h-16 mx-auto mb-6 opacity-20 text-emerald-400" />
                                    <p className="text-2xl font-bold tracking-tight mb-2 uppercase text-slate-400">Section Content Empty</p>
                                    <p className="text-slate-500 max-w-sm mx-auto font-medium">This specific book section might be currently being indexed or contains no narrations matching your current grade filters.</p>
                                    <button
                                        onClick={() => { setSelectedHadithSection(null); setGradeFilter(null); }}
                                        className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Reset All Filters
                                    </button>
                                </div>
                            )}

                            {results.length > 0 && !searchQuery && (
                                <div className="flex justify-center gap-4 pt-12">
                                    <button
                                        disabled={hadithPage === 0}
                                        onClick={() => { setHadithPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="px-8 py-3 bg-slate-900 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all hover:bg-slate-800"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => { setHadithPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="px-8 py-3 bg-emerald-600 shadow-lg shadow-emerald-500/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 text-white"
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
