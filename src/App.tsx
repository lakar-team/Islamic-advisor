import { Compass, BookOpen, Shield, Heart, Globe, MessageSquare, Library, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import SheikhChat from './components/SheikhChat';
import KnowledgeLibrary from './components/KnowledgeLibrary';
import SupportUs from './components/SupportUs';
import StatsDisplay from './components/StatsDisplay';
import RollingReviews from './components/RollingReviews';
import { statsService } from './lib/stats-service';
import { motion, AnimatePresence } from 'framer-motion';

type ActiveTab = 'chat' | 'library' | 'support';

// Simple modal for footer pages
const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 relative border border-emerald-500/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
          <X className="w-7 h-7" />
        </button>
        <h3 className="text-3xl font-black gold-text tracking-tighter mb-8">{title}</h3>
        <div className="text-slate-400 leading-relaxed space-y-4 font-medium">{children}</div>
        <button
          onClick={onClose}
          className="w-full mt-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [libraryContext, setLibraryContext] = useState<{ tab: 'quran' | 'hadith', query: string } | null>(null);
  const [modal, setModal] = useState<'privacy' | 'terms' | 'contact' | 'commerce' | null>(null);
  const [donationStatus, setDonationStatus] = useState<'success' | 'cancel' | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('donation') as 'success' | 'cancel' | null;
  });

  useEffect(() => {
    // Track visit on mount
    statsService.trackVisit();
  }, []);

  // Opens the Knowledge Library in its own browser tab, preserving the current chat
  const handleOpenLibrary = (tab: 'quran' | 'hadith', query: string) => {
    // Encode the params into the URL hash so the new tab opens with the right state
    const url = new URL(window.location.href);
    url.hash = `library?tab=${tab}&q=${encodeURIComponent(query)}`;
    window.open(url.toString(), '_blank');
  };

  // Read URL hash on load — if this tab was opened as a library tab, show library
  const hashParams = (() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('library?')) {
        const params = new URLSearchParams(hash.replace('library?', ''));
        return { tab: params.get('tab') as 'quran' | 'hadith', query: params.get('q') || '' };
      }
    } catch { /* ignore */ }
    return null;
  })();

  // If this is a library deep-link tab, render only the library
  if (hashParams) {
    return (
      <div className="min-h-screen flex flex-col">
        <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-emerald-900/10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.close()}>
            <div className="bg-primary p-2 rounded-lg shadow-lg">
              <Compass className="text-amber-500 w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight gold-text">Online Sheikh AI</span>
          </div>
          <span className="text-sm text-slate-500 font-bold">Knowledge Library</span>
        </nav>
        <main className="px-6 flex-1">
          <KnowledgeLibrary
            key={hashParams.query || 'default'}
            initialTab={hashParams.tab}
            initialQuery={hashParams.query}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-emerald-900/10">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setActiveTab('chat'); setLibraryContext(null); }}>
          <div className="bg-primary p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg">
            <Compass className="text-amber-500 w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight gold-text">Online Sheikh AI</span>
        </div>

        <div className="flex items-center gap-2 md:gap-6 text-xs md:text-sm font-semibold text-slate-400">
          <button
            onClick={() => { setActiveTab('chat'); setLibraryContext(null); }}
            className={`flex items-center gap-2 transition-all px-3 py-2 rounded-xl ${activeTab === 'chat' ? 'text-amber-500 font-bold bg-amber-500/10' : 'hover:text-amber-500 hover:bg-white/5'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Advice & Guidance</span>
            <span className="sm:hidden">Advice</span>
          </button>
          <button
            onClick={() => { setActiveTab('library'); setLibraryContext(null); }}
            className={`flex items-center gap-2 transition-all px-3 py-2 rounded-xl ${activeTab === 'library' ? 'text-amber-500 font-bold bg-amber-500/10' : 'hover:text-amber-500 hover:bg-white/5'}`}
          >
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">Knowledge Library</span>
            <span className="sm:hidden">Library</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 transition-all px-3 py-2 rounded-xl ${activeTab === 'support' ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/5'}`}
          >
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Support Us</span>
          </button>
        </div>


        {/* Donation Notifications */}
        <AnimatePresence>
          {donationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md"
            >
              <div className={`p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-4 ${donationStatus === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30'
                : 'bg-slate-900/90 border-slate-700'
                }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${donationStatus === 'success' ? 'bg-emerald-500/20' : 'bg-slate-800'
                  }`}>
                  {donationStatus === 'success' ? (
                    <Heart className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <X className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-white text-lg tracking-tight">
                    {donationStatus === 'success' ? 'JazakAllahu Khayran!' : 'Donation Cancelled'}
                  </h4>
                  <p className="text-slate-400 text-sm font-medium mt-1">
                    {donationStatus === 'success'
                      ? 'Your generous support helps keep the Sheikh accessible to the Ummah. May Allah reward you.'
                      : 'No worries! You can still support the project anytime you wish.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDonationStatus(null);
                    // Clean up URL
                    const url = new URL(window.location.href);
                    url.searchParams.delete('donation');
                    window.history.replaceState({}, '', url.toString());
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${donationStatus === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </nav>

      {/* Hero Section - Only show on Chat Tab */}
      {activeTab === 'chat' && (
        <header className="pt-24 pb-16 px-6 text-center max-w-5xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-emerald-950/40 backdrop-blur-md border border-emerald-500/20 px-5 py-2.5 rounded-full mb-8 shadow-inner animate-float">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Authenticated Scholarly Logic</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tighter">
            Traditional <span className="gold-text">Wisdom</span><br />
            Intelligence <span className="text-emerald-500">Unveiled.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-3xl mx-auto font-medium leading-relaxed">
            Providing authentic Islamic advice grounded in the Quran and Sahih Hadith.
            Bridging classical knowledge with state-of-the-art AI precision.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-16 opacity-80">
            <div className="flex items-center gap-2.5 text-slate-300 text-sm font-bold tracking-wide">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <span>QURAN & SUNNAH</span>
            </div>
            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full mt-2"></div>
            <div className="flex items-center gap-2.5 text-slate-300 text-sm font-bold tracking-wide">
              <Heart className="w-5 h-5 text-emerald-500" />
              <span>FREE FOR UMMAH</span>
            </div>
            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full mt-2"></div>
            <div className="flex items-center gap-2.5 text-slate-300 text-sm font-bold tracking-wide">
              <Globe className="w-5 h-5 text-blue-500" />
              <span>MULTI-LINGUAL</span>
            </div>
          </div>

          <StatsDisplay />
        </header>
      )}

      {/* Main Content Area */}
      <main className="px-6 flex-1">
        {activeTab === 'chat' ? (
          <>
            <SheikhChat onOpenLibrary={handleOpenLibrary} />
            {/* Donation CTA Banner */}
            <div className="max-w-4xl mx-auto my-12">
              <div
                className="p-8 rounded-3xl border border-emerald-900/30 bg-gradient-to-r from-emerald-950/40 to-slate-900/40 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer hover:border-emerald-500/30 transition-all group"
                onClick={() => setActiveTab('support')}
              >
                <div className="flex items-center gap-5">
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10 group-hover:bg-emerald-500/20 transition-all">
                    <Heart className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-black text-white text-lg tracking-tight">Keep the Sheikh Free for All</p>
                    <p className="text-slate-400 text-sm font-medium mt-0.5">API costs money. Your sadaqah keeps this running for the entire Ummah.</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTab('support'); }}
                  className="shrink-0 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-900/30 text-sm uppercase tracking-widest group-hover:scale-105"
                >
                  Donate →
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'library' ? (
          <KnowledgeLibrary
            key={libraryContext?.query || 'default'}
            initialTab={libraryContext?.tab}
            initialQuery={libraryContext?.query}
          />
        ) : (
          <SupportUs />
        )}
      </main>

      {/* Values Grid */}
      {activeTab === 'chat' && (
        <section className="bg-slate-950 py-24 px-6 border-t border-emerald-900/10">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
            <div className="value-card space-y-4 p-8 rounded-3xl bg-slate-900/40 border border-emerald-900/10">
              <div className="bg-amber-500/10 w-14 h-14 rounded-2xl flex items-center justify-center">
                <BookOpen className="text-amber-500 w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100">Deep Foundation</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Every response is verified against the Quran and major Hadith collections (Bukhari, Muslim, etc.) to ensure 100% authenticity.
              </p>
            </div>
            <div className="value-card space-y-4 p-8 rounded-3xl bg-slate-900/40 border border-emerald-900/10">
              <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center">
                <Compass className="text-blue-500 w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100">For All Levels</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Whether you are a new convert or a lifelong student, our AI adjusts its complexity to meet your level of understanding.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('library')}
              className="value-card text-left space-y-4 p-8 rounded-3xl bg-slate-900/40 border border-emerald-900/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
            >
              <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Library className="text-emerald-400 w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">Knowledge Library</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Browse Quran verses and authentic Hadith directly — search, explore, and verify any AI explanation against the primary sources yourself.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-500/60 group-hover:text-emerald-400 transition-colors">
                Open Library →
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Community Reflections */}
      {activeTab === 'chat' && <RollingReviews />}

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-900 bg-bg-dark">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Compass className="text-amber-500 w-5 h-5" />
            <span className="font-bold gold-text">Online Sheikh AI</span>
          </div>
          <div className="text-sm text-slate-500">
            © 2026 Built with 💚 for the Ummah. Use responsibly.
          </div>
          <div className="flex gap-6 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <button onClick={() => setModal('privacy')} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setModal('terms')} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => setModal('commerce')} className="hover:text-white transition-colors">Commerce Disclosure</button>
            <button onClick={() => setModal('contact')} className="hover:text-white transition-colors">Contact</button>
          </div>
        </div>
      </footer>

      {/* Footer Modals */}
      {modal === 'privacy' && (
        <Modal title="Privacy Policy" onClose={() => setModal(null)}>
          <p>Online Sheikh AI does not store your conversations on any server. All chat history is saved locally in your browser only and never transmitted to third parties.</p>
          <p>We use a third-party AI API (OpenRouter) to route requests to language models. Your questions are sent to their servers for processing; please review <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">OpenRouter's Privacy Policy</a> for details on how they handle data.</p>
          <p>We do not use cookies, trackers, or analytics beyond basic Cloudflare hosting metrics.</p>
        </Modal>
      )}
      {modal === 'terms' && (
        <Modal title="Terms of Use" onClose={() => setModal(null)}>
          <p>This platform provides AI-generated Islamic guidance for educational and informational purposes only. It is <strong className="text-white">not a substitute</strong> for qualified human scholars, imams, or jurists.</p>
          <p>For matters requiring an official Fatwa (religious ruling), always consult a qualified local scholar. Online Sheikh AI and its creators bear no responsibility for actions taken based solely on AI-generated advice.</p>
          <p>By using this service, you agree to use it in good faith and not attempt to extract harmful, offensive, or misleading content. Abuse may result in access being restricted.</p>
        </Modal>
      )}
      {modal === 'commerce' && (
        <Modal title="Commerce Disclosure" onClose={() => setModal(null)}>
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-bold uppercase">Legal Name</span>
              <span className="text-slate-300">We will disclose without delay if requested</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-bold uppercase">Address</span>
              <span className="text-slate-300">We will disclose without delay if requested</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-bold uppercase">Phone Number</span>
              <span className="text-slate-300">We will disclose without delay if requested</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-bold uppercase">Email</span>
              <span className="text-slate-300">lakar.team@gmail.com</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-bold uppercase">Head of Operations</span>
              <span className="text-slate-300">Adam Raman</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-bold uppercase">Returns/Refunds</span>
              <span className="text-slate-300">Donations are non-refundable. Contact us for duplicate errors.</span>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-4">Full disclosure available on the <button onClick={() => { setModal(null); setActiveTab('support'); }} className="text-emerald-400 hover:underline">Support Us</button> page.</p>
          </div>
        </Modal>
      )}
      {modal === 'contact' && (
        <Modal title="Contact" onClose={() => setModal(null)}>
          <p>This project is built and maintained by the <strong className="text-white">Lakar Team</strong> as a service to the Ummah.</p>
          <p>For questions, bug reports, or collaboration inquiries, please reach out via email:</p>
          <a
            href="mailto:lakar.team@gmail.com"
            className="block text-center py-4 px-8 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl text-emerald-400 font-black hover:bg-emerald-600/30 transition-all"
          >
            lakar.team@gmail.com
          </a>
          <p>You can also support the project financially to help cover API costs — click <button onClick={() => { setModal(null); setActiveTab('support'); }} className="text-emerald-400 hover:underline font-bold">Support Us</button>.</p>
        </Modal>
      )}
    </div>
  );
}

export default App;
