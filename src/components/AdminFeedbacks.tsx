import React, { useState, useEffect } from 'react';
import { 
  getDocs, collection, query, where, doc, getDoc, deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Report } from '../types';
import { 
  Star, MessageSquare, Search, Filter, Calendar, LayoutGrid, 
  ArrowLeft, ShieldAlert, Lock, Unlock, Loader2, FileDown, 
  Eye, CornerDownRight, TrendingUp, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AdminFeedbacks() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
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
    fetchFeedbacks();
  }, [isAuthenticated]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Avoid index error by fetching all reports >= 1 rating
      const q = query(
        collection(db, 'reports'),
        where('rating', '>=', 1)
      );
      const snapshot = await getDocs(q);
      const list: Report[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
          // Normalize timestamps (handling both Firestore serverTimestamp and mills)
          createdAt: data.createdAt?.seconds 
            ? data.createdAt.seconds * 1000 
            : (data.createdAt || Date.now())
        } as Report);
      });

      // Sort client-side descending by date
      list.sort((a, b) => b.createdAt - a.createdAt);
      setReports(list);
    } catch (err: any) {
      console.error("Erro ao buscar feedbacks:", err);
      setError("Não foi possível carregar os feedbacks do banco de dados.");
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

  // Stats calculation
  const totalReviews = reports.length;
  const averageRating = totalReviews > 0 
    ? (reports.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalReviews).toFixed(1)
    : '0.0';

  const commentsCount = reports.filter(r => r.feedbackComment && r.feedbackComment.trim() !== '').length;

  const starCount = (stars: number) => {
    return reports.filter(r => r.rating === stars).length;
  };

  const starPercentage = (stars: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((starCount(stars) / totalReviews) * 100);
  };

  // Filter & Search Logic
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      (report.patientId && report.patientId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.feedbackComment && report.feedbackComment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.anamnesis && report.anamnesis.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStar = starFilter === 'all' || report.rating === starFilter;

    return matchesSearch && matchesStar;
  });

  // Export to CSV Function
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
            Por favor, digite a senha de administrador para conferir as avaliações e comentários de feedback da plataforma.
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
            className="w-full bg-clinical-blue text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-clinical-blue/25 hover:scale-[1.01] active:scale-95 transition-all text-center"
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
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center font-bold text-xl">
            ★
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Painel de Feedback</h2>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded">Conectado</span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Avaliações Google Review & Qualidade Clientes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={fetchFeedbacks}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] text-slate-500 hover:bg-slate-100 uppercase tracking-wider transition-all"
          >
            Atualizar
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl font-black text-[10px] text-red-600 hover:bg-red-100 uppercase tracking-wider transition-all"
          >
            Bloquear Sessão
          </button>
        </div>
      </div>

      {setError && error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-600 font-bold flex items-center justify-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center space-y-4 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-clinical-blue mx-auto" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Buscando avaliações no Firestore...</p>
        </div>
      ) : (
        <>
          {/* Metrics Layout grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white to-blue-50/20 border border-slate-150 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-clinical-blue/10 flex items-center justify-center text-clinical-blue">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Respostas</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{totalReviews}</h3>
                <p className="text-[9px] text-slate-400 font-semibold mt-1">
                  {commentsCount} com comentários escritos
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-amber-50/20 border border-slate-150 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Média Geral</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{averageRating}</span>
                  <span className="text-xs text-amber-500 font-black">/ 5.0</span>
                </div>
                <div className="flex gap-0.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className={`w-3.5 h-3.5 ${s <= Math.round(Number(averageRating)) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Distribution chart card */}
            <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Curva de Satisfação</p>
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
              {filteredReports.map((item) => {
                const colors = 
                  (item.rating || 0) >= 4 
                    ? { bg: 'bg-emerald-500/10', text: 'text-emerald-600', fill: 'fill-emerald-500 text-emerald-500', commentBg: 'bg-emerald-50/10 border-emerald-100/30' }
                    : (item.rating || 0) === 3 
                    ? { bg: 'bg-indigo-500/10', text: 'text-indigo-600', fill: 'fill-indigo-500 text-indigo-500', commentBg: 'bg-indigo-50/10 border-indigo-100/30' }
                    : { bg: 'bg-red-500/10', text: 'text-red-650', fill: 'fill-red-500 text-red-500', commentBg: 'bg-red-50/10 border-red-100/30' };

                return (
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
                        <p className="text-[10px] font-black uppercase text-slate-500 leading-tight">MÉDICO DO PACIENTE</p>
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
                );
              })}
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
