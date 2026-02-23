import { Compass, BookOpen, Shield, Heart, Globe, Github, MessageSquare, Library } from 'lucide-react';
import { useState } from 'react';
import SheikhChat from './components/SheikhChat';
import KnowledgeLibrary from './components/KnowledgeLibrary';

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'library'>('chat');
  const [libraryContext, setLibraryContext] = useState<{ tab: 'quran' | 'hadith', query: string } | null>(null);

  const handleOpenLibrary = (tab: 'quran' | 'hadith', query: string) => {
    setLibraryContext({ tab, query });
    setActiveTab('library');
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-emerald-900/10">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setActiveTab('chat'); setLibraryContext(null); }}>
          <div className="bg-primary p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg">
            <Compass className="text-amber-500 w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight gold-text">Online Sheikh</span>
        </div>

        <div className="flex items-center gap-4 md:gap-8 text-xs md:text-sm font-semibold text-slate-400">
          <button
            onClick={() => { setActiveTab('chat'); setLibraryContext(null); }}
            className={`flex items-center gap-2 transition-all p-2 md:p-0 ${activeTab === 'chat' ? 'text-amber-500 font-bold bg-amber-500/10 rounded-xl md:bg-transparent' : 'hover:text-amber-500'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Advice & Guidance</span>
            <span className="sm:hidden">Advice</span>
          </button>
          <button
            onClick={() => { setActiveTab('library'); setLibraryContext(null); }}
            className={`flex items-center gap-2 transition-all p-2 md:p-0 ${activeTab === 'library' ? 'text-amber-500 font-bold bg-amber-500/10 rounded-xl md:bg-transparent' : 'hover:text-amber-500'}`}
          >
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">Knowledge Library</span>
            <span className="sm:hidden">Library</span>
          </button>
        </div>

        <button className="hidden sm:flex bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl border border-slate-700 transition-all text-sm font-bold items-center gap-2 shadow-xl">
          <Github className="w-4 h-4" />
          Open Source
        </button>
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

          <div className="flex flex-wrap justify-center gap-6 mb-20 opacity-80">
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
        </header>
      )}

      {/* Main Content Area */}
      <main className="px-6 flex-1">
        {activeTab === 'chat' ? (
          <>
            <SheikhChat onOpenLibrary={handleOpenLibrary} />
            {/* Ad Placeholder */}
            <div className="max-w-4xl mx-auto my-12 p-8 border-2 border-dashed border-slate-800 rounded-3xl text-center bg-slate-900/20">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] block mb-4">Support Our Project</span>
              <div className="text-slate-500 italic text-sm">
                "Ad Slot Placeholder: Supporting the infra costs while keeping the AI Sheikh free for all"
              </div>
            </div>
          </>
        ) : (
          <KnowledgeLibrary
            key={libraryContext?.query || 'default'}
            initialTab={libraryContext?.tab}
            initialQuery={libraryContext?.query}
          />
        )}
      </main>

      {/* Values Grid */}
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
            <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center">
              <Shield className="text-emerald-500 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">Safe Consumption</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              Intelligent rate-limiting ensures that the platform remains stable and free for human seekers, preventing bot abuse.
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
        </div>
      </section>

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
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
