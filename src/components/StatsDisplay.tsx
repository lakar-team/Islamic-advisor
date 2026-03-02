import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Globe } from 'lucide-react';
import { statsService, SiteStats } from '../lib/stats-service';
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
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-8 py-6 px-4 bg-emerald-950/20 backdrop-blur-sm border border-emerald-500/10 rounded-[2rem] max-w-4xl mx-auto mb-12 shadow-inner"
        >
            <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-xl">
                    <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Visitors</p>
                    <p className="text-xl font-black text-white">{stats.total_visitors.toLocaleString()}</p>
                </div>
            </div>

            <div className="w-px h-10 bg-emerald-500/10 hidden sm:block"></div>

            <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-xl">
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Questions Answered</p>
                    <p className="text-xl font-black text-white">{stats.questions_answered.toLocaleString()}</p>
                </div>
            </div>

            {topCountries.length > 0 && (
                <>
                    <div className="w-px h-10 bg-emerald-500/10 hidden sm:block"></div>
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-2 rounded-xl">
                            <Globe className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top Regions</p>
                            <div className="flex gap-2">
                                {topCountries.map(([code]) => (
                                    <span key={code} className="text-sm font-black text-slate-300">{code}</span>
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
