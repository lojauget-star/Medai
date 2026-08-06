import React, { useState, useEffect } from 'react';
import { LayoutGrid, PlusCircle, BookOpen, UserCircle, ClipboardList, Calendar as CalendarIcon, TrendingUp, Library as LibraryIcon, Menu, X, Star, Sparkles, Chrome, PenTool, Pin, LogOut, Lock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PremiumGateOverlay from './components/PremiumGateOverlay';
import UpgradePlanModal from './components/UpgradePlanModal';
import ReportWorkspace from './components/ReportWorkspace';
import PrescriptionWorkspace from './components/PrescriptionWorkspace';
import Dashboard from './components/Dashboard';
import { Calendar } from './components/Calendar';
import { BusinessIntelligence } from './components/BusinessIntelligence';
import { auth, db, signInAnonymously, onAuthStateChanged, signOut, doc, getDoc, setDoc } from './lib/firebase';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Report, Patient } from './types';
import VetmindQuiz from './components/VetmindQuiz';
import VetmindLogo from './components/VetmindLogo';
import GuidelinesManager from './components/GuidelinesManager';
import AdminFeedbacks from './components/AdminFeedbacks';
import MarketingWorkspace from './components/MarketingWorkspace';
import IntegrationsSandbox from './components/IntegrationsSandbox';
import SignatureDashboard from './components/SignatureDashboard';
import Login from './components/Login';

import Library from './components/Library';

