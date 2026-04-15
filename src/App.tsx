import { Compass, Shield, Heart, X, User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import SheikhChat from './components/SheikhChat';
import KnowledgeLibrary from './components/KnowledgeLibrary';
import SupportUs from './components/SupportUs';
import { statsService } from './lib/stats-service';
import RollingReviews from './components/RollingReviews';
import LandingPage from './components/LandingPage';
import { MaterialSymbol } from './components/MaterialSymbol';
import { motion, AnimatePresence } from 'framer-motion';
import { validateState, validateNonce, decodeJwt } from './lib/oauth-utils';

type ActiveTab = 'landing' | 'chat' | 'library' | 'support';

// Simple modal for footer pages
const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="glass bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 relative border border-emerald-500/20 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-8 right-8 text-slate-400 hover:text-emerald-500 transition-colors p-2 z-[60]"
        aria-label="Close modal"
      >
        <X className="w-8 h-8" />
      </button>
      <h3 className="text-3xl font-black text-on-surface dark:gold-text tracking-tighter mb-8">{title}</h3>
      <div className="text-on-surface-variant dark:text-slate-400 leading-relaxed space-y-4 font-medium max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {children}
      </div>
      <button
        onClick={onClose}
        className="w-full mt-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest"
      >
        Close
      </button>
    </motion.div>
  </motion.div>
);

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    // Check if we have a deep link or previous state
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('library?')) return 'library';
    if (hash.startsWith('chat')) return 'chat';
    return 'landing';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [modal, setModal] = useState<'privacy' | 'terms' | 'contact' | 'commerce' | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('quran_access_token'));
  const [donationStatus, setDonationStatus] = useState<'success' | 'cancel' | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('donation') as 'success' | 'cancel' | null;
  });

  useEffect(() => {
    statsService.trackVisit();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── ONE-SHOT OAuth Callback Processor ───────────────────────────────────────
  // Runs once on mount or hashchange. If the URL hash is '#oauth-callback', 
  // extract tokens, save them, then navigate to the intended tab.
  useEffect(() => {
    const processOAuth = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#oauth-callback')) return;

      const query = hash.split('?')[1] || '';
      const params = new URLSearchParams(query);

      const oauthError = params.get('error');
      const returnTo   = params.get('return') || 'landing';

      if (oauthError) {
        console.error('[OAuth] Login failed:', decodeURIComponent(oauthError));
        // Silently navigate back to where the user was
        const cleanHash = returnTo === 'landing' ? '' : '#' + returnTo;
        window.history.replaceState(null, '', window.location.pathname + cleanHash);
        const tabId = returnTo.split('?')[0];
        if (tabId === 'chat') setActiveTab('chat');
        else if (tabId === 'library') setActiveTab('library');
        else setActiveTab('landing');
        return;
      }

      const code = params.get('code');
      if (code) {
        // Handle the recommended PKCE exchange flow
        const state = params.get('state');
        if (!validateState(state)) {
          console.error('[OAuth] State mismatch! Possible CSRF attack.');
          window.location.hash = returnTo;
          return;
        }

        const handleExchange = async () => {
          const verifier = localStorage.getItem('oauth_verifier');
          const nonce = localStorage.getItem('oauth_nonce');
          const redirectUri = 'https://islamic-advisor.pages.dev/api/oauth/callback';

          try {
            const response = await fetch('/api/oauth/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri })
            });

            const tokens = await response.json();
            if (!response.ok) throw new Error(tokens.error || 'Exchange failed');

            if (tokens.id_token && !validateNonce(tokens.id_token, nonce)) {
              throw new Error('Nonce validation failed');
            }

            localStorage.setItem('quran_access_token', tokens.access_token);
            if (tokens.refresh_token) localStorage.setItem('quran_refresh_token', tokens.refresh_token);
            if (tokens.id_token)      localStorage.setItem('quran_id_token', tokens.id_token);
            if (tokens.api_base)      localStorage.setItem('quran_api_base', tokens.api_base);
            if (tokens.client_id)     localStorage.setItem('quran_client_id', tokens.client_id);
            setIsLoggedIn(true);

            // Cleanup
            localStorage.removeItem('oauth_verifier');
            localStorage.removeItem('oauth_state');
            localStorage.removeItem('oauth_nonce');

            // Navigate and clean URL
            const cleanHash = returnTo === 'landing' ? '' : '#' + returnTo;
            window.history.replaceState(null, '', window.location.pathname + cleanHash);
            const tabId = returnTo.split('?')[0];
            if (tabId === 'chat') setActiveTab('chat');
            else if (tabId === 'library') setActiveTab('library');
            else setActiveTab('landing');

          } catch (e: any) {
            console.error('[OAuth] Token exchange failed:', e.message);
            alert('Login failed: ' + e.message);
            window.location.hash = returnTo;
          }
        };

        handleExchange();
        return;
      }

      // Fallback for legacy simple flow or direct token injection
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const idToken      = params.get('id_token');
      const apiBase      = params.get('api_base');

      if (accessToken) {
        localStorage.setItem('quran_access_token', accessToken);
        if (refreshToken) localStorage.setItem('quran_refresh_token', refreshToken);
        if (idToken)      localStorage.setItem('quran_id_token', idToken);
        if (apiBase)      localStorage.setItem('quran_api_base', decodeURIComponent(apiBase));
        if (params.get('client_id')) localStorage.setItem('quran_client_id', params.get('client_id')!);
        setIsLoggedIn(true);
      }

      // Navigate to the intended tab and clean the URL
      const cleanHash = returnTo === 'landing' ? '' : '#' + returnTo;
      window.history.replaceState(null, '', window.location.pathname + cleanHash);
      
      const tabId = returnTo.split('?')[0];
      if (tabId === 'chat') setActiveTab('chat');
      else if (tabId === 'library') setActiveTab('library');
      else setActiveTab('landing');
    };

    processOAuth();
    window.addEventListener('hashchange', processOAuth);
    return () => window.removeEventListener('hashchange', processOAuth);
  }, []);

  // ── Unified Navigation & State Sync ─────────────────────────────────────────
  // Keeps the tab state in sync with the URL and reactively handles login/logout.
  useEffect(() => {
    const handleSync = () => {
      const token = localStorage.getItem('quran_access_token');
      setIsLoggedIn(!!token);

      const hash = window.location.hash.replace('#', '').split('?')[0];
      if (hash === 'chat') setActiveTab('chat');
      else if (hash === 'library') setActiveTab('library');
      else if (hash === '' || hash === 'landing') setActiveTab('landing');
      else if (hash === 'support') setActiveTab('support');
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'quran_access_token') {
        setIsLoggedIn(!!e.newValue);
      }
    };

    window.addEventListener('hashchange', handleSync);
    window.addEventListener('storage', handleStorage);
    
    // Initial sync
    handleSync();

    return () => {
      window.removeEventListener('hashchange', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleOpenLibrary = (tab: 'quran' | 'hadith', query: string) => {
    const url = new URL(window.location.href);
    url.hash = `library?tab=${tab}&q=${encodeURIComponent(query)}`;
    window.open(url.toString(), '_blank');
  };

  const hashParams: { tab: 'quran' | 'hadith', query: string } | null = (() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('library?')) {
        const params = new URLSearchParams(hash.replace('library?', ''));
        return { tab: params.get('tab') as 'quran' | 'hadith', query: params.get('q') || '' };
      }
    } catch { /* ignore */ }
    return null;
  })();

  if (hashParams) {
    return (
      <div className="min-h-screen flex flex-col bg-surface dark:bg-bg-dark text-on-surface dark:text-slate-100">
        <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-outline-variant/10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.close()}>
            <div className="bg-emerald-600 p-2 rounded-lg shadow-lg">
              <Compass className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-on-surface dark:gold-text font-headline">Islamic-advisor</span>
          </div>
          <span className="text-[10px] md:text-sm text-on-surface-variant dark:text-slate-500 font-bold">Knowledge Library</span>
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
    <div className="min-h-screen flex flex-col bg-surface dark:bg-bg-dark text-on-surface dark:text-slate-100 selection:bg-primary/20 transition-colors duration-300">
      {/* Dynamic Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-outline-variant/30 transition-colors duration-300">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => setActiveTab('landing')}
            >
              <div className="bg-emerald-600 p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-900/10 shrink-0">
                <Compass className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-xl md:text-2xl font-bold text-on-surface dark:text-white tracking-tighter font-headline">Islamic-Advisor</span>
            </div>
            
            <div className="flex gap-4 md:gap-6 items-center">
              {[
                { id: 'chat', label: 'Sheikh AI' },
                { id: 'library', label: 'Library' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as ActiveTab); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className={`font-black font-headline tracking-widest text-[8px] md:text-[10px] uppercase transition-all duration-300 px-3 md:px-4 py-2 rounded-xl ${
                    activeTab === item.id 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20' 
                    : 'text-on-surface-variant dark:text-slate-400 border border-transparent hover:bg-surface-container-highest dark:hover:bg-white/5 hover:text-emerald-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant dark:text-slate-400 hover:text-emerald-600 transition-colors"
              aria-label="Toggle theme"
            >
              <MaterialSymbol icon={theme === 'light' ? 'dark_mode' : 'light_mode'} />
            </button>
            <button 
              onClick={() => {
                if (isLoggedIn) {
                  if (confirm('You are connected to Quran.com. Disconnect and logout?')) {
                    const idToken = localStorage.getItem('quran_id_token');
                    
                    localStorage.removeItem('quran_access_token');
                    localStorage.removeItem('quran_refresh_token');
                    localStorage.removeItem('quran_api_base');
                    localStorage.removeItem('quran_client_id');
                    localStorage.removeItem('quran_id_token');
                    setIsLoggedIn(false);
                    
                    if (idToken) {
                      // Perform strict OIDC RP-Initiated Logout to kill the session cookie remote side
                      window.location.href = `/api/oauth/logout?id_token_hint=${encodeURIComponent(idToken)}`;
                    } else {
                      // Fallback if no ID token is present
                      setActiveTab('landing');
                      window.location.hash = '';
                    }
                  }
                } else {
                  // Capture current tab to restore context after login
                  const currentTab = window.location.hash.replace('#', '').split('?')[0] || 'landing';
                  window.location.href = `/api/oauth/login?state=${encodeURIComponent(currentTab)}`;
                }
              }}
              className={`p-2 transition-all hover:scale-110 ${isLoggedIn ? 'text-amber-500 hover:text-amber-400' : 'text-on-surface-variant dark:text-slate-400 hover:text-emerald-600'}`}
              title={isLoggedIn ? 'Account Connected — Click to Logout' : 'Sign in with Quran.com'}
            >
              {isLoggedIn ? (
                <LogOut className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <User className="w-5 h-5 md:w-6 md:h-6" />
              )}
            </button>

          </div>
        </div>
      </nav>

      <main className="pt-16 md:pt-20 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'landing' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage 
                onStart={() => { window.location.hash = 'chat'; window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                onExploreLibrary={() => { window.location.hash = 'library'; window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
              />
              <div className="pb-24">
                <RollingReviews />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="others"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              {activeTab === 'chat' ? (
                <div className="flex-1 px-4 md:px-6">
                  <header className="py-8 md:py-12 text-center lg:text-left max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 px-5 py-2.5 rounded-full mb-8 shadow-inner animate-float mx-auto lg:mx-0">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Authenticated Scholarly Logic</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-tight tracking-tighter text-on-surface dark:text-white lg:max-w-3xl">
                      Seeking <span className="gold-text">Clarity</span><br className="sm:hidden" /> in Tradition.
                    </h1>
                  </header>
                  <SheikhChat isLoggedIn={isLoggedIn} onOpenLibrary={handleOpenLibrary} />
                  

                </div>
              ) : activeTab === 'library' ? (
                <div className="px-6 flex-1">
                  <KnowledgeLibrary
                    key={(hashParams as any)?.query || 'default'}
                    initialTab={(hashParams as any)?.tab}
                    initialQuery={(hashParams as any)?.query}
                  />
                </div>
              ) : (
                <div className="px-6 flex-1">
                  <SupportUs />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 w-full border-t border-outline-variant/30 pt-12 md:pt-16 pb-12 transition-colors duration-300">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-8">
          
          <div className="max-w-4xl mx-auto mb-16">
            <div
              className="p-8 rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/40 flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer hover:border-emerald-500/40 transition-all group shadow-sm"
              onClick={() => { setActiveTab('support'); window.scrollTo(0, 0); }}
            >
              <div className="flex items-center gap-5">
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10 group-hover:bg-emerald-500/20 transition-all">
                  <Heart className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="font-black text-on-surface dark:text-white text-lg tracking-tight">Support the Mission</p>
                  <p className="text-on-surface-variant dark:text-slate-400 text-sm font-medium mt-0.5">Your support helps keep this platform free and accessible for the Ummah.</p>
                </div>
              </div>
              <button className="shrink-0 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-900/30 text-sm uppercase tracking-widest group-hover:scale-105">
                Donate →
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <span className="text-[#34D399] font-black text-2xl tracking-tighter font-headline">Islamic-Advisor</span>
              <p className="text-on-surface-variant dark:text-slate-500 font-body text-[10px] tracking-[0.2em] uppercase mt-2 font-bold">Sacred Knowledge, Digitally Preserved.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">
              {[
                { id: 'privacy', label: 'Privacy' },
                { id: 'terms', label: 'Terms' },
                { id: 'commerce', label: 'Commerce' },
                { id: 'contact', label: 'Contact' }
              ].map(link => (
                <button 
                  key={link.id} 
                  onClick={() => setModal(link.id as any)} 
                  className="hover:text-[#34D399] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <p className="text-on-surface-variant dark:text-slate-500 font-body text-[10px] tracking-widest uppercase font-bold opacity-60">
              © 2026 Built with 💚 for the Ummah.
            </p>
          </div>
        </div>
      </footer>

      {/* Footer Modals */}
      <AnimatePresence>
        {modal && (
          <Modal title={modal === 'commerce' ? "Commerce Disclosure" : modal.charAt(0).toUpperCase() + modal.slice(1)} onClose={() => setModal(null)}>
            {modal === 'privacy' && (
              <div className="space-y-4">
                <p>Islamic-advisor does not store your conversations on any server. All chat history is saved locally in your browser only and never transmitted to third parties.</p>
                <p>We use a third-party AI API to route requests. Your questions are sent to processing servers; please review their privacy policies for details.</p>
                <p>We do not use trackers or third-party cookies for advertising.</p>
              </div>
            )}
            {modal === 'terms' && (
              <div className="space-y-4">
                <section>
                  <h4 className="text-[#34D399] font-bold uppercase tracking-widest text-[10px] mb-2">Service Disclaimer</h4>
                  <p>This platform provides AI-generated Islamic guidance for educational purposes only. It is <strong className="text-on-surface dark:text-white">not a substitute</strong> for qualified human scholars.</p>
                  <p>For matters requiring an official Fatwa, always consult a qualified local scholar. Islamic-advisor and its creators bear no responsibility for actions taken based on AI advice.</p>
                </section>
                <section>
                  <h4 className="text-[#34D399] font-bold uppercase tracking-widest text-[10px] mb-2">Refunds</h4>
                  <p>As we only accept one-time donations to support infrastructure, all donations are final and non-refundable.</p>
                </section>
              </div>
            )}
            {modal === 'commerce' && (
              <div className="space-y-6 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-4">
                    <div className="border-b border-outline-variant/10 pb-2">
                      <p className="text-[#34D399] font-bold uppercase tracking-wider text-[10px]">Legal Name</p>
                      <p className="text-on-surface-variant dark:text-slate-300 font-medium">Provided upon request</p>
                    </div>
                    <div className="border-b border-outline-variant/10 pb-2">
                      <p className="text-[#34D399] font-bold uppercase tracking-wider text-[10px]">Contact Email</p>
                      <p className="text-on-surface-variant dark:text-slate-300 font-medium">lakar.team@gmail.com</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-outline-variant/10 pb-2">
                      <p className="text-[#34D399] font-bold uppercase tracking-wider text-[10px]">Returns</p>
                      <p className="text-on-surface-variant dark:text-slate-300 font-medium">Donations are non-refundable</p>
                    </div>
                    <div className="border-b border-outline-variant/10 pb-2">
                      <p className="text-[#34D399] font-bold uppercase tracking-wider text-[10px]">Price</p>
                      <p className="text-on-surface-variant dark:text-slate-300 font-medium">Variable based on donation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {modal === 'contact' && (
              <div className="space-y-6">
                <p>This project is maintained by the <strong className="text-on-surface dark:text-white">Lakar Team</strong>. Reach out for collaboration or bug reports:</p>
                <a
                  href="mailto:lakar.team@gmail.com?subject=Contact%20Islamic-advisor"
                  className="block text-center py-4 px-8 bg-[#34D399]/10 border border-[#34D399]/30 rounded-2xl text-[#34D399] font-black hover:bg-[#34D399]/20 transition-all"
                >
                  lakar.team@gmail.com
                </a>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Donation Notifications */}
      <AnimatePresence>
        {donationStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[200] w-[90%] max-w-sm"
          >
            <div className={`p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-4 ${
              donationStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-500/30' : 'bg-white dark:bg-slate-900/90 border-outline-variant/30'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${donationStatus === 'success' ? 'bg-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {donationStatus === 'success' ? <Heart className="w-6 h-6 text-emerald-500 fill-emerald-500/20" /> : <X className="w-6 h-6 text-slate-500" />}
              </div>
              <div>
                <h4 className="font-black text-on-surface dark:text-white text-lg tracking-tight">
                  {donationStatus === 'success' ? 'JazakAllahu Khayran!' : 'Donation Cancelled'}
                </h4>
                <p className="text-on-surface-variant dark:text-slate-400 text-sm font-medium mt-1">
                  {donationStatus === 'success' ? 'Your support keeps the platform accessible. May Allah reward you.' : 'No worries! You can still support us anytime.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setDonationStatus(null);
                  const url = new URL(window.location.href);
                  url.searchParams.delete('donation');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
