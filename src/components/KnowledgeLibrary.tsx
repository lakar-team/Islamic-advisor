import React, { useState, useEffect, useRef } from 'react';
import { Search, Book, Filter, Hash, CheckCircle2, AlertCircle, X, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, BookOpen, ExternalLink, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KnowledgeLibraryProps {
    initialTab?: 'quran' | 'hadith' | 'search';
    initialQuery?: string;
}

// Format surah/ayah numbers with leading zeros for audio CDN
const pad = (n: number, len: number) => String(n).padStart(len, '0');


const KnowledgeLibrary: React.FC<KnowledgeLibraryProps> = ({ initialTab, initialQuery }) => {
    const [subTab, setSubTab] = useState<'quran' | 'hadith' | 'search'>(initialQuery ? 'search' : (initialTab || 'quran'));
    const [searchQuery, setSearchQuery] = useState(initialQuery || '');
    const [searchSource, setSearchSource] = useState<'both' | 'quran' | 'hadith'>('both');
    const [results, setResults] = useState<any[]>([]);
    const [surahs, setSurahs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('eng-bukhari');
    const [gradeFilter, setGradeFilter] = useState<string | null>('Sahih');
    const [showGlossary, setShowGlossary] = useState(false);
    const [currentSurah, setCurrentSurah] = useState<number | null>(null);
    // WBW: cache per "surahNumber:ayahNumber" key, value = array of {text,translation}
    const [wbwCache, setWbwCache] = useState<Record<string, any[]>>({});
    const [wbwActive, setWbwActive] = useState<string | null>(null); // which ayah key has WBW open
    const [targetAyah, setTargetAyah] = useState<string | null>(null); // "surah:ayah" to scroll-to after load
    const [highlightedAyah, setHighlightedAyah] = useState<string | null>(null); // flashing highlight

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
        { id: 'eng-bukhari', name: 'Sahih Bukhari', count: 7563 },
        { id: 'eng-muslim', name: 'Sahih Muslim', count: 7453 },
        { id: 'eng-abudawud', name: 'Sunan Abu Dawud', count: 5274 },
        { id: 'eng-tirmidhi', name: 'Jami at-Tirmidhi', count: 3956 },
        { id: 'eng-nasai', name: "Sunan an-Nasa'i", count: 5761 },
        { id: 'eng-ibnmajah', name: 'Sunan Ibn Majah', count: 4341 },
        { id: 'eng-nawawi42', name: '40 Hadith Nawawi', count: 42 },
        { id: 'eng-adab', name: 'Al-Adab Al-Mufrad', count: 1322 },
        { id: 'eng-riyadussalihin', name: 'Riyadhus Salihin', count: 1900 },
    ];

    const gradeMap: Record<string, string> = {
        'Sahih': 'Authentic',
        'Hasan': 'Good',
        'Daif': 'Weak',
        'Maudu': 'Fabricated'
    };

    // Book navigation state
    const [books, setBooks] = useState<any[]>([]);
    const [selectedBook, setSelectedBook] = useState<any | null>(null);
    const [jumpToNum, setJumpToNum] = useState('');
    const [browseOffset, setBrowseOffset] = useState(0); // first hadith number in current view
    const BROWSE_PAGE = 15; // hadiths shown per page when browsing a book

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

    // Fetch WBW for a single ayah (lazy, cached) via quran.com API v4
    const fetchWbwAyah = async (surahNum: number, ayahNum: number) => {
        const key = `${surahNum}:${ayahNum}`;
        if (wbwCache[key]) {
            setWbwActive(prev => prev === key ? null : key); // toggle if already loaded
            return;
        }
        // Mark as loading (empty array = loading in-progress)
        setWbwCache(prev => ({ ...prev, [key]: [] }));
        setWbwActive(key);
        try {
            const url = `https://api.quran.com/api/v4/verses/by_key/${surahNum}:${ayahNum}?language=en&words=true&word_fields=text_uthmani,translation_text`;
            const r = await fetch(url);
            if (!r.ok) throw new Error('wbw fetch failed');
            const data = await r.json();
            const words = (data?.verse?.words || [])
                .filter((w: any) => w.char_type_name === 'word') // exclude end-of-ayah markers
                .map((w: any) => ({
                    text: w.text_uthmani || w.text,
                    translation: w.translation?.text || '',
                    transliteration: w.transliteration?.text || '',
                }));
            setWbwCache(prev => ({ ...prev, [key]: words }));
        } catch {
            setWbwCache(prev => ({ ...prev, [key]: [{ text: '—', translation: 'unavailable', transliteration: '' }] }));
        }
    };

    // Browse a surah by number (Quran browse tab)
    const fetchQuran = async (query: string | number) => {
        setIsLoading(true);
        stopAudio();
        // Detect "surah:ayah" format (e.g. "2:255") from chat deep-links
        const deepLinkMatch = typeof query === 'string' ? query.match(/^(\d+):(\d+)$/) : null;
        const surahOnlyQuery = deepLinkMatch ? parseInt(deepLinkMatch[1]) : query;
        const deepAyah = deepLinkMatch ? `${deepLinkMatch[1]}:${deepLinkMatch[2]}` : null;
        if (deepAyah) setTargetAyah(deepAyah);
        try {
            const isNumber = !isNaN(Number(surahOnlyQuery));
            if (isNumber) {
                const num = Number(surahOnlyQuery);
                setCurrentSurah(num);
                const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,en.asad`);
                const data = await res.json();
                const arabicAyahs = data.data[0].ayahs;
                const englishAyahs = data.data[1].ayahs;
                const surahName = data.data[0].englishName;
                const surahNumber = data.data[0].number;
                setResults(arabicAyahs.map((a: any, idx: number) => {
                    let arabicText = a.text;
                    if (a.numberInSurah === 1 && surahNumber !== 1)
                        arabicText = arabicText.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ[ \u200f]*/u, '');
                    return {
                        text: englishAyahs[idx].text,
                        arabic: arabicText,
                        reference: `${surahName} ${surahOnlyQuery}:${a.numberInSurah}`,
                        type: 'Quran',
                        surahNumber,
                        ayahNumber: a.numberInSurah,
                    };
                }));
            } else {
                setCurrentSurah(null);
                setResults([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Grade priority score for sorting (higher = more authentic) ──
    const gradePriority = (grades: any[]): number => {
        if (!grades?.length) return 1;
        const g = grades[0].grade.toLowerCase();
        if (g.includes('sahih')) return 3;
        if (g.includes('hasan')) return 2;
        return 1;
    };

    // ── Streaming unified search: show Quran + top-3 Hadith immediately,
    //    then append remaining 6 collections as they arrive ──
    const fetchSearchBoth = (query: string, source: 'both' | 'quran' | 'hadith') => {
        if (!query || query.length < 2) return;
        setIsLoading(true);
        setResults([]);

        const scoreAndMap = (data: any, c: { id: string; name: string }) => {
            if (!data?.hadiths) return [];
            const terms = query.toLowerCase().split(' ').filter((t: string) => t.length > 2);
            return data.hadiths
                .filter((h: any) => h.text?.trim())
                .map((h: any) => {
                    const lower = h.text.toLowerCase();
                    let score = lower.includes(query.toLowerCase()) ? 10 : 0;
                    terms.forEach((t: string) => { if (lower.includes(t)) score += (lower.split(t).length - 1); });
                    return { ...h, score, _collId: c.id, _collName: c.name };
                })
                .filter((h: any) => h.score > 0)
                .slice(0, 8)
                .map((h: any) => {
                    let hGrades = h.grades || [];
                    if (!hGrades.length && (c.id === 'eng-bukhari' || c.id === 'eng-muslim'))
                        hGrades = [{ grade: 'Sahih', name: 'Al-Bukhari & Muslim' }];
                    return {
                        text: h.text,
                        reference: `${h._collName} — Hadith ${h.hadithnumber}`,
                        type: 'Hadith',
                        grades: hGrades,
                        hadithNumber: h.hadithnumber,
                        collectionId: h._collId,
                        score: h.score,
                    };
                });
        };

        const sortResults = (arr: any[]) => {
            // Quran first, then by authenticity grade, then by score
            return [...arr].sort((a, b) => {
                if (a.type === 'Quran' && b.type !== 'Quran') return -1;
                if (b.type === 'Quran' && a.type !== 'Quran') return 1;
                const gDiff = gradePriority(b.grades) - gradePriority(a.grades);
                if (gDiff !== 0) return gDiff;
                return (b.score || 0) - (a.score || 0);
            });
        };

        // Priority collections shown first
        const PRIORITY_COLLS = ['eng-bukhari', 'eng-muslim', 'eng-abudawud'];
        const priorityColls = collections.filter(c => PRIORITY_COLLS.includes(c.id));
        const restColls = collections.filter(c => !PRIORITY_COLLS.includes(c.id));

        // Phase 1: fetch Quran + priority Hadith simultaneously, show immediately
        const phase1: Promise<any[]>[] = [];

        if (source === 'both' || source === 'quran') {
            phase1.push(
                fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/en.asad`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
                    .then(async (enData) => {
                        if (!enData?.data?.matches) return [];
                        const matches = enData.data.matches.slice(0, 15);

                        // Dedupe into unique surahs — typically 4-8 per search,
                        // vs 15 individual ayah requests which hit rate limits
                        const uniqueSurahs: number[] = [...new Set<number>(matches.map((m: any) => m.surah.number as number))];
                        const surahResponses = await Promise.allSettled(
                            uniqueSurahs.map((surahNum: number) =>
                                fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`)
                                    .then(r => r.ok ? r.json() : null)
                                    .catch(() => null)
                            )
                        );

                        // Build surahNum:ayahNum → arabic text lookup
                        const arMap: Record<string, string> = {};
                        surahResponses.forEach((res, i) => {
                            if (res.status === 'fulfilled' && res.value?.data?.ayahs) {
                                const surahNum = uniqueSurahs[i];
                                res.value.data.ayahs.forEach((ayah: any) => {
                                    arMap[`${surahNum}:${ayah.numberInSurah}`] = ayah.text;
                                });
                            }
                        });

                        return matches.map((r: any) => ({
                            text: r.text,
                            arabic: arMap[`${r.surah.number}:${r.numberInSurah}`] || '',
                            reference: `${r.surah.englishName} ${r.surah.number}:${r.numberInSurah}`,
                            type: 'Quran',
                            surahNumber: r.surah.number,
                            ayahNumber: r.numberInSurah,
                            score: 20,
                        }));
                    })
            );
        }

        if (source === 'both' || source === 'hadith') {
            const priority = source === 'both' ? priorityColls : priorityColls;
            priority.forEach(c => {
                phase1.push(
                    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${c.id}.json`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                        .then(data => scoreAndMap(data, c))
                );
            });
        }

        Promise.allSettled(phase1).then(settled => {
            const phase1Results: any[] = [];
            settled.forEach(r => { if (r.status === 'fulfilled') phase1Results.push(...r.value); });
            const top10 = sortResults(phase1Results).slice(0, 10);
            setResults(top10);
            setIsLoading(false); // show top 10 immediately

            // Phase 2: stream remaining collections in
            if (source !== 'quran' && restColls.length > 0) {
                let accumulated = [...phase1Results];
                let remaining = restColls.length;
                restColls.forEach(c => {
                    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${c.id}.json`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                        .then(data => {
                            accumulated.push(...scoreAndMap(data, c));
                        })
                        .finally(() => {
                            remaining--;
                            // Update results as each collection finishes
                            setResults(sortResults(accumulated));
                            if (remaining === 0) {
                                // all done — nothing more to do
                            }
                        });
                });
            }
        });
    };

    // ── Fetch a page of hadiths by number range (parallel per-hadith requests) ──
    const fetchHadithRange = async (collectionId: string, from: number, count: number) => {
        setIsLoading(true);
        try {
            const nums = Array.from({ length: count }, (_, i) => from + i);
            const settled = await Promise.allSettled(
                nums.map(n =>
                    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${collectionId}/${n}.json`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                )
            );
            const collName = collections.find(c => c.id === collectionId)?.name || collectionId;
            const loaded: any[] = [];
            settled.forEach(s => {
                if (s.status === 'fulfilled' && s.value?.hadiths?.length) {
                    s.value.hadiths.forEach((h: any) => {
                        if (h.text?.trim()) {
                            let hGrades = h.grades || [];
                            if (hGrades.length === 0 && (collectionId === 'eng-bukhari' || collectionId === 'eng-muslim'))
                                hGrades = [{ grade: 'Sahih', name: 'Al-Bukhari & Muslim' }];
                            loaded.push({
                                text: h.text,
                                reference: `${collName} — Hadith ${h.hadithnumber}`,
                                type: 'Hadith',
                                grades: hGrades,
                                hadithNumber: h.hadithnumber,
                                collectionId,
                            });
                        }
                    });
                }
            });
            setResults(loaded);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Load books for a collection (fetch hadith #1 to get metadata) ──
    const loadBooks = async (collectionId: string, skipResults = false) => {
        setBooks([]);
        setSelectedBook(null);
        try {
            const r = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${collectionId}/1.json`);
            if (!r.ok) return;
            const data = await r.json();
            const sections: Record<string, string> = data.metadata?.section || {};
            const details: Record<string, any> = data.metadata?.section_detail || {};
            const bookList = Object.entries(sections).map(([num, name]) => ({
                num: parseInt(num),
                name: name as string,
                first: details[num]?.hadithnumber_first ?? null,
                last: details[num]?.hadithnumber_last ?? null,
            })).filter(b => b.first !== null);
            setBooks(bookList);
            if (bookList.length > 0) {
                setSelectedBook(bookList[0]);
                // Note: total is bookList[bookList.length - 1].last
                setBrowseOffset(bookList[0].first);
                if (!skipResults) fetchHadithRange(collectionId, bookList[0].first, BROWSE_PAGE);
            } else {
                // Small collections (Nawawi 40 etc.) — no sections, load from start
                setBrowseOffset(1);
                if (!skipResults) fetchHadithRange(collectionId, 1, BROWSE_PAGE);
            }
        } catch { /* ignore */ }
    };

    // ── Jump directly to a hadith by number ──
    const jumpToHadith = async (num: string, overrideCollection?: string) => {
        const n = parseInt(num);
        if (!n || n < 1) return;
        const targetColl = overrideCollection || selectedCollection;
        setIsLoading(true);
        setResults([]);
        try {
            const r = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${targetColl}/${n}.json`);
            if (!r.ok) throw new Error('not found');
            const data = await r.json();
            const collName = collections.find(c => c.id === targetColl)?.name || targetColl;
            setResults((data.hadiths || []).filter((h: any) => h.text?.trim()).map((h: any) => ({
                text: h.text,
                reference: `${collName} — Hadith ${h.hadithnumber}`,
                type: 'Hadith',
                grades: h.grades?.length ? h.grades
                    : (targetColl === 'eng-bukhari' || targetColl === 'eng-muslim')
                        ? [{ grade: 'Sahih', name: 'Al-Bukhari & Muslim' }] : [],
                hadithNumber: h.hadithnumber,
                collectionId: targetColl,
            })));
        } catch {
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
        if (subTab === 'quran') {
            fetchSurahList();
            fetchQuran(1);
        }
        if (subTab === 'hadith') {
            setResults([]);
            setBooks([]);
            setSelectedBook(null);
            // If we have a jumpToNum (deep-link), skip loading the first page of results
            // to prevent overwriting the target Hadith.
            loadBooks(selectedCollection, !!jumpToNum);
        }
        if (subTab === 'search') {
            setResults([]);
        }
    }, [subTab]);

    useEffect(() => {
        if (subTab !== 'search') return;
        if (searchQuery.length > 2) {
            const timer = setTimeout(() => fetchSearchBoth(searchQuery, searchSource), 700);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, searchSource]);

    useEffect(() => {
        if (initialQuery) {
            if (initialTab === 'quran') {
                setSubTab('quran');
                fetchQuran(initialQuery);
            } else if (initialTab === 'hadith') {
                // For deep-link format "eng-collection:number"
                const deepLink = initialQuery.match(/^(eng-[\w]+):(\d+)$/);
                if (deepLink) {
                    const [, collId, hadithNum] = deepLink;
                    setSelectedCollection(collId);
                    setJumpToNum(hadithNum);
                    setSubTab('hadith');
                    // Increased delay to 200ms to ensure all state transitions (tab switch) settle
                    setTimeout(() => jumpToHadith(hadithNum, collId), 200);
                } else {
                    // keyword — go to Search tab
                    setSubTab('search');
                    setSearchQuery(initialQuery);
                    setTimeout(() => fetchSearchBoth(initialQuery, 'hadith'), 50);
                }
            }
        }
    }, [initialQuery, initialTab]);

    // Get WBW words for a cached ayah key
    const getWbwWords = (surahNum: number, ayahNum: number): any[] =>
        wbwCache[`${surahNum}:${ayahNum}`] || [];

    // Scroll-to and highlight target ayah after results finish loading
    useEffect(() => {
        if (!targetAyah || results.length === 0 || isLoading) return;
        // Small delay to let the DOM render the cards
        const timer = setTimeout(() => {
            const el = document.getElementById(`ayah-${targetAyah.replace(':', '-')}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedAyah(targetAyah);
                // Fade out highlight after 3.5s
                setTimeout(() => setHighlightedAyah(null), 3500);
            }
            setTargetAyah(null); // only scroll once
        }, 400);
        return () => clearTimeout(timer);
    }, [results, isLoading, targetAyah]);

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
                    <p className="text-slate-400 text-lg font-medium">Browse the Quran & Hadith, or search across both at once.</p>
                </div>

                <div className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-xl shrink-0">
                    <button
                        onClick={() => { setSubTab('quran'); setResults([]); stopAudio(); }}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'quran' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Book className="w-4 h-4" />
                        Holy Quran
                    </button>
                    <button
                        onClick={() => { setSubTab('hadith'); setResults([]); stopAudio(); }}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'hadith' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Hash className="w-4 h-4" />
                        Hadith Corpus
                    </button>
                    <button
                        onClick={() => { setSubTab('search'); setResults([]); stopAudio(); }}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'search' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Search className="w-4 h-4" />
                        Search
                    </button>
                </div>
            </div>

            {/* Search Tab — unified search UI */}
            {subTab === 'search' && (
                <div className="mb-10 space-y-5">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search across all Quran & Hadith — e.g. 'patience', 'charity', 'prayer'..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-purple-500/40 px-16 py-6 rounded-[2rem] text-xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setResults([]); }} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    {/* Source filter */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Search in:</span>
                        {(['both', 'quran', 'hadith'] as const).map(src => (
                            <button
                                key={src}
                                onClick={() => setSearchSource(src)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${searchSource === src
                                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                                    : 'bg-slate-900 border-white/5 text-slate-400 hover:border-purple-500/30'
                                    }`}
                            >
                                {src === 'both' ? 'Quran + Hadith' : src === 'quran' ? 'Quran only' : 'Hadith only'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Hadith browse controls — only on hadith tab */}
            <div className="flex flex-col gap-6 mb-12">

                {subTab === 'hadith' && (
                    <div className="flex flex-wrap gap-3 items-center bg-white/5 p-4 rounded-3xl border border-white/5">
                        {/* Jump to number */}
                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                            <Hash className="w-4 h-4 text-emerald-500 shrink-0" />
                            <input
                                type="number"
                                min={1}
                                placeholder="Jump to Hadith # ..."
                                value={jumpToNum}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJumpToNum(e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && jumpToNum) { jumpToHadith(jumpToNum); setSearchQuery(''); } }}
                                className="bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-slate-600 w-full"
                            />
                            <button
                                onClick={() => { if (jumpToNum) { jumpToHadith(jumpToNum); setSearchQuery(''); } }}
                                className="shrink-0 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >Go</button>
                        </div>
                        <div className="h-6 w-px bg-white/10 hidden sm:block" />
                        {/* Grade filter */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5">
                                <Filter className="w-3 h-3" /> Grade:
                            </span>
                            {['Sahih', 'Hasan', 'Daif'].map(grade => (
                                <button
                                    key={grade}
                                    onClick={() => setGradeFilter(gradeFilter === grade ? null : grade)}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${gradeFilter === grade ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-emerald-500/30'}`}
                                >
                                    {gradeMap[grade]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quran toolbar: play surah button */}
                {subTab === 'quran' && results.length > 0 && currentSurah && (
                    <div className="flex flex-wrap gap-3 items-center justify-end bg-amber-500/5 p-4 rounded-3xl border border-amber-500/10">

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

            <div className={`grid gap-12 ${subTab === 'search' ? '' : 'lg:grid-cols-[320px_1fr]'}`}>
                {/* Sidebar Navigation */}
                <div className="space-y-8 order-2 lg:order-1">
                    {subTab === 'search' ? (
                        /* Popular Topics — shown full-width above results */
                        <div className="glass p-6 rounded-[2rem] border border-white/5 mb-2">
                            <h4 className="font-black text-xs tracking-[0.2em] uppercase mb-5 flex items-center gap-2 text-purple-400">
                                <Sparkles className="w-4 h-4" /> Popular Topics
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    'Life', 'Death', 'Work', 'Marriage', 'Divorce', 'Children',
                                    'Prayer', 'Fasting', 'Charity', 'Pilgrimage', 'Women', 'Men',
                                    'Business', 'Money', 'Tax', 'Debt', 'Food', 'Halal', 'Haram',
                                    'Forgiveness', 'Patience', 'Gratitude', 'Justice', 'Knowledge',
                                    'Parents', 'Sleep', 'Health', 'War', 'Peace', 'Paradise', 'Hell',
                                ].map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => {
                                            setSearchQuery(topic);
                                            setTimeout(() => fetchSearchBoth(topic, searchSource), 50);
                                        }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105 ${searchQuery === topic
                                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/20'
                                            : 'bg-slate-900/60 border-white/8 text-slate-400 hover:border-purple-500/40 hover:text-white'
                                            }`}
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass p-6 rounded-[2rem] border border-white/5">
                            <h4 className={`font-black text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2 ${subTab === 'quran' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                <Filter className="w-4 h-4" /> {subTab === 'quran' ? 'Chapters' : 'Collections'}
                            </h4>
                            <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
                                {subTab === 'hadith' ? (
                                    <>
                                        {/* Collection list */}
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 px-2">Collections</p>
                                        {collections.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCollection(c.id);
                                                    setSearchQuery('');
                                                    setJumpToNum('');
                                                    setResults([]);
                                                    setBooks([]);
                                                    loadBooks(c.id);
                                                }}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${selectedCollection === c.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'
                                                    }`}
                                            >
                                                <span className="leading-snug">{c.name}</span>
                                                <span className={`text-[10px] font-black tabular-nums ${selectedCollection === c.id ? 'text-white/70' : 'text-slate-600'}`}>{c.count.toLocaleString()}</span>
                                            </button>
                                        ))}

                                        {/* Book list for selected collection */}
                                        {books.length > 0 && (
                                            <>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-5 mb-2 px-2">Books</p>
                                                {books.map(b => (
                                                    <button
                                                        key={b.num}
                                                        onClick={() => {
                                                            setSelectedBook(b);
                                                            setJumpToNum('');
                                                            setSearchQuery('');
                                                            setBrowseOffset(b.first);
                                                            fetchHadithRange(selectedCollection, b.first, BROWSE_PAGE);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-start gap-2 ${selectedBook?.num === b.num
                                                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                                            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        <span className="shrink-0 text-[10px] font-black text-slate-600 pt-0.5">#{b.num}</span>
                                                        <span className="leading-snug line-clamp-2">{b.name}</span>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </>
                                ) : surahs.map(s => (
                                    <button
                                        key={s.number}
                                        onClick={() => fetchQuran(s.number)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all flex items-center gap-3 group ${currentSurah === s.number ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-white/5'}`}
                                    >
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${currentSurah === s.number ? 'bg-amber-500 text-black' : 'text-amber-500/50 bg-amber-500/5'}`}>{s.number}</span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-white font-black text-sm leading-tight">{s.name}</span>
                                            <span className={`text-[11px] font-bold ${currentSurah === s.number ? 'text-amber-400' : 'text-slate-500'}`}>{s.englishName}</span>
                                            <span className={`text-[10px] font-medium italic ${currentSurah === s.number ? 'text-amber-300/70' : 'text-slate-600'}`}>"{s.englishNameTranslation}"</span>
                                        </div>
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
                            <p className="font-bold tracking-[0.3em] text-[10px] uppercase">Searching Tradition...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {results.length > 0 ? (
                                results.map((res, idx) => {
                                    const ayahKey = `${res.surahNumber}:${res.ayahNumber}`;
                                    const isThisPlaying = playingAyah === ayahKey;
                                    const isWbwOpen = wbwActive === ayahKey;
                                    const wbwWords = getWbwWords(res.surahNumber, res.ayahNumber);
                                    const wbwLoaded = !!wbwCache[ayahKey];

                                    return (
                                        <motion.div
                                            key={idx}
                                            id={`ayah-${res.surahNumber}-${res.ayahNumber}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className={`glass p-8 rounded-[2.5rem] border transition-all group ${highlightedAyah === ayahKey
                                                ? 'border-amber-400/60 bg-amber-500/10 shadow-xl shadow-amber-900/30 ring-2 ring-amber-400/30'
                                                : isThisPlaying
                                                    ? 'border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-900/20'
                                                    : 'border-white/5 border-l-4 border-l-transparent hover:border-l-emerald-500'
                                                }`}
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

                                            {/* Arabic text — words as interactive chips */}
                                            {res.arabic && (
                                                <div className="mb-8">
                                                    {isWbwOpen && wbwWords.length > 0 ? (
                                                        // WBW chip layout — RTL word chips with gloss below
                                                        <div
                                                            className="flex flex-wrap gap-x-4 gap-y-6 justify-end"
                                                            dir="rtl"
                                                        >
                                                            {wbwWords.map((w: any, wi: number) => (
                                                                <div
                                                                    key={wi}
                                                                    className="flex flex-col items-center gap-1.5 group/word"
                                                                    dir="ltr"
                                                                >
                                                                    <span className="text-3xl font-arabic text-amber-100/90 leading-relaxed">{w.text}</span>
                                                                    <span className="text-[10px] font-bold text-emerald-400/70 text-center max-w-[90px] leading-snug">{w.translation}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : isWbwOpen && !wbwLoaded ? (
                                                        <div className="flex items-center justify-end gap-2 py-2">
                                                            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-xs text-slate-500 font-bold">Loading word translations…</span>
                                                        </div>
                                                    ) : (
                                                        // Plain Arabic — tapping opens WBW
                                                        <button
                                                            onClick={() => res.surahNumber && res.ayahNumber && fetchWbwAyah(res.surahNumber, res.ayahNumber)}
                                                            className="w-full text-right group/arabic"
                                                            title="Tap to see word-by-word translation"
                                                        >
                                                            <p className="text-4xl font-arabic text-right leading-[2] text-amber-100/90 selection:bg-amber-500/30 group-hover/arabic:text-amber-100 transition-colors">
                                                                {res.arabic}
                                                            </p>
                                                            {res.type === 'Quran' && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 group-hover/arabic:text-amber-500/50 transition-colors">
                                                                    tap for word-by-word ↑
                                                                </span>
                                                            )}
                                                        </button>
                                                    )}
                                                    {/* Collapse button when open */}
                                                    {isWbwOpen && (
                                                        <button
                                                            onClick={() => setWbwActive(null)}
                                                            className="mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                                                        >
                                                            <ChevronDown className="w-3 h-3 rotate-180" /> hide word-by-word
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Translation */}
                                            <p className={`text-xl text-slate-200 selection:bg-emerald-500/30 font-medium leading-relaxed ${res.type === 'Quran' ? 'font-serif' : 'font-sans'}`}>
                                                {res.text}
                                            </p>
                                        </motion.div>
                                    );
                                })
                            ) : subTab === 'search' ? (
                                <div className="text-center py-32 glass rounded-[3rem] border border-white/5">
                                    <AlertCircle className="w-16 h-16 mx-auto mb-6 opacity-20 text-emerald-400" />
                                    <p className="text-2xl font-bold tracking-tight mb-2 uppercase text-slate-400">No Results Found</p>
                                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Try broader keywords like "Prayer", "Faith", or "Patience".</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setGradeFilter(null); }}
                                        className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            ) : subTab === 'quran' ? (
                                <div className="text-center py-20 opacity-40">
                                    <BookOpen className="w-14 h-14 mx-auto mb-4 text-amber-500" />
                                    <p className="text-lg font-black uppercase tracking-widest text-slate-400">Select a Surah</p>
                                    <p className="text-sm text-slate-500 font-medium mt-2">Choose any surah from the list on the left to begin reading.</p>
                                </div>
                            ) : (
                                <div className="text-center py-20 opacity-40">
                                    <Hash className="w-14 h-14 mx-auto mb-4 text-emerald-500" />
                                    <p className="text-lg font-black uppercase tracking-widest text-slate-400">Select a Collection</p>
                                    <p className="text-sm text-slate-500 font-medium mt-2">Choose a hadith collection from the sidebar, then browse by book.</p>
                                </div>
                            )}

                            {/* Hadith page navigation — only shown when browsing a book */}
                            {results.length > 0 && !searchQuery && !jumpToNum && subTab === 'hadith' && selectedBook && (
                                <div className="flex flex-col items-center gap-4 pt-12">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Showing #{browseOffset} – #{Math.min(browseOffset + BROWSE_PAGE - 1, selectedBook?.last || browseOffset + BROWSE_PAGE)}
                                        {selectedBook && <> &nbsp;·&nbsp; {selectedBook.name}</>}
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            disabled={browseOffset <= (selectedBook?.first ?? 1)}
                                            onClick={() => {
                                                const newOffset = Math.max((selectedBook?.first ?? 1), browseOffset - BROWSE_PAGE);
                                                setBrowseOffset(newOffset);
                                                fetchHadithRange(selectedCollection, newOffset, BROWSE_PAGE);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="flex items-center gap-2 px-8 py-3 bg-slate-900 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all hover:bg-slate-800"
                                        >
                                            <SkipBack className="w-3.5 h-3.5" /> Previous
                                        </button>
                                        <button
                                            disabled={selectedBook?.last ? browseOffset + BROWSE_PAGE > selectedBook.last : false}
                                            onClick={() => {
                                                const newOffset = browseOffset + BROWSE_PAGE;
                                                setBrowseOffset(newOffset);
                                                fetchHadithRange(selectedCollection, newOffset, BROWSE_PAGE);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 shadow-lg shadow-emerald-500/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 text-white disabled:opacity-30"
                                        >
                                            Next <SkipForward className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
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
