import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, DollarSign, 
  Zap, ArrowUpRight,
  Target, Award, ChevronRight, Loader2, Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, collection, query, where, getDocs, orderBy } from '../lib/firebase';
import { Report } from '../types';

export function BusinessIntelligence() {
  const [timeRange, setTimeRange] = useState('30d');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'reports'),
          where('ownerId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        data.sort((a, b) => {
          const tA = (a.createdAt as any)?.seconds || 0;
          const tB = (b.createdAt as any)?.seconds || 0;
          return tB - tA;
        });
        setReports(data);
      } catch (err) {
        console.error("Error fetching BI data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Process Real Marketing Data
  const marketingData = useMemo(() => {
    const counts: Record<string, number> = {
      'Indicação': 0,
      'Instagram': 0,
      'Google': 0,
      'Facebook': 0,
      'Outros': 0
    };
    
    reports.forEach(r => {
      const source = r.marketingSource || 'Outros';
      if (counts[source] !== undefined) {
        counts[source]++;
      } else {
        counts['Outros']++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  // Process Real Service Distribution (Approximate from SOAP)
  const serviceDistribution = useMemo(() => {
    const services: Record<string, number> = {
      'Consultas': 0,
      'Vacinas': 0,
      'Cirurgias': 0,
      'Exames': 0,
      'Outros': 0
    };

    reports.forEach(r => {
      const content = r.soapContent.toLowerCase();
      if (content.includes('cirurgia') || content.includes('procedimento cirúrgico')) services['Cirurgias']++;
      else if (content.includes('vacina') || content.includes('imunização')) services['Vacinas']++;
      else if (content.includes('exame') || content.includes('análise')) services['Exames']++;
      else services['Consultas']++;
    });

    return Object.entries(services).map(([name, count]) => ({ 
      name, 
      faturamento: count * 150, // Arbitrary average value for visualization
      lucro: count * 100 
    }));
  }, [reports]);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest">Processando Inteligência...</p>
      </div>
    );
  }

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Business Intelligence</h2>
          <p className="text-sm text-slate-500">Métricas de crescimento e marketing</p>
        </div>
        <div className="flex gap-2">
           <select 
             value={timeRange}
             onChange={(e) => setTimeRange(e.target.value)}
             className="bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
           >
             <option value="7d">Últimos 7 dias</option>
             <option value="30d">Últimos 30 dias</option>
             <option value="90d">Este Trimestre</option>
           </select>
        </div>
      </div>

      {/* Hero Insights IA */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2">
               <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Insights Estratégicos</span>
            </div>
            
            <h3 className="text-xl font-bold leading-tight">
               O serviço de <span className="text-emerald-400">Cirurgias</span> gerou 34% mais lucro líquido este mês com clientes vindos do <span className="text-emerald-400">Instagram</span>.
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Custo Adqu. (CAC)</p>
                  <p className="text-xl font-black">R$ 42,50 <span className="text-[10px] text-emerald-400">↓ 12%</span></p>
               </div>
               <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">LTV (Lifetime Value)</p>
                  <p className="text-xl font-black">R$ 1.840 <span className="text-[10px] text-emerald-400">↑ 8%</span></p>
               </div>
            </div>
         </div>
         {/* Decoration */}
         <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profitability Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                    <DollarSign className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">Lucratividade</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Faturamento vs Lucro</p>
                 </div>
              </div>
           </div>
           
           <div className="h-80 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={serviceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="faturamento" fill="#f1f5f9" radius={[6, 6, 0, 0]} barSize={32} />
                    <Bar dataKey="lucro" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Marketing ROI & Retention */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                    <Target className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">Canais de Aquisição</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Origem dos atendimentos</p>
                 </div>
              </div>
           </div>
           <div className="h-80 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={marketingData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={100} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={24} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Loyalty Mixed */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center items-center text-center group hover:border-indigo-600 transition-colors">
              <Users className="w-10 h-10 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-5xl font-black text-slate-900 leading-none">{reports.length}</p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 leading-tight">Total de<br/>Atendimentos</p>
           </div>

           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center items-center text-center group hover:border-emerald-500 transition-colors">
              <Award className="w-10 h-10 text-amber-500 mb-4 group-hover:rotate-12 transition-transform" />
              <p className="text-5xl font-black text-slate-900 leading-none">{(reports.filter(r => r.marketingSource === "Indicação").length / (reports.length || 1) * 100).toFixed(0)}%</p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 leading-tight">Taxa de<br/>Indicação</p>
           </div>

           <div className="bg-indigo-600 rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center text-white shadow-2xl shadow-indigo-900/20">
              <TrendingUp className="w-10 h-10 text-indigo-200 mb-4" />
              <p className="text-4xl font-black leading-none">+R$ 1.250</p>
              <p className="text-[11px] font-black text-indigo-200 uppercase tracking-[0.3em] mt-4 leading-tight">Aumento Médio<br/>por Recomendação</p>
           </div>
        </div>
      </div>

      {/* Expansion for Human Health Promo */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 flex items-center gap-6">
         <div className="bg-emerald-100 p-4 rounded-[1.5rem] text-emerald-600">
            <TrendingUp className="w-8 h-8" />
         </div>
         <div className="flex-1 space-y-1">
            <h4 className="text-emerald-900 font-black uppercase text-xs tracking-widest">Escalabilidade Global</h4>
            <p className="text-slate-700 text-sm font-medium leading-relaxed">
               Este modelo de ROI e Análise Geográfica é 100% compatível com <b>Clínicas de Estética</b> e <b>Consultórios Médicos</b>.
            </p>
            <button className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-3 flex items-center gap-2 hover:translate-x-1 transition-transform">
               Exportar para Saúde Humana <ChevronRight className="w-3 h-3" />
            </button>
         </div>
      </div>
    </div>
  );
}
