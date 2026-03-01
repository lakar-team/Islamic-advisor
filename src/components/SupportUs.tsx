import React, { useState } from 'react';
import { Heart, Server, Cpu, Globe, Sparkles, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const SupportUs: React.FC = () => {
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
    const [isLoadingStripe, setIsLoadingStripe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const suggestedAmounts = [3, 5, 10, 20];

    const amount = customAmount ? parseFloat(customAmount) : (selectedAmount ?? 5);
    const paypalUrl = `https://www.paypal.com/paypalme/adamraman/${amount}USD`;

    const handleStripeDonate = async () => {
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid donation amount.');
            return;
        }

        setIsLoadingStripe(true);
        setError(null);

        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            if (data.url) {
                window.location.assign(data.url);
            } else {
                throw new Error('No checkout URL received from server');
            }
        } catch (err: any) {
            setError(err.message || 'The Stripe service is currently unavailable. Please try PayPal.');
        } finally {
            setIsLoadingStripe(false);
        }
    };

    const costs = [
        { icon: Cpu, label: 'AI API', desc: 'Every question asked uses real compute — paid per token.', color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { icon: Server, label: 'Hosting & Domain', desc: 'Cloud infrastructure and domain registration to keep the platform live, fast, and globally accessible.', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { icon: Globe, label: 'Future Development', desc: 'New features, expanded Islamic content, multilingual support, and continuous improvement of the platform.', color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ];

    return (
        <div className="max-w-5xl mx-auto py-16 px-6 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-16">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl mb-8 shadow-2xl shadow-emerald-900/20"
                >
                    <Heart className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tighter"
                >
                    Keep the <span className="gold-text">Sheikh</span><br />
                    Free for the <span className="text-emerald-400">Ummah.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium"
                >
                    This platform is built and maintained as a <em className="text-emerald-300">sadaqah jariyah</em> — a continuous charity for the Ummah.
                    Running it requires real costs: <span className="text-white font-semibold">AI API access, cloud hosting, and infrastructure</span>.
                    With your generous support, we can continue to grow a platform for <span className="text-emerald-300 font-semibold">AI-powered personalised Islamic guidance</span> — delivered with 100% privacy and 100% accuracy.
                </motion.p>
            </div>

            {/* What Keeps Us Running */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16"
            >
                {costs.map((item, i) => (
                    <div key={i} className="glass p-6 rounded-3xl border border-white/5 flex items-start gap-4 hover:border-emerald-500/20 transition-all">
                        <div className={`${item.bg} w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center`}>
                            <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <div>
                            <p className={`text-base font-black ${item.color} mb-1`}>{item.label}</p>
                            <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Donation Widget */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass max-w-2xl mx-auto p-10 rounded-[3rem] border border-emerald-900/30 shadow-2xl shadow-emerald-900/10"
            >
                <div className="flex items-center gap-3 mb-8">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-2xl font-black tracking-tight">Choose Your Contribution</h2>
                </div>

                {/* Quick Select */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {suggestedAmounts.map(amt => (
                        <button
                            key={amt}
                            onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                            className={`py-4 rounded-2xl font-black text-lg transition-all border ${selectedAmount === amt && !customAmount
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30 scale-105'
                                : 'bg-slate-900 border-white/5 text-slate-400 hover:border-emerald-500/30 hover:text-white'
                                }`}
                        >
                            ${amt}
                        </button>
                    ))}
                </div>

                {/* Custom Amount */}
                <div className="relative mb-8">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Custom amount..."
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                        className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 px-12 py-5 rounded-2xl text-xl font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-700"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm">USD</span>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-red-200 text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                {/* Donation Buttons */}
                <div className="flex flex-col gap-4">
                    {/* Stripe Button */}
                    <button
                        onClick={handleStripeDonate}
                        disabled={isLoadingStripe}
                        className="w-full flex items-center justify-center gap-3 py-6 bg-white hover:bg-slate-100 text-slate-950 font-black text-xl rounded-2xl transition-all shadow-2xl shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isLoadingStripe ? (
                            <div className="w-6 h-6 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                        ) : (
                            <>
                                <Globe className="w-6 h-6" />
                                <span className="flex items-center gap-2">
                                    Donate ${isNaN(amount) || amount <= 0 ? '5' : amount} via Credit Card / Pay
                                </span>
                            </>
                        )}
                    </button>

                    {/* PayPal Button */}
                    <a
                        href={paypalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-lg rounded-2xl transition-all shadow-2xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest"
                    >
                        <Heart className="w-5 h-5" />
                        Donate ${isNaN(amount) || amount <= 0 ? '5' : amount} via PayPal
                        <ExternalLink className="w-4 h-4 opacity-70" />
                    </a>
                </div>

                <p className="text-center text-xs text-slate-600 font-bold mt-6 leading-relaxed">
                    You'll be redirected to Stripe or PayPal to complete your donation securely.<br />
                    Any amount is a barakah. JazakAllahu Khayran 🌿
                </p>
            </motion.div>

            {/* Story Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-20 max-w-2xl mx-auto text-center"
            >
                <div className="glass p-10 rounded-[2.5rem] border border-white/5">
                    <p className="text-2xl text-emerald-300/90 font-black leading-snug mb-5 font-arabic" dir="rtl" lang="ar">
                        مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنۢبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍ مِّا۟ئَةُ حَبَّةٍ ۗ وَٱللَّهُ يُضَٰعِفُ لِمَن يَشَآءُ
                    </p>
                    <p className="text-slate-300 text-base italic leading-relaxed font-medium mb-4">
                        "The example of those who spend their wealth in the way of Allah is like a grain of corn that sprouts seven ears, each bearing a hundred grains. And Allah multiplies the reward even more for whoever He wills."
                    </p>
                    <p className="text-amber-500/80 text-sm font-bold uppercase tracking-widest">— Surah Al-Baqarah 2:261 — The Holy Quran</p>

                    <div className="mt-10 pt-8 border-t border-white/5 text-slate-500 text-sm leading-relaxed font-medium">
                        <p>Your donation directly funds AI API costs, server hosting, and ongoing infrastructure — keeping this platform free and accessible for every Muslim worldwide, regardless of their means.</p>
                        <p className="mt-4 text-emerald-400/70 font-bold">— Lakar Team, Founders & Developers</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SupportUs;
