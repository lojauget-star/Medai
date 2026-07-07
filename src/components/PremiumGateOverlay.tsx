import React from 'react';
import { Lock, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface PremiumGateOverlayProps {
  featureName: string;
  description: string;
  onUpgrade: () => void;
}

export default function PremiumGateOverlay({ featureName, description, onUpgrade }: PremiumGateOverlayProps) {
  const benefits = [
    "Acesso total e ilimitado à inteligência artificial avançada",
    "Cruzamento automático com diretrizes e livros de referência",
    "Geração de laudos e receitas em tempo recorde",
    "Análise de faturamento e inteligência de negócios (BI)",
    "Estúdio de marketing com criação de carrosséis e posts"
  ];

  return (
    <div className="relative w-full h-[650px] lg:h-full min-h-[500px] flex items-center justify-center bg-slate-50/50 p-6 overflow-hidden rounded-[2.5rem] border border-slate-100">
      {/* Blurred background decoration to create depth */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-45 -left-45 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="relative z-10 max-w-xl w-full bg-white/80 backdrop-blur-md border border-slate-200/40 p-8 lg:p-10 rounded-[2.5rem] shadow-xl shadow-indigo-950/5 text-center flex flex-col items-center"
      >
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Lock className="w-7 h-7" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -top-1 -right-1 bg-amber-400 text-white p-1.5 rounded-full shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </motion.div>
        </div>

        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100/30 mb-3">
          Módulo Exclusivo Pro
        </span>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-3">
          {featureName}
        </h3>

        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mb-6">
          {description}
        </p>

        {/* Benefits Box */}
        <div className="w-full bg-slate-50/80 border border-slate-100/60 p-5 rounded-2xl text-left space-y-3 mb-8">
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            Vantagens do Plano VetMind Pro
          </div>
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-600 font-medium leading-snug">{benefit}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/10 hover:scale-[1.01] duration-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Ativar Plano VetMind Pro</span>
        </button>
      </motion.div>
    </div>
  );
}
