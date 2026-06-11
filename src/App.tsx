import React, { useState, useEffect } from 'react';
import { LayoutGrid, PlusCircle, BookOpen, UserCircle, ClipboardList, Calendar as CalendarIcon, TrendingUp, Library as LibraryIcon, Menu, X, Star, Sparkles, Chrome, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReportWorkspace from './components/ReportWorkspace';
import Dashboard from './components/Dashboard';
import { Calendar } from './components/Calendar';
import { BusinessIntelligence } from './components/BusinessIntelligence';
import { auth } from './lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { Report } from './types';
import VetmindQuiz from './components/VetmindQuiz';
import VetmindLogo from './components/VetmindLogo';
import GuidelinesManager from './components/GuidelinesManager';
import AdminFeedbacks from './components/AdminFeedbacks';
import MarketingWorkspace from './components/MarketingWorkspace';
import IntegrationsSandbox from './components/IntegrationsSandbox';
import SignatureDashboard from './components/SignatureDashboard';

import Library from './components/Library';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'dashboard' | 'profile' | 'calendar' | 'bi' | 'quiz' | 'guidelines' | 'feedbacks' | 'marketing' | 'integrations' | 'signature'>('dashboard');
  const [marketingPrefill, setMarketingPrefill] = useState<{
    queixa?: string;
    exames?: string;
    tecnica?: string;
    desfecho?: string;
  } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const setupAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    setupAuth();
    return () => unsubscribe();
  }, []);

  const handleOpenReport = (report: Report) => {
    setSelectedReport(report);
    setActiveTab('workspace');
  };

  const handleNewReport = () => {
    setSelectedReport(null);
    setActiveTab('workspace');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <VetmindLogo showText={true} size="xl" />
          <div className="flex items-center gap-2 mt-4">
            <span className="w-2.5 h-2.5 rounded-full bg-clinical-blue animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-clinical-blue animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-clinical-blue animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-10 px-2">
            <VetmindLogo showText={true} size={42} />
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutGrid, label: 'Painel Central' },
              { id: 'integrations', icon: Chrome, label: 'Copiloto de Prontuários' },
              { id: 'signature', icon: PenTool, label: 'Termos & Assinatura' },
              { id: 'guidelines', icon: LibraryIcon, label: 'Banco de Diretrizes' },
              { id: 'marketing', icon: Sparkles, label: 'Estúdio de Marketing' },
              { id: 'calendar', icon: CalendarIcon, label: 'Agenda Médica' },
              { id: 'bi', icon: TrendingUp, label: 'Inteligência (BI)' },
              { id: 'profile', icon: UserCircle, label: 'Meu Perfil' },
              { id: 'feedbacks', icon: Star, label: 'Feedbacks Admin' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {setActiveTab(item.id as any); setSelectedReport(null);}}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                  activeTab === item.id 
                  ? 'bg-blue-50 text-clinical-blue shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 space-y-4">
          <button 
            onClick={handleNewReport}
            className="w-full bg-clinical-blue text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-clinical-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Novo Laudo
          </button>
          
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full overflow-hidden border border-white bg-slate-200">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Vet" alt="User" />
             </div>
             <div className="overflow-hidden">
               <p className="text-[10px] font-black text-slate-900 truncate">VETERINÁRIO</p>
               <p className="text-[9px] text-slate-400 truncate">{user?.email}</p>
             </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Header - Mobile Only */}
        <header className="lg:hidden h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              id="btn-mobile-sidebar-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all text-slate-800"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <VetmindLogo showText={true} size={36} />
          </div>
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Vet" alt="Doc" />
          </div>
        </header>

        {/* Mobile Flyout Sidebar Drawer Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                id="mobile-sidebar-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/50 z-50 pointer-events-auto"
              />
              {/* Swipe Panel */}
              <motion.aside 
                id="mobile-sidebar-aside"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col h-full pointer-events-auto"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <VetmindLogo showText={true} size={36} />
                  <button 
                    id="btn-mobile-sidebar-close"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                    aria-label="Fechar menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 flex-grow overflow-y-auto space-y-1.5">
                  {[
                    { id: 'dashboard', icon: LayoutGrid, label: 'Painel Central' },
                    { id: 'integrations', icon: Chrome, label: 'Copiloto de Prontuários' },
                    { id: 'signature', icon: PenTool, label: 'Termos & Assinatura' },
                    { id: 'guidelines', icon: LibraryIcon, label: 'Banco de Diretrizes' },
                    { id: 'marketing', icon: Sparkles, label: 'Estúdio de Marketing' },
                    { id: 'calendar', icon: CalendarIcon, label: 'Agenda Médica' },
                    { id: 'bi', icon: TrendingUp, label: 'Inteligência (BI)' },
                    { id: 'profile', icon: UserCircle, label: 'Meu Perfil' },
                    { id: 'feedbacks', icon: Star, label: 'Feedbacks Admin' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      id={`btn-mobile-nav-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id as any); 
                        setSelectedReport(null);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all text-left ${
                        activeTab === item.id 
                        ? 'bg-blue-50 text-clinical-blue shadow-sm' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-6 border-t border-slate-100 space-y-4">
                  <button 
                    id="btn-mobile-sidebar-new-laudo"
                    onClick={() => {
                      handleNewReport();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-[#0047AB] text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-400/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Novo Laudo
                  </button>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-white">
                       <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Vet" alt="User" />
                     </div>
                     <div className="overflow-hidden">
                       <p className="text-[10px] font-black text-slate-850 truncate">VETERINÁRIO</p>
                       <p className="text-[9px] text-slate-400 truncate">{user?.email}</p>
                     </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto pb-40 lg:pb-12 custom-scrollbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-16">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <Dashboard onSelectReport={handleOpenReport} onNewReport={handleNewReport} />
                  </motion.div>
                )}
                {activeTab === 'workspace' && (
                  <motion.div 
                    key="workspace"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <ReportWorkspace 
                      initialReport={selectedReport} 
                      onBack={() => setActiveTab('dashboard')} 
                      onTransformToSocial={(socialData) => {
                        setMarketingPrefill(socialData);
                        setActiveTab('marketing');
                      }}
                      onNavigateToSignature={() => setActiveTab('signature')}
                    />
                  </motion.div>
                )}
                {activeTab === 'profile' && (
                  <motion.div 
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-4xl mx-auto"
                  >
                    <div className="space-y-12">
                      <div className="flex items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-clinical-blue border border-blue-100 shadow-inner">
                          <UserCircle className="w-12 h-12" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 leading-tight">Médico Veterinário</h2>
                          <p className="text-sm text-slate-500 font-medium tracking-wide">{user?.email || 'Usuário Online'}</p>
                          <div className="flex gap-2 mt-3">
                             <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">CRM-V Ativo</span>
                             <span className="px-3 py-1 bg-blue-50 text-clinical-blue text-[10px] font-black uppercase tracking-widest rounded-full">Plano Premium</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                             <BookOpen className="w-5 h-5 text-clinical-blue" />
                             <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Meus Arquivos e Laudos</h3>
                          </div>
                        </div>
                        <Library onSelectReport={handleOpenReport} />
                      </div>

                      <button 
                        onClick={() => auth.signOut()}
                        className="w-full py-5 bg-red-50 text-red-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 shadow-sm hover:shadow-md"
                      >
                        Encerrar Sessão com Segurança
                      </button>
                    </div>
                  </motion.div>
                )}
                {activeTab === 'calendar' && (
                  <motion.div 
                    key="calendar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Calendar />
                  </motion.div>
                )}
                {activeTab === 'bi' && (
                  <motion.div 
                    key="bi"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <BusinessIntelligence />
                  </motion.div>
                )}
                {activeTab === 'quiz' && (
                  <motion.div 
                    key="quiz"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <VetmindQuiz />
                  </motion.div>
                )}
                {activeTab === 'guidelines' && (
                  <motion.div 
                    key="guidelines"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <GuidelinesManager />
                  </motion.div>
                )}
                {activeTab === 'feedbacks' && (
                  <motion.div 
                    key="feedbacks"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <AdminFeedbacks />
                  </motion.div>
                )}
                {activeTab === 'marketing' && (
                  <motion.div 
                    key="marketing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <MarketingWorkspace 
                      initialClinicalData={marketingPrefill}
                      onBack={() => {
                        setActiveTab('dashboard');
                        setMarketingPrefill(null);
                      }} 
                    />
                  </motion.div>
                )}
                {activeTab === 'integrations' && (
                  <motion.div 
                    key="integrations"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <IntegrationsSandbox />
                  </motion.div>
                )}
                {activeTab === 'signature' && (
                  <motion.div 
                    key="signature"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <SignatureDashboard />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="fixed lg:hidden bottom-0 left-0 w-full bg-white border-t border-slate-100 flex items-center justify-between px-2 z-40 h-24 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
          <button 
            onClick={() => {setActiveTab('dashboard'); setSelectedReport(null);}}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'dashboard' ? 'text-clinical-blue' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50' : ''}`}>
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Início</span>
          </button>

          <button 
            onClick={() => {setActiveTab('calendar'); setSelectedReport(null);}}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'calendar' ? 'text-clinical-blue' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === 'calendar' ? 'bg-blue-50' : ''}`}>
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Agenda</span>
          </button>

          <div className="relative -top-6 flex-1 flex flex-col items-center">
            <button 
              onClick={handleNewReport}
              className={`flex flex-col items-center gap-1 justify-center w-16 h-16 rounded-[1.5rem] transition-all shadow-2xl active:scale-95 ${
                activeTab === 'workspace' && !selectedReport
                ? 'bg-[#0047AB] text-white scale-110 shadow-blue-400/40' 
                : 'bg-white text-clinical-blue border-2 border-slate-50'
              }`}
            >
              <PlusCircle className="w-7 h-7" />
            </button>
            <span className={`block text-center mt-2 text-[9px] font-black uppercase tracking-tight transition-colors ${activeTab === 'workspace' ? 'text-clinical-blue' : 'text-slate-300'}`}>
              Laudo
            </span>
          </div>

          <button 
            onClick={() => {setActiveTab('quiz'); setSelectedReport(null);}}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'quiz' ? 'text-clinical-blue' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === 'quiz' ? 'bg-blue-50' : ''}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Captura</span>
          </button>

          <button 
            onClick={() => {setActiveTab('profile'); setSelectedReport(null);}}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'profile' ? 'text-clinical-blue' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-blue-50' : ''}`}>
              <UserCircle className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Perfil</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

