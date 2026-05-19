import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Globe } from 'lucide-react';
import { statsService, type SiteStats } from '../lib/stats-service';
import { motion } from 'framer-motion';

const StatsDisplay: React.FC = () => {
    const [stats, setStats] = useState<SiteStats | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            // Try local API first
            let data = await statsService.fetchStats();
            // Fallback: fetch from production if local fails (e.g. stable subdomain without KV bindings)
            if (!data) {
                try {
                    const res = await fetch('https://islamic-advisor.pages.dev/api/stats');
                    if (res.ok) data = await res.json();
                } catch { /* ignore */ }
            }
            if (data) setStats(data);
        };
        loadStats();
        // Refresh stats every 5 minutes
        const interval = setInterval(loadStats, 300000);
        return () => clearInterval(interval);
    }, []);

    if (!stats) return null;

    const topCountries = Object.entries(stats.country_counts || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 8);

    const getFlagImage = (countryCode: string) => 
        `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

    return (
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
            {/* Top row: Core metrics */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap justify-center sm:justify-start gap-6 py-4 px-4 sm:py-6 sm:px-8 bg-surface-container-low dark:bg-slate-900 border border-outline-variant/30 rounded-[2rem] shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[11px] md:text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Global Visitors</p>
                        <p className="text-3xl md:text-xl font-black text-on-surface dark:text-white leading-none mt-1">{stats.total_visitors.toLocaleString()}</p>
                    </div>
                </div>

                <div className="w-px h-10 bg-outline-variant/30 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                        <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[11px] md:text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Questions Answered</p>
                        <p className="text-3xl md:text-xl font-black text-on-surface dark:text-white leading-none mt-1">{stats.questions_answered.toLocaleString()}</p>
                    </div>
                </div>
            </motion.div>

            {/* Bottom row: Top Regions */}
            {topCountries.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 py-3 px-4 sm:py-4 sm:px-8 bg-surface-container-low dark:bg-slate-900 border border-outline-variant/30 rounded-3xl shadow-sm w-full"
                >
                    <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 flex-shrink-0">
                        <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex items-center justify-start gap-4 flex-1 min-w-0 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest whitespace-nowrap hidden sm:block">Top Regions</p>
                        <div className="w-px h-6 bg-outline-variant/30 hidden sm:block mx-1"></div>
                        <div className="flex gap-3">
                            {topCountries.map(([code]) => (
                                <div key={code} className="flex items-center justify-center overflow-hidden rounded-lg border border-outline-variant/20 hover:scale-110 transition-all shadow-sm" title={code} style={{ width: 56, height: 38 }}>
                                    <img
                                        src={getFlagImage(code)}
                                        alt={code}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default StatsDisplay;
