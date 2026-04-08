import React, { useState } from 'react';
import { Heart, Server, Cpu, Globe, Sparkles, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const SupportUs: React.FC = () => {
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'bank' | null>(null);

    const suggestedAmounts = [3, 5, 10, 20];

    const amount = customAmount ? parseFloat(customAmount) : (selectedAmount ?? 5);
    const paypalUrl = `https://www.paypal.com/paypalme/adamraman/${amount}USD`;

    const wiseDetails = {
        name: 'Bin M Raman Adam',
        iban: 'GB53 TRWI 2308 0197 1176 50',
        swift: 'TRWIGB2LXXX',
        bank: 'Wise Payments Limited',
        address: '1st Floor, Worship Square, 65 Clifton Street, London, EC2A 4JE, UK'
    };

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
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
                    Keep <span className="gold-text">Islamic-advisor</span><br />
                    Free for the <span className="text-emerald-400">Ummah.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium"
                >
                    This platform is maintained as a <em className="text-emerald-300">sadaqah jariyah</em>.
                    Running it requires real costs: <span className="text-white font-semibold">AI API access, hosting, and infrastructure</span>.
                    Your support ensures every Muslim can access personalized Islamic guidance for free.
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
                className="max-w-4xl mx-auto glass p-8 md:p-12 rounded-[3rem] border border-emerald-900/30 shadow-2xl shadow-emerald-900/10 flex flex-col items-center"
            >
                {!selectedMethod ? (
                    <div className="w-full text-center">
                        <h2 className="text-3xl font-black tracking-tight mb-8">Choose a Giving Method</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
                            <button
                                onClick={() => setSelectedMethod('paypal')}
                                className="flex flex-col items-center p-8 bg-black/40 border border-white/5 rounded-3xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                            >
                                <div className="bg-amber-500/20 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-8 h-8 text-amber-500" />
                                </div>
                                <span className="font-black text-xl mb-2">Donate via PayPal</span>
                                <span className="text-sm font-medium text-slate-400">Quick, instant, and secure gifts.</span>
                            </button>
                            
                            <button
                                onClick={() => setSelectedMethod('bank')}
                                className="flex flex-col items-center p-8 bg-black/40 border border-white/5 rounded-3xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                            >
                                <div className="bg-emerald-500/20 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    <Globe className="w-8 h-8 text-emerald-400" />
                                </div>
                                <span className="font-black text-xl mb-2">Bank Transfer (Wise)</span>
                                <span className="text-sm font-medium text-slate-400">Low fees worldwide, 100% impact.</span>
                            </button>
                        </div>
                    </div>
                ) : selectedMethod === 'bank' ? (
                    <div className="w-full max-w-xl mx-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Globe className="w-6 h-6 text-emerald-400" /> Wise Bank Transfer
                            </h2>
                            <button onClick={() => setSelectedMethod(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white px-3 py-1.5 border border-white/10 rounded-xl transition-all">Back</button>
                        </div>

                        <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed">
                            Transfers via <strong className="text-white">Wise</strong> have the lowest fees worldwide. Simply copy these details into your baking app to complete the transfer.
                        </p>

                        <div className="space-y-4">
                            {[
                                { label: 'Name', value: wiseDetails.name, id: 'name' },
                                { label: 'IBAN', value: wiseDetails.iban, id: 'iban' },
                                { label: 'Swift/BIC', value: wiseDetails.swift, id: 'swift' },
                            ].map((field) => (
                                <div key={field.id} className="group relative">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1.5 ml-1">{field.label}</p>
                                    <button
                                        onClick={() => handleCopy(field.value, field.id)}
                                        className="w-full flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all text-left"
                                    >
                                        <span className="text-sm font-black text-slate-200 tracking-tight truncate mr-4">{field.value}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg shrink-0">
                                            {copiedField === field.id ? 'Copied!' : 'Copy'}
                                        </span>
                                    </button>
                                </div>
                            ))}

                            <div className="pt-4 mt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Server className="w-3.5 h-3.5 text-slate-500" />
                                    <p className="text-[10px] font-black uppercase text-slate-500">Bank & Address</p>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                                    {wiseDetails.bank}<br />
                                    {wiseDetails.address}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-md mx-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-amber-500" /> PayPal
                            </h2>
                            <button onClick={() => setSelectedMethod(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white px-3 py-1.5 border border-white/10 rounded-xl transition-all">Back</button>
                        </div>

                        <div className="flex-1 space-y-8">
                            <p className="text-slate-400 text-sm font-bold text-center">Select an amount or enter your own.</p>
                            
                            {/* Quick Select */}
                            <div className="grid grid-cols-4 gap-3">
                                {suggestedAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                                        className={`py-4 rounded-2xl font-black text-lg transition-all border ${selectedAmount === amt && !customAmount
                                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                                            : 'bg-black/40 border-white/5 text-slate-400 hover:border-emerald-500/30 hover:text-white'
                                            }`}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Amount */}
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Custom amount..."
                                    value={customAmount}
                                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                                    className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 px-12 py-5 rounded-2xl text-xl font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans text-white placeholder:text-slate-600"
                                />
                            </div>

                            {/* PayPal Button */}
                            <a
                                href={paypalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-4 py-6 bg-white hover:bg-slate-100 text-slate-950 font-black text-xl rounded-2xl transition-all shadow-xl shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest group"
                            >
                                <Heart className="w-6 h-6 text-emerald-600 fill-emerald-600/20" />
                                <span>Continue to PayPal</span>
                                <ExternalLink className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                            </a>
                        </div>
                    </div>
                )}
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
