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
        <section className="py-24 px-6 bg-slate-950 border-t border-emerald-900/10 overflow-hidden">
            <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">
                        Community <span className="text-emerald-500">Voices</span>
                    </h2>
                    <p className="text-slate-400 font-medium max-w-xl">
                        Real reflections from users across the Ummah finding guidance through Online Sheikh AI.
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
                    className="max-w-2xl mx-auto mb-16 glass p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Abu Abdullah"
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 px-6 py-4 rounded-2xl text-white font-bold transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1">Your Reflection</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="How has this helped you?"
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 px-6 py-4 rounded-2xl text-white font-bold transition-all min-h-[120px] resize-none"
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

            <div className="relative group">
                <div className="flex gap-6 animate-scroll whitespace-nowrap py-4">
                    {/* Duplicate reviews for seamless scroll */}
                    {[...reviews, ...reviews, ...reviews].map((review, i) => (
                        <div
                            key={`${review.id}-${i}`}
                            className="inline-block w-[350px] bg-slate-900/40 p-8 rounded-3xl border border-emerald-900/10 hover:border-emerald-500/30 transition-all hover:bg-emerald-950/20 whitespace-normal align-top flex-shrink-0"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-emerald-500/10 w-10 h-10 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-black text-white leading-tight">{review.name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(review.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                "{review.text}"
                            </p>
                        </div>
                    ))}
                    {reviews.length === 0 && (
                        <div className="w-full text-center py-12 text-slate-600 font-bold uppercase tracking-widest italic">
                            No reflections yet. Be the first to share.
                        </div>
                    )}
                </div>

                {/* Gradient Masks */}
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none"></div>
            </div>

            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                    display: flex;
                    width: max-content;
                    animation: scroll 40s linear infinite;
                }
                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
};

export default RollingReviews;