const menuGroups = [
  {
    title: "Atendimento Clínico",
    items: [
      { id: 'dashboard', icon: LayoutGrid, label: 'Painel Central' },
      { id: 'workspace', icon: Chrome, label: 'Copiloto & Chat' },
      { id: 'prescriptions', icon: ClipboardList, label: 'Receituário Rápido' },
      { id: 'signature', icon: PenTool, label: 'Termos & Assinatura' },
    ]
  },
  {
    title: "Conhecimento & IA",
    items: [
      { id: 'guidelines', icon: LibraryIcon, label: 'Diretrizes & Consensos' },
      { id: 'quiz', icon: BookOpen, label: 'Desafios Clínicos (Quiz)' },
    ]
  },
  {
    title: "Gestão & Crescimento",
    items: [
      { id: 'marketing', icon: Sparkles, label: 'Estúdio de Marketing' },
      { id: 'calendar', icon: CalendarIcon, label: 'Agenda Médica' },
      { id: 'bi', icon: TrendingUp, label: 'Inteligência e BI' },
    ]
  },
  {
    title: "Configurações & Painel",
    items: [
      { id: 'profile', icon: UserCircle, label: 'Meu Perfil' },
      { id: 'feedbacks', icon: Shield, label: 'Painel Admin (Métricas)' }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'prescriptions' | 'dashboard' | 'profile' | 'calendar' | 'bi' | 'quiz' | 'guidelines' | 'feedbacks' | 'marketing' | 'integrations' | 'signature'>('workspace');
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('vetmind_sidebar_pinned');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);

  const toggleSidebarPin = () => {
    const newVal = !isSidebarPinned;
    setIsSidebarPinned(newVal);
    localStorage.setItem('vetmind_sidebar_pinned', JSON.stringify(newVal));
  };
  const [marketingPrefill, setMarketingPrefill] = useState<{
    queixa?: string;
    exames?: string;
    tecnica?: string;
    desfecho?: string;
  } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [preselectedPatient, setPreselectedPatient] = useState<Partial<Patient> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User Profile States
  const [profileName, setProfileName] = useState(() => localStorage.getItem("vetmind_signature_name") || "Dr. Roberto Silva");
  const [profileCrmv, setProfileCrmv] = useState(() => localStorage.getItem("vetmind_signature_crmv") || "SP-14892");
  const [profileSpecialty, setProfileSpecialty] = useState(() => localStorage.getItem("vetmind_signature_specialty") || "Clínica Geral de Pequenos Animais");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // User Plan / Upgrade States
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        try {
          const docRef = doc(db, "users", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) {
              setProfileName(data.name);
              localStorage.setItem("vetmind_signature_name", data.name);
            }
            if (data.crmv) {
              setProfileCrmv(data.crmv);
              localStorage.setItem("vetmind_signature_crmv", data.crmv);
            }
            if (data.specialty) {
              setProfileSpecialty(data.specialty);
              localStorage.setItem("vetmind_signature_specialty", data.specialty);
            }
            if (data.plan) {
              setUserPlan(data.plan);
            } else {
              setUserPlan('free');
            }
          } else {
            setUserPlan('free');
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredMenuGroups = React.useMemo(() => {
    return menuGroups.map(group => {
      if (group.title === "Configurações & Painel") {
        return {
          ...group,
          items: group.items.filter(item => {
            if (item.id === 'feedbacks') {
              return user?.email === 'lojauget@gmail.com';
            }
            return true;
          })
        };
      }
      return group;
    });
  }, [user]);

  const handleOpenReport = (report: Report) => {
    setSelectedReport(report);
    setActiveTab('workspace');
  };

  const handleNewReport = () => {
    setSelectedReport(null);
    setPreselectedPatient(null);
    setActiveTab('workspace');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileCrmv.trim()) {
      alert("Por favor, preencha o Nome e o CRMV.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const uppercaseCrmv = profileCrmv.toUpperCase();
      localStorage.setItem("vetmind_signature_name", profileName);
      localStorage.setItem("vetmind_signature_crmv", uppercaseCrmv);
      localStorage.setItem("vetmind_signature_specialty", profileSpecialty);
      localStorage.setItem("vetmind_signature_signed", "true");

      if (user) {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, {
          name: profileName,
          crmv: uppercaseCrmv,
          specialty: profileSpecialty,
          isSigned: true,
          email: user.email || ""
        }, { merge: true });
      }
      alert("Seus dados cadastrais foram atualizados e salvos com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user?.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <VetmindLogo showText={true} size="xl" />
          <div className="flex items-center gap-2 mt-4">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="h-[100dvh] flex bg-[#f4f6fa] font-sans text-slate-900 overflow-hidden">
      {/* Invisible Hover Zone (fixed on left boundary when unpinned) */}
      {!isSidebarPinned && (
        <div 
          className="hidden xl:block fixed left-0 top-0 h-full w-8 bg-transparent z-40"
          onMouseEnter={() => setIsSidebarHovered(true)}
        />
      )}

      {/* Floating Menu Icon / Button (elegant and high z-index trigger when collapsed) */}
      {!isSidebarPinned && !isSidebarHovered && (
        <button 
          type="button"
          className="hidden xl:flex fixed left-6 top-6 bg-white border border-slate-100 p-2.5 rounded-xl items-center justify-center cursor-pointer transition-all duration-200 shadow-md z-40 text-slate-500 hover:text-indigo-650 hover:scale-105 active:scale-95 group"
          onMouseEnter={() => setIsSidebarHovered(true)}
          onClick={() => setIsSidebarHovered(true)}
          title="Abrir Menu Lateral"
        >
          <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 text-slate-600" />
        </button>
      )}

      {/* Spacer to push content (width transition matches sidebar animation exactly) */}
      <div 
        style={{ 
          width: isSidebarPinned ? 256 : 0, 
        }}
        className="hidden xl:block h-full bg-transparent shrink-0 transition-[width] duration-300 ease-in-out"
      />

      {/* Real Sidebar Element */}
      <motion.aside 
        className="hidden xl:flex flex-col bg-white border-r border-slate-100 h-screen w-64 shadow-sm fixed left-0 top-0 z-50 overflow-hidden"
        onMouseEnter={() => {
          if (!isSidebarPinned) setIsSidebarHovered(true);
        }}
        onMouseLeave={() => {
          if (!isSidebarPinned) setIsSidebarHovered(false);
        }}
        animate={{
          x: (isSidebarPinned || isSidebarHovered) ? 0 : -256
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      >
        {/* Header container */}
        <div className="p-6 pb-2 border-b border-slate-50 shrink-0">
          <div className="flex items-center justify-between gap-3 px-1 my-3">
            <VetmindLogo showText={true} size={40} />
                 {/* Collapse / Pin Toggle Button */}
            <button
              onClick={toggleSidebarPin}
              className={`p-1.5 rounded-xl transition-all duration-200 border cursor-pointer hidden xl:block ${
                isSidebarPinned 
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/50' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={isSidebarPinned ? "Ocultar Menu (Auto-recolher)" : "Fixar Menu"}
            >
              <Pin className={`w-4 h-4 transition-transform duration-300 ${
                isSidebarPinned ? "rotate-45 text-indigo-600" : "-rotate-45 text-slate-400"
              }`} />
            </button>
          </div>
        </div>

        {/* Scrollable navigation area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {filteredMenuGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] block px-3">
                {group.title}
              </span>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any); 
                        setSelectedReport(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-[12.5px] transition-all duration-200 relative group border cursor-pointer ${
                        isActive 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                        : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-850'
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                        isActive 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
                      }`}>
                        <item.icon className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="tracking-tight text-left flex-1 font-extrabold">{item.label}</span>
                      
                      {isActive && (
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
        
        {/* Footer actions area */}
        <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-slate-50/50">
          <button 
            onClick={handleNewReport}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-xl font-extrabold px-8 shadow-md shadow-indigo-600/10 hover:scale-[1.01] duration-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Chat / Copiloto
          </button>
          
          <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
             <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200/55 bg-slate-100 shrink-0">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Vet" alt="User" />
               </div>
               <div className="overflow-hidden">
                 <p className="text-[10px] font-black text-slate-800 truncate uppercase">VETERINÁRIO</p>
                 <p className="text-[9px] text-slate-400 truncate">{user?.email || "Convidado (Demo)"}</p>
               </div>
             </div>
             <button
               onClick={() => {
                 if (confirm("Deseja realmente sair da sua conta?")) {
                   signOut(auth);
                 }
               }}
               className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
               title="Sair"
             >
               <LogOut className="w-4 h-4 shrink-0" />
             </button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 relative h-full">

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
                className="xl:hidden fixed inset-0 bg-black/40 z-50 pointer-events-auto backdrop-blur-xs"
              />
              {/* Swipe Panel */}
              <motion.aside 
                id="mobile-sidebar-aside"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="xl:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col h-full pointer-events-auto border-r border-slate-100"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <VetmindLogo showText={true} size={36} />
                  <button 
                    id="btn-mobile-sidebar-close"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                    aria-label="Fechar menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 flex-grow overflow-y-auto space-y-6">
                  {filteredMenuGroups.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] block px-3">
                        {group.title}
                      </span>
                      <div className="space-y-1 block">
                        {group.items.map((item) => {
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              id={`btn-mobile-nav-${item.id}`}
                              onClick={() => {
                                setActiveTab(item.id as any); 
                                setSelectedReport(null);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-[12.5px] transition-all duration-200 relative group border text-left cursor-pointer ${
                                isActive 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                                isActive 
                                ? 'bg-indigo-100 text-indigo-600' 
                                : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
                              }`}>
                                <item.icon className="w-4 h-4 shrink-0" />
                              </div>
                              <span className="tracking-tight text-left flex-1 font-extrabold">{item.label}</span>
                              
                              {isActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-slate-100 space-y-4">
                  <button 
                    id="btn-mobile-sidebar-new-laudo"
                    onClick={() => {
                      handleNewReport();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-xl font-extrabold px-8 shadow-md shadow-indigo-600/10 hover:scale-[1.01] duration-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Nova Consulta
                  </button>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200/50">
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Vet" alt="User" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-slate-800 truncate">VETERINÁRIO</p>
                          <p className="text-[9px] text-slate-400 truncate">{user?.email || "Convidado (Demo)"}</p>
                        </div>
                     </div>
                     <button
                       onClick={() => {
                         if (confirm("Deseja realmente sair da sua conta?")) {
                           signOut(auth);
                           setIsMobileMenuOpen(false);
                         }
                       }}
                       className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                       title="Sair"
                     >
                       <LogOut className="w-4 h-4 shrink-0" />
                     </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === 'workspace' ? (
            <div className="flex-1 h-full w-full overflow-hidden flex flex-col p-0 xl:p-4 pb-0 xl:pb-4">
              <AnimatePresence mode="wait">
                <motion.div 
                  key="workspace"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 h-full w-full overflow-hidden flex flex-col"
                >
                  <ReportWorkspace 
                    initialReport={selectedReport} 
                    initialPatient={preselectedPatient}
                    onBack={() => setActiveTab('dashboard')} 
                    onTransformToSocial={(socialData) => {
                      setMarketingPrefill(socialData);
                      setActiveTab('marketing');
                    }}
                    onNavigateToSignature={() => setActiveTab('signature')}
                    onToggleMenu={() => setIsMobileMenuOpen(true)}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          ) : activeTab === 'prescriptions' ? (
            <div className="flex-1 h-full w-full overflow-hidden flex flex-col p-0 xl:p-4 pb-0 xl:pb-4">
              <AnimatePresence mode="wait">
                <motion.div 
                  key="prescriptions"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 h-full w-full overflow-hidden flex flex-col"
                >
                  <PrescriptionWorkspace 
                    onNavigateToSignature={() => setActiveTab('signature')}
                    onToggleMenu={() => setIsMobileMenuOpen(true)}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
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
                      <Dashboard 
                        onSelectReport={handleOpenReport} 
                        onNewReport={handleNewReport} 
                        onNavigateTab={(tab: any) => {
                          setActiveTab(tab);
                          setSelectedReport(null);
                        }}
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
                        {/* Profile Header Card */}
                        <div className="flex items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                            <UserCircle className="w-12 h-12" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                              {profileName || 'Médico Veterinário'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium tracking-wide">
                              {profileSpecialty || (user?.email || 'Veterinário Parceiro')}
                            </p>
                            <div className="flex gap-2 mt-3">
                               <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                 CRMV {profileCrmv || 'Ativo'}
                               </span>
                                {userPlan === 'pro' ? (
                                  <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100/30 flex items-center gap-1 animate-in fade-in">
                                    <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                                    Plano Pro Ativo
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setIsUpgradeModalOpen(true)}
                                    className="px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    Upgrade para Pro
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Upgrading Plan card if 'free' */}
                        {userPlan === 'free' && (
                          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-600/10 animate-in fade-in">
                            <div className="space-y-2 text-center md:text-left">
                              <h3 className="text-xl font-black uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
                                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse shrink-0" />
                                Liberar Plano VetMind Pro!
                              </h3>
                              <p className="text-xs text-indigo-100 max-w-md leading-relaxed">
                                Tenha acesso irrestrito ao Inteligência de Negócios (BI) e ao Estúdio de Marketing para engajar tutores, além de IA sem limitações.
                              </p>
                            </div>
                            <button
                              onClick={() => setIsUpgradeModalOpen(true)}
                              className="px-8 py-3.5 bg-white text-indigo-700 font-black text-xs uppercase tracking-widest rounded-full shadow-md hover:scale-[1.03] active:scale-98 transition-all shrink-0 cursor-pointer"
                            >
                              Fazer Upgrade Agora
                            </button>
                          </div>
                        )}

                        {/* Profile Registration / Edit Form */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <UserCircle className="w-6 h-6 text-indigo-600" />
                            <h3 className="font-extrabold text-slate-800 text-lg font-sans">Dados Cadastrais do Usuário</h3>
                          </div>
                          
                          <form onSubmit={handleSaveProfile} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Nome Completo</label>
                                <input
                                  type="text"
                                  value={profileName}
                                  onChange={(e) => setProfileName(e.target.value)}
                                  placeholder="Ex: Dr. Roberto Silva"
                                  className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:border-indigo-600 transition-colors"
                                  required
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">CRMV Ativo</label>
                                <input
                                  type="text"
                                  value={profileCrmv}
                                  onChange={(e) => setProfileCrmv(e.target.value)}
                                  placeholder="Ex: SP-14892"
                                  className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:border-indigo-600 transition-colors"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Especialidades ou Campo de Atuação</label>
                              <input
                                type="text"
                                value={profileSpecialty}
                                onChange={(e) => setProfileSpecialty(e.target.value)}
                                placeholder="Ex: Clínica Geral de Pequenos Animais, Dermatologia"
                                className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:border-indigo-600 transition-colors"
                              />
                            </div>

                            <div className="pt-2">
                              <button
                                type="submit"
                                disabled={isSavingProfile}
                                className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-full transition-all active:scale-98 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                              >
                                {isSavingProfile ? "Salvando dados..." : "Salvar Cadastro de Usuário"}
                              </button>
                            </div>
                          </form>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                               <BookOpen className="w-5 h-5 text-indigo-600" />
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
                      <Calendar 
                        onStartConsultation={(patInfo) => {
                          setPreselectedPatient(patInfo);
                          setSelectedReport(null);
                          setActiveTab('workspace');
                        }}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'bi' && (
                    <motion.div 
                      key="bi"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {userPlan === 'pro' ? (
                        <BusinessIntelligence />
                      ) : (
                        <PremiumGateOverlay 
                          featureName="Inteligência de Negócios e BI"
                          description="Acesse relatórios completos de faturamento, canais de captação de clientes, procedimentos mais lucrativos e análises financeiras avançadas para o seu consultório ou clínica."
                          onUpgrade={() => setIsUpgradeModalOpen(true)}
                        />
                      )}
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
                      {user?.email === 'lojauget@gmail.com' ? (
                        <AdminFeedbacks />
                      ) : (
                        <div className="max-w-md mx-auto my-12 bg-white rounded-[2.5rem] border border-slate-150 p-8 shadow-xl text-center space-y-6">
                          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-red-100">
                            <Lock className="w-8 h-8" />
                          </div>
                          <div className="space-y-2">
                            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Acesso Negado</h2>
                            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                              Este painel de avaliações e relatórios administrativos é de uso exclusivo da conta administradora principal da plataforma.
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('dashboard')}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all cursor-pointer"
                          >
                            Voltar ao Painel Central
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                  {activeTab === 'marketing' && (
                    <motion.div 
                      key="marketing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {userPlan === 'pro' ? (
                        <MarketingWorkspace 
                          initialClinicalData={marketingPrefill}
                          onBack={() => {
                            setActiveTab('dashboard');
                            setMarketingPrefill(null);
                          }} 
                        />
                      ) : (
                        <PremiumGateOverlay 
                          featureName="Estúdio de Marketing & IA"
                          description="Gere posts para redes sociais, carrosséis para Instagram estruturados para engajar tutores, textos para LinkedIn e cartas para parceiros veterinários a partir dos seus laudos clínicos."
                          onUpgrade={() => setIsUpgradeModalOpen(true)}
                        />
                      )}
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
          )}
        </main>

        {/* Bottom Navigation - Mobile Only (Hidden in Workspace for maximal screen size) */}
        {activeTab !== 'workspace' && activeTab !== 'prescriptions' && (
          <div className="fixed xl:hidden bottom-4 left-0 w-full flex justify-center gap-2 px-4 z-40 pointer-events-none">
            <nav className="bg-white/85 backdrop-blur-xl border border-slate-200/40 flex items-center justify-between p-1 rounded-full w-full max-w-[260px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] pointer-events-auto">
              <button 
                onClick={() => {setActiveTab('dashboard'); setSelectedReport(null);}}
                className={`flex items-center justify-center w-[33%] py-2.5 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50/80 text-indigo-600 shadow-3xs font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}
                title="Início"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              <button 
                onClick={() => {setActiveTab('calendar'); setSelectedReport(null);}}
                className={`flex items-center justify-center w-[33%] py-2.5 rounded-full transition-all ${activeTab === 'calendar' ? 'bg-indigo-50/80 text-indigo-600 shadow-3xs font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}
                title="Agenda"
              >
                <CalendarIcon className="w-5 h-5" />
              </button>

              <button 
                onClick={() => {setActiveTab('profile'); setSelectedReport(null);}}
                className={`flex items-center justify-center w-[33%] py-2.5 rounded-full transition-all ${activeTab === 'profile' ? 'bg-indigo-50/80 text-indigo-600 shadow-3xs font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}
                title="Perfil"
              >
                <UserCircle className="w-5 h-5" />
              </button>
            </nav>
            
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-11 h-11 rounded-full bg-white/85 backdrop-blur-xl border border-slate-200/40 flex items-center justify-center pointer-events-auto text-slate-500 hover:text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.06)] shrink-0 transition-all active:scale-95"
              title="Mais Opções"
            >
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}
      </div>

      <UpgradePlanModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgradeSuccess={(newPlan) => setUserPlan(newPlan)}
      />
    </div>
  );
}

