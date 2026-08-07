import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Calendar, 
  FolderHeart,
  Clock,
  Dog,
  MessageSquare,
  Activity,
  HeartPulse,
  Moon,
  Footprints
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, getCurrentUser, collection, query, where, getDocs, orderBy } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Report } from '../types';

export default function Dashboard({ 
  onSelectReport, 
  onNewReport,
  onNavigateTab
}: { 
  onSelectReport: (report: Report) => void,
  onNewReport: () => void,
  onNavigateTab?: (tab: string) => void
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'reports'),
          where('ownerId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q).catch(err => {
          handleFirestoreError(err, OperationType.LIST, 'reports');
          return null as any; 
        });
        
        if (!snapshot) return;
        
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        data.sort((a, b) => {
          const tA = (a.createdAt as any)?.seconds || 0;
          const tB = (b.createdAt as any)?.seconds || 0;
          return tB - tA;
        });
        setReports(data);
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
  ).slice(0, 4);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalized':
        return <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">Finalizado</span>;
      case 'draft':
        return <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-orange-100">Rascunho</span>;
      default:
        return <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-100">Gerado</span>;
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
    <div className="max-w-4xl mx-auto space-y-4 px-4 py-6 animate-in fade-in duration-300">
      
      {/* Mini Header - Samsung Health style */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-2xl text-slate-900 tracking-tight">
          Início
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigateTab?.('bi')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm active:scale-95 transition-all"
            title="Inteligência e BI"
          >
            <Activity className="w-5 h-5 text-slate-600" />
          </button>
          <button 
            onClick={onNewReport}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm active:scale-95 transition-all"
            title="Assistente IA / Nova Consulta"
          >
            <MessageSquare className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* BIG CARD: Chat / Copiloto (Takes full width on mobile, top section) */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onNewReport}
          className="col-span-2 flex flex-col p-6 rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-600 border border-indigo-500/10 cursor-pointer relative overflow-hidden group min-h-[160px] shadow-[0_10px_30px_rgba(79,70,229,0.15)]"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 transition-opacity duration-300">
             <MessageSquare className="w-32 h-32 text-indigo-100 drop-shadow-2xl rotate-12" />
          </div>
          <div className="relative z-10 flex flex-col h-full items-start justify-between">
             <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-indigo-100" />
             </div>
             <div className="text-left mt-6">
               <h3 className="text-2xl font-bold text-white mb-1">Assistente IA</h3>
               <p className="text-sm text-indigo-100 font-medium">Inicie uma nova consulta ou tire dúvidas clínicas rápidas com o copiloto veterinário.</p>
             </div>
          </div>
        </motion.button>

        {/* CARD: Agenda */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onNavigateTab?.('calendar')}
          className="flex flex-col p-5 rounded-[2rem] bg-white border border-slate-100/80 cursor-pointer relative overflow-hidden group min-h-[160px] shadow-sm"
        >
          <div className="flex flex-col h-full justify-between items-start w-full">
            <h3 className="text-base font-semibold text-slate-800">Agenda</h3>
            <div className="self-center my-2">
               <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 border-[6px] border-emerald-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-[6px] border-emerald-500 rounded-full border-t-transparent border-r-transparent -rotate-45"></div>
                  <Calendar className="w-8 h-8 text-emerald-500" />
               </div>
            </div>
            <p className="text-xs text-slate-500 font-medium self-center mt-2">3 consultas hoje</p>
          </div>
        </motion.button>

        {/* CARD: Laudos (Recent) */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onNavigateTab?.('profile')}
          className="flex flex-col p-5 rounded-[2rem] bg-gradient-to-br from-violet-50/50 to-white border border-slate-100/80 cursor-pointer relative overflow-hidden group min-h-[160px] shadow-sm"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10">
             <FolderHeart className="w-28 h-28 text-violet-600" />
          </div>
          <div className="flex flex-col h-full justify-between items-start w-full relative z-10">
            <h3 className="text-base font-semibold text-slate-800">Laudos</h3>
            <div className="mt-4">
              <span className="text-3xl font-bold text-slate-900">{reports.length || 12}</span>
              <span className="text-sm font-medium text-violet-600 ml-2">esta semana</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-auto">Gerencie seus prontuários</p>
          </div>
        </motion.button>

        {/* CARD: Marketing */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onNavigateTab?.('marketing')}
          className="flex items-center justify-between p-5 rounded-[2rem] bg-white border border-slate-100/80 cursor-pointer col-span-2 group shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-orange-500 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-slate-800">Marketing</h3>
              <p className="text-xs text-slate-400">Atraia mais clientes com IA</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </motion.button>

      </div>

      {/* Recents List (Styled Light) */}
      <div className="mt-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4 px-2">
          <h3 className="font-semibold text-lg text-slate-900">
            Atendimentos Recentes
          </h3>
          <button className="text-sm text-indigo-600 font-semibold cursor-pointer" onClick={() => onNavigateTab?.('profile')}>Ver todos</button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-white border border-slate-100 rounded-[1.5rem] animate-pulse"></div>
            ))
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white border border-slate-100 rounded-[2rem] shadow-xs">
               <Dog className="w-8 h-8 mb-3 text-slate-300" />
               <p className="text-xs font-medium text-slate-400">Nenhum registro encontrado</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <motion.div 
                key={report.id}
                whileHover={{ scale: 1.005, y: -1 }}
                onClick={() => onSelectReport(report)}
                className="bg-white p-4 rounded-[1.5rem] flex items-center justify-between cursor-pointer border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-xs"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                     <Dog className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-slate-800 text-base leading-tight capitalize">{report.patientId}</h4>
                    <span className="text-xs text-slate-400 font-medium block mt-0.5">{formatDate(report.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {getStatusBadge(report.status)}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

