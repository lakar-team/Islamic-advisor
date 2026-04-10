import React, { useEffect, useState } from 'react';
import { Send, User } from 'lucide-react';
import { statsService, type Review } from '../lib/stats-service';
import { motion } from 'framer-motion';

const RollingReviews: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const loadReviews = async () => {
            const data = await statsService.fetchReviews();
            setReviews(data);
        };
        loadReviews();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !text) return;

        setIsSubmitting(true);
        const newReview = await statsService.addReview(name, text);
        if (newReview) {
            setReviews((prev: Review[]) => [newReview, ...prev].slice(0, 50));
            setName('');
            setText('');
            setShowForm(false);
        }
        setIsSubmitting(false);
    };

    return (
        <section className="py-24 px-6 bg-surface-container-lowest dark:bg-[#0A0F14] border-t border-outline-variant/30 transition-colors duration-300 overflow-hidden">
            <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-on-surface dark:text-white">
                        Community <span className="text-emerald-600 dark:text-emerald-500">Voices</span>
                    </h2>
                    <p className="text-on-surface-variant dark:text-slate-400 font-medium max-w-xl">
                        Real reflections from users across the Ummah finding guidance through Islamic-advisor.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-sm shadow-lg shadow-emerald-900/20"
                >
                    {showForm ? 'Cancel' : 'Leave a Comment'}
                </button>
            </div>

            {showForm && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto mb-16 bg-surface-container-low dark:bg-white/5 p-8 rounded-[2.5rem] border border-outline-variant/30 dark:border-emerald-500/20 shadow-2xl backdrop-blur-md"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Abu Abdullah"
                                className="w-full bg-surface-container-highest dark:bg-black/40 border border-outline-variant/30 dark:border-white/10 focus:border-emerald-500 px-6 py-4 rounded-2xl text-on-surface dark:text-white font-bold transition-all placeholder:text-on-surface-variant/40 dark:placeholder:text-white/40"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">Your Reflection</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="How has this helped you?"
                                className="w-full bg-surface-container-highest dark:bg-black/40 border border-outline-variant/30 dark:border-white/10 focus:border-emerald-500 px-6 py-4 rounded-2xl text-on-surface dark:text-white font-bold transition-all min-h-[120px] resize-none placeholder:text-on-surface-variant/40 dark:placeholder:text-white/40"
                                required
                            />
                        </div>
                        <button
                            disabled={isSubmitting}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? 'Sending...' : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Submit Feedback
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            )}

            <div
                className="relative group cursor-grab active:cursor-grabbing"
                onClick={() => setIsPaused(!isPaused)}
            >
                <div
                    className={`flex gap-6 whitespace-nowrap py-4 ${isPaused ? 'pause-animation' : 'animate-scroll'}`}
                >
                    {/* Multiple duplicates for seamless loop and extra room for dragging */}
                    {[...reviews, ...reviews, ...reviews, ...reviews, ...reviews].map((review, i) => (
                        <motion.div
                            key={`${review.id}-${i}`}
                            drag="x"
                            dragConstraints={{ left: -1000, right: 1000 }}
                            onDragStart={() => {
                                setIsDragging(true);
                                setIsPaused(true);
                            }}
                            onDragEnd={() => {
                                setIsDragging(false);
                            }}
                            className="inline-block w-[350px] bg-surface-container-low dark:bg-slate-900/40 p-8 rounded-3xl border border-outline-variant/20 dark:border-emerald-900/10 hover:border-emerald-500/30 transition-all hover:bg-emerald-500/5 dark:hover:bg-emerald-950/20 whitespace-normal align-top flex-shrink-0 select-none"
                        >
                            <div className="flex items-center gap-3 mb-4 pointer-events-none">
                                <div className="bg-emerald-500/10 w-10 h-10 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-black text-on-surface dark:text-white leading-tight">{review.name}</p>
                                    <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-500 uppercase">{new Date(review.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <p className="text-on-surface-variant dark:text-slate-400 text-sm leading-relaxed font-medium pointer-events-none">
                                "{review.text}"
                            </p>
                        </motion.div>
                    ))}
                    {reviews.length === 0 && (
                        <div className="w-full text-center py-12 text-slate-600 font-bold uppercase tracking-widest italic">
                            No reflections yet. Be the first to share.
                        </div>
                    )}
                </div>

                {/* Gradient Masks */}
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-surface-container-lowest dark:from-[#0A0F14] to-transparent pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-surface-container-lowest dark:from-[#0A0F14] to-transparent pointer-events-none"></div>

                {isPaused && !isDragging && (
                    <div className="absolute top-0 right-0 m-4">
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                            Paused to Read • Click again to Resume
                        </span>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-20%); }
                }
                .animate-scroll {
                    display: flex;
                    width: max-content;
                    animation: scroll 15s linear infinite;
                }
                .pause-animation {
                    display: flex;
                    width: max-content;
                    animation: scroll 15s linear infinite;
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
};

export default RollingReviews;
