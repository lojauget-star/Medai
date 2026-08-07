import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles, Loader2, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import {
  CalmPipelineStep,
  INITIAL_CALM_PIPELINE_STEPS,
  MOTION_TIMING,
  MOTION_EASINGS,
  STAGGER_CONTAINER_VARIANTS,
  CASCADE_ITEM_VARIANTS
} from '../lib/motionBible';

interface ClinicalCalmPipelineProps {
  isSimulating?: boolean;
  onFinished?: () => void;
}

export const ClinicalCalmPipeline: React.FC<ClinicalCalmPipelineProps> = ({
  isSimulating = false,
  onFinished
}) => {
  const [steps, setSteps] = useState<CalmPipelineStep[]>(INITIAL_CALM_PIPELINE_STEPS);
  const [currentActiveIndex, setCurrentActiveIndex] = useState<number>(2);

  useEffect(() => {
    if (!isSimulating) return;

    // Reset steps
    setSteps(INITIAL_CALM_PIPELINE_STEPS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'processing' : 'pending'
    })));
    setCurrentActiveIndex(0);

    const interval = setInterval(() => {
      setCurrentActiveIndex(prev => {
        const next = prev + 1;
        if (next >= INITIAL_CALM_PIPELINE_STEPS.length) {
          clearInterval(interval);
          setSteps(s => s.map(item => ({ ...item, status: 'completed' })));
          if (onFinished) onFinished();
          return INITIAL_CALM_PIPELINE_STEPS.length - 1;
        }

        setSteps(s => s.map((item, idx) => {
          if (idx < next) return { ...item, status: 'completed' };
          if (idx === next) return { ...item, status: 'processing' };
          return { ...item, status: 'pending' };
        }));

        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulating, onFinished]);

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="w-full bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/90 rounded-[20px] p-6 border border-indigo-100/80 shadow-xs flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
              Clinical Calm Motion Engine
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-[#10B981] font-bold border border-emerald-200">
                100% Calmo & Transparente
              </span>
            </h4>
            <p className="text-xs text-[#64748B]">
              Progresso ordenado do raciocínio clínico sem ansiedade ou spinners excessivos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#4F46E5] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {progressPercent}% Concluído
          </span>
        </div>
      </div>

      {/* Progress Bar (Smooth Transition) */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
        <motion.div
          className="bg-gradient-to-r from-[#4F46E5] to-[#10B981] h-full rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: MOTION_TIMING.expand, ease: MOTION_EASINGS.iosEaseOut }}
        />
      </div>

      {/* Steps Cascade List */}
      <motion.div
        variants={STAGGER_CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        {steps.map((step, idx) => (
          <motion.div
            key={step.id}
            variants={CASCADE_ITEM_VARIANTS}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
              step.status === 'completed'
                ? 'bg-emerald-50/70 border-emerald-200 text-[#0F172A]'
                : step.status === 'processing'
                ? 'bg-white border-[#4F46E5] ring-2 ring-indigo-500/10 shadow-2xs'
                : 'bg-[#F8FAFC] border-slate-200/80 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Etapa 0{idx + 1}
              </span>

              {step.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              ) : step.status === 'processing' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                >
                  <Loader2 className="w-4 h-4 text-[#4F46E5] shrink-0" />
                </motion.div>
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <p className={`text-xs font-bold leading-tight ${
                step.status === 'completed' ? 'text-emerald-950' :
                step.status === 'processing' ? 'text-[#0F172A]' : 'text-slate-400'
              }`}>
                {step.label}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {step.detail}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

    </div>
  );
};

export default ClinicalCalmPipeline;
