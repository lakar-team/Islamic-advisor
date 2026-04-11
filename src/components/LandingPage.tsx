import { motion } from 'framer-motion';
import { MaterialSymbol } from './MaterialSymbol';
import StatsDisplay from './StatsDisplay';

interface LandingPageProps {
  onStart: () => void;
  onExploreLibrary: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExploreLibrary }) => {
  return (
    <main className="min-h-screen bg-surface-container-lowest dark:bg-[#0A0F14] selection:bg-emerald-500/30">
      {/* Hero & Sheikh AI Interface */}
      <section className="relative px-8 py-12 md:py-16 max-w-screen-2xl mx-auto overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -z-10 rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] -z-10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          <div className="space-y-8 md:space-y-6 text-center lg:text-left">
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black leading-[0.9] tracking-tighter text-on-surface dark:text-white mb-8">
                Your <span className="gold-text">Personal</span><br />
                <span className="text-emerald-600 dark:text-emerald-400">Sheikh.</span>
              </h1>
              <p className="text-lg md:text-2xl text-on-surface-variant dark:text-slate-400 leading-relaxed max-w-xl font-medium font-serif italic">
                Direct access to verified scholarly guidance, the Holy Quran and Sahih Hadith. 
                Bridging classical wisdom with modern clarity.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-start gap-4 md:gap-5"
            >
              <button 
                onClick={onStart}
                className="px-8 py-4 md:px-10 md:py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-600/20 transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-3 group text-sm md:text-base"
              >
                Start Consultation
                <MaterialSymbol icon="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onExploreLibrary}
                className="px-8 py-4 md:px-10 md:py-5 bg-surface-container-low dark:bg-white/5 border border-outline-variant/30 rounded-[2rem] text-on-surface dark:text-slate-200 font-bold hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all text-sm md:text-base"
              >
                Browse Library
              </button>
            </motion.div>

            <StatsDisplay />
          </div>

          {/* AI Interface Preview Module */}
          <motion.div 
            initial={{ opacity: 0, x: 50, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-emerald-600/20 blur-[100px] -z-10 rounded-full scale-75" />
            <div className="bg-white dark:bg-[#0D1219] rounded-[3.5rem] p-3 border border-outline-variant/50 overflow-hidden shadow-[0_48px_80px_-16px_rgba(0,0,0,0.15)] dark:shadow-emerald-900/10">
              <div className="bg-surface-container-low dark:bg-slate-950/50 rounded-[2.75rem] p-8 flex flex-col h-[780px] border border-outline-variant/20">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <MaterialSymbol icon="auto_awesome" className="text-emerald-600 dark:text-emerald-400 text-2xl" />
                    </div>
                    <div>
                      <h3 className="font-black text-on-surface dark:text-white tracking-tight">Islamic Advisor</h3>
                      <p className="text-xs text-on-surface-variant dark:text-slate-500 font-bold uppercase tracking-widest">Digital Scholarly Engine</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-surface-container-highest dark:bg-white/5 flex-shrink-0 flex items-center justify-center border border-outline-variant/20">
                      <MaterialSymbol icon="mosque" className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="bg-white dark:bg-slate-900/80 p-5 rounded-3xl rounded-tl-none max-w-[85%] shadow-sm border border-outline-variant/30">
                      <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">As-salamu alaykum. I am here to help you navigate the vast oceans of Islamic knowledge. Ask me anything about Quranic wisdom or Prophetic tradition.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 flex-row-reverse">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex-shrink-0 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-emerald-500/20">M</div>
                    <div className="bg-emerald-500/10 p-5 rounded-3xl rounded-tr-none max-w-[85%] border border-emerald-500/20">
                      <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-bold italic">How can I find inner peace through the Quran during difficult times?</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-surface-container-highest dark:bg-white/5 flex-shrink-0 flex items-center justify-center border border-outline-variant/20">
                      <MaterialSymbol icon="book_2" className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="bg-white dark:bg-slate-900/80 p-5 rounded-3xl rounded-tl-none max-w-[85%] shadow-sm border border-outline-variant/30">
                      <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">Allah says in the Quran: "Unquestionably, by the remembrance of Allah hearts are assured" (13:28). This spiritual assurance comes from...</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white dark:bg-slate-900 border border-outline-variant/50 rounded-[2rem] p-2 flex items-center gap-3 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-white/5 flex items-center justify-center">
                     <MaterialSymbol icon="mood" className="text-on-surface-variant" />
                  </div>
                  <input 
                    disabled
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-on-surface dark:text-white font-medium" 
                    placeholder="Reflect on a verse..." 
                    type="text"
                  />
                  <button className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500">
                    <MaterialSymbol icon="send" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Floaties */}
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 border border-amber-500/20 rounded-full blur-xl -z-10" 
            />
            <motion.div 
               animate={{ y: [0, 10, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 border border-emerald-500/20 rounded-full blur-xl -z-10" 
            />
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="px-8 py-16 md:py-32 max-w-screen-2xl mx-auto border-t border-outline-variant/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center lg:text-left mb-20 gap-8">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <h2 className="text-5xl sm:text-6xl md:text-6xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tighter text-on-surface dark:text-white">
              <span className="gold-text">Original</span><br className="sm:hidden" />
              <span className="text-emerald-600 dark:text-emerald-400"> Islamic</span> Sources.
            </h2>
            <p className="text-on-surface-variant dark:text-slate-400 text-base md:text-xl font-medium leading-relaxed">A meticulously indexed archive of the world's most trusted Islamic sources, accessible at your fingertips.</p>
          </div>
          <button 
            onClick={onExploreLibrary}
            className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-lg hover:gap-5 transition-all group"
          >
            Access Full Archive 
            <MaterialSymbol icon="arrow_forward" className="group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
              { title: 'The Holy Quran', desc: 'Direct access to words of Divinity with Tafsir and translation.', icon: 'auto_stories', color: 'emerald', bg: 'emerald-500/5' },
              { title: 'Prophetic Wisdom', desc: 'Sahih Bukhari, Muslim, and the great collections of Hadith.', icon: 'mosque', color: 'amber', bg: 'amber-500/5' },
              { title: 'Golden Scholars', desc: 'Deep insights from traditional exegesis and linguistic analysis.', icon: 'history_edu', color: 'purple', bg: 'purple-500/5' },
           ].map((item, i) => (
              <motion.div 
                 key={i}
                 whileHover={{ y: -10 }}
                 className="p-10 bg-surface-container-low dark:bg-white/5 border border-outline-variant/30 rounded-[3rem] group transition-all hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5"
              >
                 <div className={`w-16 h-16 rounded-[1.5rem] bg-${item.color}-500/10 flex items-center justify-center mb-8 border border-${item.color}-500/20 group-hover:scale-110 transition-transform`}>
                    <MaterialSymbol icon={item.icon} className={`text-${item.color}-600 dark:text-${item.color}-400 text-3xl`} />
                 </div>
                 <h3 className="text-2xl font-black text-on-surface dark:text-white mb-4">{item.title}</h3>
                 <p className="text-on-surface-variant dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
           ))}
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
