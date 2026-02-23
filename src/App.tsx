import { Compass, BookOpen, Shield, Heart, Globe, Github } from 'lucide-react';
import SheikhChat from './components/SheikhChat';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-emerald-900/10">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-primary p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg">
            <Compass className="text-amber-500 w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight gold-text">Online Sheikh</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
          <a href="#" className="hover:text-amber-500 transition-colors">Knowledge Base</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Scholarly Sources</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Community</a>
        </div>

        <button className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl border border-slate-700 transition-all text-sm font-bold flex items-center gap-2 shadow-xl">
          <Github className="w-4 h-4" />
          Open Source
        </button>
      </nav>

      {/* Hero Section */}
      <header className="pt-20 pb-12 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/20 px-4 py-2 rounded-full mb-6">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Authenticated Islamic AI Guidance</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Consult the <span className="gold-text">Tradition</span> with <span className="text-emerald-500">Intelligence.</span>
        </h1>
        <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
          Providing authentic Islamic advice grounded in the Quran and Sahih Hadith.
          Bridging classical knowledge with modern accessibility.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Quran & Sunnah Only</span>
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full mt-2"></div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Heart className="w-4 h-4 text-emerald-500" />
            <span>Free for Everyone</span>
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full mt-2"></div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Multi-lingual Support</span>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="px-6 flex-1">
        <SheikhChat />

        {/* Ad Placeholder as requested */}
        <div className="max-w-4xl mx-auto my-12 p-8 border-2 border-dashed border-slate-800 rounded-3xl text-center bg-slate-900/20">
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] block mb-4">Support Our Project</span>
          <div className="text-slate-500 italic text-sm">
            "Ad Slot Placeholder: Supporting the infra costs while keeping the AI Sheikh free for all"
          </div>
        </div>
      </main>

      {/* Values Grid */}
      <section className="bg-slate-950 py-24 px-6 border-t border-emerald-900/10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="bg-amber-500/10 w-12 h-12 rounded-2xl flex items-center justify-center">
              <BookOpen className="text-amber-500 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Deep Foundation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every response is verified against the Quran and major Hadith collections (Bukhari, Muslim, etc.) to ensure 100% authenticity.
            </p>
          </div>
          <div className="space-y-4">
            <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center">
              <Shield className="text-emerald-500 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Safe Consumption</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Intelligent rate-limiting ensures that the platform remains stable and free for human seekers, preventing bot abuse.
            </p>
          </div>
          <div className="space-y-4">
            <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center">
              <Compass className="text-blue-500 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">For All Levels</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
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
