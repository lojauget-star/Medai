import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Filter, BookOpen, Calendar, Mail, FileDown, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Report } from '../types';

export default function Library({ onSelectReport }: { onSelectReport: (report: Report) => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      } catch (err) {
        console.error("Library fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => 
    r.patientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-400 max-w-md mx-auto px-1">
      <div className="px-1">
        <h2 className="text-3xl font-bold text-surface-text tracking-tight">Acervo Clínico</h2>
        <p className="text-sm font-normal text-slate-500 mt-1">Total de {reports.length} laudos consolidados.</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input 
          type="text" 
          placeholder="Pesquisar por paciente..." 
          className="input-clinical pl-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded border border-surface-border animate-pulse"></div>
          ))
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
             <BookOpen className="w-12 h-12 mb-4 text-slate-300" />
             <p className="label-medical text-xs">Nenhum registro encontrado</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <motion.div 
              key={report.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-clinical p-6 space-y-4 hover:border-clinical-blue transition-all cursor-pointer group"
              onClick={() => onSelectReport(report)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-center text-clinical-blue">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-surface-text text-base leading-tight">{report.patientId}</h4>
                    <p className="label-medical mt-0.5 text-slate-400">
                      {(report.createdAt as any)?.seconds 
                        ? new Date((report.createdAt as any).seconds * 1000).toLocaleDateString('pt-BR') 
                        : new Date(report.createdAt).toLocaleDateString('pt-BR')} • Consolidado
                    </p>
                  </div>
                </div>
                <button className="p-2 text-slate-300 hover:text-clinical-blue transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 rounded border border-slate-100 p-4">
                <p className="text-xs text-slate-500 line-clamp-2 font-normal leading-relaxed italic">
                  "{report.anamnesis}"
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                 <button className="flex-1 bg-white border border-surface-border py-2 rounded text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                    <FileDown className="w-3.5 h-3.5" /> PDF
                 </button>
                 <button className="flex-1 bg-white border border-surface-border py-2 rounded text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                    <Mail className="w-3.5 h-3.5" /> E-mail
                 </button>
                 <button className="w-10 bg-slate-50 text-clinical-blue py-2 rounded flex items-center justify-center hover:bg-clinical-blue hover:text-white transition-all">
                    <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
