import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Filter, PlusCircle, Activity, Star, ArrowRight, Sparkles, Calendar, Dog } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Report } from '../types';

export default function Dashboard({ 
  onSelectReport, 
  onNewReport 
}: { 
  onSelectReport: (report: Report) => void,
  onNewReport: () => void
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, finalized: 0 });

  useEffect(() => {
    const fetchReports = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'reports'),
          where('ownerId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q).catch(err => {
          handleFirestoreError(err, OperationType.LIST, 'reports');
          return null as any; 
        });
        
        if (!snapshot) return;
        
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        setReports(data);
        
        const finalized = data.filter(r => r.status === 'finalized').length;
        setStats({ total: data.length, finalized });
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => 
    r.patientId.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalized':
        return <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Aprovado</span>;
      case 'draft':
        return <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Rascunho</span>;
      default:
        return <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Gerado</span>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '---';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return `Hoje, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    if (days === 1) return `Ontem, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Top Header & CTA Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-clinical-blue rounded-full">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Painel Clínico Operacional</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tighter">Portal Dr. Silva</h2>
          <p className="text-lg text-slate-500 font-medium max-w-xl">
            Sintetizando atendimentos e gerando inteligência com IA para sua clínica em tempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onNewReport}
            className="flex items-center justify-center gap-3 bg-clinical-blue text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-clinical-blue/30 hover:scale-[1.03] active:scale-95 transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            Novo Laudo Assistido
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Total Processado', val: stats.total, color: 'text-clinical-blue', bg: 'bg-blue-50/50' },
           { label: 'Casos Aprovados', val: stats.finalized, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
           { label: 'Indicações/Mês', val: '24%', color: 'text-amber-600', bg: 'bg-amber-50/50' },
           { label: 'Satisfação', val: '4.9', color: 'text-indigo-600', bg: 'bg-indigo-50/50' }
         ].map((stat, idx) => (
           <div key={idx} className={`p-8 rounded-[2rem] border border-slate-100 ${stat.bg} shadow-sm group hover:shadow-md transition-all`}>
              <p className={`text-4xl font-black ${stat.color} mb-1`}>{stat.val}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
           </div>
         ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Recent Records Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-xl text-slate-900 tracking-tight">Atendimentos Recentes</h3>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="Buscar paciente..." 
                  className="bg-transparent border-b border-slate-200 pl-8 pb-1 text-xs font-bold outline-none focus:border-clinical-blue transition-colors w-32 sm:w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-[1.5rem] border border-slate-50 animate-pulse"></div>
              ))
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-slate-100 rounded-[2rem]">
                 <Activity className="w-10 h-10 mb-3 text-slate-200" />
                 <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Nenhum registro encontrado</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <motion.div 
                  key={report.id}
                  whileHover={{ x: 6 }}
                  onClick={() => onSelectReport(report)}
                  className="bg-white p-5 rounded-[1.5rem] flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-clinical-blue group-hover:bg-blue-50 transition-colors">
                       <Dog className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">{report.patientId}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block">
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-clinical-blue group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <button className="w-full py-4 border-2 border-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:border-clinical-blue hover:text-clinical-blue transition-all">
            Visualizar Histórico Completo
          </button>
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-10">
          {/* Insight Banner */}
          <div className="bg-[#003399] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20 group">
             <div className="relative z-10 space-y-6">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md w-fit">
                   <Sparkles className="w-6 h-6 text-amber-300 fill-amber-300" />
                </div>
                <h4 className="text-xl font-bold leading-relaxed">
                   Você processou {stats.total} laudos este mês com 100% de conformidade técnica.
                </h4>
                <button className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-200 hover:text-white hover:gap-3 transition-all">
                   REVISAR PROTOCOLOS <ArrowRight className="w-4 h-4" />
                </button>
             </div>
             <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-[60px] group-hover:bg-white/10 transition-colors"></div>
          </div>

          {/* Activity Logs */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 space-y-8">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Log de Atividade</h3>
            <div className="space-y-10 relative">
               <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-slate-100"></div>
               
               <div className="relative pl-10 group">
                  <div className="absolute left-0 top-1.5 w-1.5 h-10 bg-clinical-blue rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-clinical-blue rounded-full"></div>
                  <p className="text-sm font-black text-slate-900">Base de conhecimento atualizada</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Há 2 horas</p>
               </div>

               <div className="relative pl-10 group">
                  <div className="absolute left-0 top-1.5 w-1.5 h-10 bg-clinical-blue rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                  <p className="text-sm font-black text-slate-900">Caso Luna finalizado</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Há 5 horas</p>
               </div>
               
               <div className="relative pl-10 group">
                  <div className="absolute left-0 top-1.5 w-1.5 h-10 bg-clinical-blue rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                  <p className="text-sm font-black text-slate-900">Sincronização com nuvem</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ontem</p>
               </div>
            </div>
          </div>

          {/* Quick Support */}
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex gap-4 items-center">
             <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
               <Activity className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Status do Sistema</p>
               <p className="text-xs font-bold text-emerald-900 leading-snug">Motor de IA operando com latência otimizada.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
