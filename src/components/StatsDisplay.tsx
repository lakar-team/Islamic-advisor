import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Globe } from 'lucide-react';
import { statsService, type SiteStats } from '../lib/stats-service';
import { motion } from 'framer-motion';

const StatsDisplay: React.FC = () => {
    const [stats, setStats] = useState<SiteStats | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            const data = await statsService.fetchStats();
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
        .slice(0, 5);

    const getFlagEmoji = (countryCode: string) => 
        countryCode.toUpperCase().replace(/./g, char => 
            String.fromCodePoint(char.charCodeAt(0) + 127397)
        );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-8 py-6 px-8 bg-surface-container-low dark:bg-slate-900 border border-outline-variant/30 rounded-[2rem] max-w-4xl mx-auto shadow-sm"
        >
            <div className="flex items-center gap-3">
                <div className="bg-surface-container-highest dark:bg-blue-500/10 p-2.5 rounded-xl border border-outline-variant/20">
                    <Users className="w-5 h-5 text-on-surface dark:text-blue-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Global Visitors</p>
                    <p className="text-xl font-black text-on-surface dark:text-white leading-none mt-1">{stats.total_visitors.toLocaleString()}</p>
                </div>
            </div>

            <div className="w-px h-10 bg-outline-variant/30 hidden sm:block"></div>

            <div className="flex items-center gap-3">
                <div className="bg-surface-container-highest dark:bg-amber-500/10 p-2.5 rounded-xl border border-outline-variant/20">
                    <MessageSquare className="w-5 h-5 text-on-surface dark:text-amber-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Questions Answered</p>
                    <p className="text-xl font-black text-on-surface dark:text-white leading-none mt-1">{stats.questions_answered.toLocaleString()}</p>
                </div>
            </div>

            {topCountries.length > 0 && (
                <>
                    <div className="w-px h-10 bg-outline-variant/30 hidden sm:block"></div>
                    <div className="flex items-center gap-3">
                        <div className="bg-surface-container-highest dark:bg-purple-500/10 p-2.5 rounded-xl border border-outline-variant/20">
                            <Globe className="w-5 h-5 text-on-surface dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Top Regions</p>
                            <div className="flex gap-2.5 mt-1">
                                {topCountries.map(([code]) => (
                                    <span key={code} className="text-lg leading-none" title={code}>{getFlagEmoji(code)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default StatsDisplay;
