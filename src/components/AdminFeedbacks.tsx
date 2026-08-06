import React, { useState, useEffect } from 'react';
import { db, getDocs, collection, query, where, doc, getDoc, updateDoc, deleteDoc } from '../lib/firebase';
import { Report } from '../types';
import { 
  Star, MessageSquare, Search, Filter, Calendar, LayoutGrid, 
  ArrowLeft, ShieldAlert, Lock, Unlock, Loader2, FileDown, 
  Eye, CornerDownRight, TrendingUp, Sparkles, BookOpen, AlertCircle,
  Users, DollarSign, FileSpreadsheet, CheckCircle, RefreshCw, PenTool, ClipboardList, Shield, Check, User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SystemUser {
  id: string;
  name?: string;
  email?: string;
  crmv?: string;
  uf?: string;
  specialty?: string;
  plan?: 'free' | 'pro';
  createdAt?: any;
}

export default function AdminFeedbacks() {
  const [activeTab, setActiveTab] = useState<'kpis' | 'users' | 'feedbacks'>('kpis');
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [prescriptionsCount, setPrescriptionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro'>('all');
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);

  // Security gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('vetmind_admin_authenticated') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const adminPin = 'admin2026';

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAdminData();
  }, [isAuthenticated]);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Feedbacks (Reports with ratings)
      const reportsSnapshot = await getDocs(collection(db, 'reports'));
      const reportsList: Report[] = [];
      reportsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reportsList.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.seconds 
            ? data.createdAt.seconds * 1000 
            : (data.createdAt || Date.now())
        } as Report);
      });
      // Sort descending by date
      reportsList.sort((a, b) => b.createdAt - a.createdAt);
      setReports(reportsList);

      // 2. Fetch Users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList: SystemUser[] = [];
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.seconds 
            ? data.createdAt.seconds * 1000 
            : (data.createdAt || null)
        } as SystemUser);
      });
      setUsers(usersList);

      // 3. Fetch Prescriptions Count
      const prescriptionsSnapshot = await getDocs(collection(db, 'prescriptions'));
      setPrescriptionsCount(prescriptionsSnapshot.size);

    } catch (err: any) {
      console.error("Erro ao carregar dados do admin:", err);
      setError("Não foi possível carregar os dados consolidados do banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (pinInput.trim() === adminPin) {
      setIsAuthenticated(true);
      localStorage.setItem('vetmind_admin_authenticated', 'true');
    } else {
      setAuthError('Senha de segurança inválida. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('vetmind_admin_authenticated');
    setPinInput('');
  };

  const handleTogglePlan = async (userId: string, currentPlan?: 'free' | 'pro') => {
    setUpdatingUserId(userId);
    const newPlan = currentPlan === 'pro' ? 'free' : 'pro';
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { plan: newPlan });
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
    } catch (err) {
      console.error("Erro ao alternar plano do usuário:", err);
      alert("Não foi possível atualizar o plano do usuário. Verifique as regras.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // KPI Calculations
  const totalUsers = users.length;
  const proUsers = users.filter(u => u.plan === 'pro').length;
  const freeUsers = totalUsers - proUsers;
  const estimatedRevenue = proUsers * 99.00; // R$ 99/mês pro subscription rate
  const totalReports = reports.length;
  const feedbacksWithRating = reports.filter(r => r.rating && r.rating >= 1);
  const totalFeedbacks = feedbacksWithRating.length;
  
  const averageRating = totalFeedbacks > 0 
    ? (feedbacksWithRating.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalFeedbacks).toFixed(1)
    : '0.0';

  const commentsCount = feedbacksWithRating.filter(r => r.feedbackComment && r.feedbackComment.trim() !== '').length;

  // Specialty Breakdown
  const specialtyStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const spec = u.specialty || 'Clínica Geral';
      counts[spec] = (counts[spec] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [users]);

  // Feedbacks Distribution percentages
  const starCount = (stars: number) => {
    return feedbacksWithRating.filter(r => r.rating === stars).length;
  };

  const starPercentage = (stars: number) => {
    if (totalFeedbacks === 0) return 0;
    return Math.round((starCount(stars) / totalFeedbacks) * 100);
  };

  // Filter & Search Logic for Feedbacks
  const filteredReports = reports.filter(report => {
    if (!report.rating) return false; // only show rated reports in the feedback tab
    const matchesSearch = 
      (report.patientId && report.patientId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.feedbackComment && report.feedbackComment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.anamnesis && report.anamnesis.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStar = starFilter === 'all' || report.rating === starFilter;

    return matchesSearch && matchesStar;
  });

  // Filter & Search Logic for Users
  const filteredUsers = users.filter(user => {
    const searchString = `${user.name || ''} ${user.email || ''} ${user.crmv || ''} ${user.specialty || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(userSearchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || user.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  // Export Users to CSV
  const handleExportUsersCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = ['Nome', 'E-mail', 'CRMV', 'UF', 'Especialidade', 'Plano', 'Data Cadastro'];
    const rows = filteredUsers.map(u => [
      `"${u.name || 'Sem nome'}"`,
      `"${u.email || 'Sem email'}"`,
      `"${u.crmv || ''}"`,
      `"${u.uf || ''}"`,
      `"${u.specialty || 'Clínica Geral'}"`,
      `"${u.plan || 'free'}"`,
      u.createdAt ? `"${new Date(u.createdAt).toLocaleString('pt-BR')}"` : '"Desconhecido"'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vetmind-usuarios-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Feedbacks to CSV
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = ['Paciente', 'Canal Origem', 'Avaliação (Estrelas)', 'Comentário de Feedback', 'Data de Envio'];
    const rows = filteredReports.map(r => [
      `"${r.patientId || 'Sem nome'}"`,
      `"${r.marketingSource || 'Desconhecido'}"`,
      r.rating || 0,
      `"${(r.feedbackComment || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${new Date(r.createdAt).toLocaleString('pt-BR')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vetmind-feedbacks-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Lock Mode
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-[2.5rem] border border-slate-150 p-8 shadow-xl text-center space-y-8 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-blue-50 text-clinical-blue rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
          <Lock className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Área de Segurança Admin</h2>
          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
            Por favor, digite a senha de administrador para conferir as avaliações, métricas e usuários cadastrados na plataforma.
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-600">Senha Admin</label>
            <input 
              type="password"
              placeholder="••••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-sm p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-clinical-blue font-mono letter-spacing-lg"
              autoFocus
            />
          </div>

          {authError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl text-red-650 text-[10px] font-bold">
              <ShieldAlert className="w-4 h-4 text-red-550 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-clinical-blue text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-clinical-blue/25 hover:scale-[1.01] active:scale-95 transition-all text-center cursor-pointer"
          >
            Acessar Painel Admin
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-[11px] text-amber-600 bg-amber-50/50 p-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Dica de Teste: Use a senha <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[10px]">admin2026</code></span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Admin Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-150 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Painel de Controle Admin</h2>
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Administrador
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Visão Executiva, Usuários, Receitas e Qualidade</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={loadAdminData}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] text-slate-500 hover:bg-slate-100 uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sincronizar Banco
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl font-black text-[10px] text-red-650 hover:bg-red-100 uppercase tracking-wider transition-all cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-6 py-3.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'kpis'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Indicadores & Métricas
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          Gerenciar Usuários ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`px-6 py-3.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'feedbacks'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Star className="w-4 h-4" />
          Feedbacks & Avaliações ({totalFeedbacks})
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-600 font-bold flex items-center justify-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center space-y-4 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-clinical-blue mx-auto" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Carregando painel de administração...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: GENERAL METRICS */}
          {activeTab === 'kpis' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Bento Grid Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-150 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none">Vets Cadastrados</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{totalUsers}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                      Pro: <span className="text-indigo-600">{proUsers}</span> | Free: {freeUsers}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/5 to-white border border-slate-150 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none">Faturamento Estimado</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">
                      {estimatedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                      Base: R$ 99,00 / Pro por mês
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-150 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm shrink-0">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none">Consultas e Laudos</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{totalReports}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                      Atendimentos SOAP gerados
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-150 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm shrink-0">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none">Receituários Emitidos</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{prescriptionsCount}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                      Documentos arquivados
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Specialties breakdown */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-150 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 tracking-tight">Principais Especialidades Médicas</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Foco de atuação dos veterinários cadastrados</p>
                  </div>

                  <div className="space-y-4">
                    {specialtyStats.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum dado registrado.</p>
                    ) : (
                      specialtyStats.map((item, index) => {
                        const total = users.length || 1;
                        const pct = Math.round((item.count / total) * 100);
                        return (
                          <div key={item.name} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-700">{item.name}</span>
                              <span className="font-black text-slate-900">{item.count} vet{item.count > 1 ? 's' : ''} ({pct}%)</span>
                            </div>
                            <div className="h-2.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" 
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Performance & Feedbacks Recap */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-150 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 tracking-tight">Resumo de Qualidade de IA</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Indicador de Satisfação Geral dos laudos SOAP</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 text-center space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Média Geral</p>
                      <h4 className="text-4xl font-black text-indigo-600">{averageRating}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">de 5.0 estrelas</p>
                    </div>

                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 text-center space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Com Comentário</p>
                      <h4 className="text-4xl font-black text-slate-850">{commentsCount}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">feedbacks descritos</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Curva de Avaliação (Estrelas)</p>
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const percent = starPercentage(stars);
                        return (
                          <div key={stars} className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 w-3 text-right">{stars}★</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  stars >= 4 ? 'bg-amber-400' : stars === 3 ? 'bg-indigo-300' : 'bg-red-300'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 w-8 text-right">{percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Search and Filters */}
              <div className="bg-white border border-slate-150 rounded-[2rem] p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Pesquisar por nome, CRMV ou email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-clinical-blue font-semibold"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    <button 
                      onClick={() => setPlanFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        planFilter === 'all' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Todos Planos
                    </button>
                    <button 
                      onClick={() => setPlanFilter('free')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        planFilter === 'free' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Plano Free
                    </button>
                    <button 
                      onClick={() => setPlanFilter('pro')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        planFilter === 'pro' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Plano Pro
                    </button>
                  </div>
                </div>

                <div className="flex shrink-0 w-full sm:w-auto justify-end">
                  <button 
                    onClick={handleExportUsersCSV}
                    disabled={filteredUsers.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportar Médicos ({filteredUsers.length})
                  </button>
                </div>
              </div>

              {/* Users Grid */}
              {filteredUsers.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center shadow-sm space-y-4">
                  <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-slate-800 uppercase text-xs tracking-wider">Nenhum médico veterinário encontrado</p>
                    <p className="text-xs text-slate-400 font-semibold">Tente redefinir a busca ou remover o filtro por plano.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="bg-white border border-slate-150 rounded-[1.8rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative"
                    >
                      {/* Badge for Pro/Free Plan */}
                      <div className="absolute top-4 right-4">
                        {user.plan === 'pro' ? (
                          <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shadow-xs shadow-indigo-500/25">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                            Pro
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-450 text-[9px] font-black uppercase tracking-widest rounded-full">
                            Free
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0 shadow-3xs">
                            {user.name ? user.name.slice(0, 2).toUpperCase() : 'VM'}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-sm text-slate-800 truncate pr-12">{user.name || 'Sem nome registrado'}</h4>
                            <p className="text-[10px] font-bold text-slate-400 truncate leading-none mt-1">{user.email || 'Sem e-mail'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-left">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">CRMV</span>
                            <span className="text-[11px] font-bold text-slate-700 leading-tight">
                              {user.crmv ? `${user.crmv} - ${user.uf || 'UF'}` : 'Não cadastrado'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Especialidade</span>
                            <span className="text-[11px] font-bold text-slate-700 leading-tight truncate block">
                              {user.specialty || 'Clínica Geral'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="text-[8px] text-slate-400 font-bold uppercase block">
                          Cadastro: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}
                        </span>

                        <button 
                          onClick={() => handleTogglePlan(user.id, user.plan)}
                          disabled={updatingUserId === user.id}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                            user.plan === 'pro'
                              ? 'bg-red-50 hover:bg-red-100 text-red-650'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                          }`}
                        >
                          {updatingUserId === user.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Atualizando</span>
                            </>
                          ) : user.plan === 'pro' ? (
                            <>
                              <span>Rebaixar p/ Free</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                              <span>Promover p/ Pro</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FEEDBACKS LIST */}
          {activeTab === 'feedbacks' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Filtering and Actions Bar */}
              <div className="bg-white border border-slate-150 rounded-[2rem] p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Buscar por paciente ou comentário..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-clinical-blue font-semibold"
                    />
                  </div>

                  {/* Star Filters */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    <button 
                      onClick={() => setStarFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        starFilter === 'all' 
                        ? 'bg-clinical-blue text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Todos
                    </button>
                    {[5, 4, 3, 2, 1].map((s) => (
                      <button 
                        key={s}
                        onClick={() => setStarFilter(s)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-0.5 ${
                          starFilter === s 
                          ? 'bg-amber-500 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <span>{s}</span>
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 w-full sm:w-auto justify-end">
                  <button 
                    onClick={handleExportCSV}
                    disabled={filteredReports.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar CSV ({filteredReports.length})
                  </button>
                </div>
              </div>

              {/* Feedbacks Grid & Cards List */}
              {filteredReports.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center shadow-sm space-y-4">
                  <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-slate-800 uppercase text-xs tracking-wider">Nenhum feedback corresponde aos filtros</p>
                    <p className="text-xs text-slate-400 font-semibold">Tente redefinir a barra de pesquisa ou selecionar outra quantidade de estrelas na barra.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredReports.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white border border-slate-150 hover:border-slate-300 transition-all rounded-[1.8rem] p-6 flex flex-col justify-between shadow-sm hover:shadow-md space-y-5"
                    >
                      <div className="space-y-4">
                        {/* Header with star rating & date */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((starIdx) => (
                                <Star 
                                  key={starIdx}
                                  className={`w-4 h-4 ${
                                    starIdx <= (item.rating || 0) 
                                      ? 'text-amber-500 fill-amber-500' 
                                      : 'text-slate-150'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                              {new Date(item.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-full">
                            {item.marketingSource || 'Laudo IA'}
                          </span>
                        </div>

                        {/* Comment speech bubble */}
                        {item.feedbackComment && item.feedbackComment.trim() !== '' ? (
                          <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-4 rounded-2xl relative text-slate-700 leading-relaxed text-xs font-semibold italic">
                            "{item.feedbackComment}"
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-350 italic font-semibold">
                            Nenhum comentário escrito enviado, apenas avaliação com estrelas.
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        {/* Patient / Vet Information */}
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black uppercase text-slate-500 leading-tight">PACIENTE</p>
                          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                            {item.patientId || 'Sem nome'}
                          </p>
                        </div>

                        <button 
                          onClick={() => setSelectedReportForModal(item)}
                          className="flex items-center gap-1.5 bg-blue-50 hover:bg-clinical-blue hover:text-white text-clinical-blue px-3.5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Laudo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal / Sidebar slider to preview report contents */}
      {selectedReportForModal && (
        <div id="modal-laudo-feedback" className="fixed inset-0 bg-black/50 flex justify-end z-[100] animate-in fade-in duration-300 pointer-events-auto">
          <div 
            onClick={() => setSelectedReportForModal(null)} 
            className="absolute inset-0 cursor-pointer" 
          />
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Conteúdo do Laudo Avaliado</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Paciente: {selectedReportForModal.patientId}</p>
              </div>
              <button 
                onClick={() => setSelectedReportForModal(null)}
                className="px-3.5 py-2 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Modal Body with SOAP and examination data details */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-clinical-blue px-2.5 py-1 rounded-full">Anamnese do Médico</span>
                <div className="text-xs text-slate-700 bg-slate-50/50 border border-slate-100 p-4 rounded-xl leading-relaxed font-semibold">
                  {selectedReportForModal.anamnesis || 'Nenhum dado de anamnese preenchido.'}
                </div>
              </div>

              {selectedReportForModal.examData && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">Exames Físicos / Lab</span>
                  <div className="text-xs text-slate-700 bg-slate-50/50 border border-slate-100 p-4 rounded-xl leading-relaxed font-semibold">
                    {selectedReportForModal.examData}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">Laudo SOAP Gerado</span>
                
                <div className="text-xs text-slate-800 leading-relaxed font-normal prose prose-slate p-5 border border-slate-150 rounded-2xl bg-slate-50/30">
                  <ReactMarkdown>{selectedReportForModal.soapContent}</ReactMarkdown>
                </div>
              </div>

              {selectedReportForModal.prescription && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">Receituário Clínico</span>
                  <div className="text-xs text-slate-800 leading-relaxed font-normal p-4 border border-slate-150 rounded-xl bg-slate-50/30">
                    <ReactMarkdown>{selectedReportForModal.prescription}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
