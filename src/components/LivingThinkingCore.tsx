import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, BookOpen, FileText, Heart, Volume2 } from 'lucide-react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'searching' | 'generating' | 'translating';

interface LivingThinkingCoreProps {
  state: OrbState;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  onClick?: () => void;
  subLabel?: string;
  isExpandedMobile?: boolean;
}

export default function LivingThinkingCore({
  state,
  size = 'md',
  onClick,
  subLabel,
  isExpandedMobile = false
}: LivingThinkingCoreProps) {
  // State gradient mapping
  const getGradients = () => {
    switch (state) {
      case 'listening':
        return {
          primary: 'from-rose-500 via-red-500 to-orange-400',
          glow: 'rgba(239, 68, 68, 0.45)',
          border: 'border-red-300/60',
          text: 'Escutando...',
          icon: Mic,
          accentColor: '#EF4444'
        };
      case 'searching':
        return {
          primary: 'from-cyan-500 via-sky-600 to-indigo-600',
          glow: 'rgba(6, 182, 212, 0.45)',
          border: 'border-cyan-300/60',
          text: 'Buscando Literatura...',
          icon: BookOpen,
          accentColor: '#06B6D4'
        };
      case 'generating':
        return {
          primary: 'from-emerald-400 via-teal-500 to-indigo-600',
          glow: 'rgba(16, 185, 129, 0.45)',
          border: 'border-emerald-300/60',
          text: 'Gerando Conduta & Prescrição...',
          icon: FileText,
          accentColor: '#10B981'
        };
      case 'translating':
        return {
          primary: 'from-amber-400 via-orange-500 to-indigo-600',
          glow: 'rgba(249, 115, 22, 0.45)',
          border: 'border-orange-300/60',
          text: 'Traduzindo para o Tutor...',
          icon: Volume2,
          accentColor: '#F97316'
        };
      case 'thinking':
        return {
          primary: 'from-indigo-600 via-indigo-500 to-emerald-400',
          glow: 'rgba(79, 70, 229, 0.45)',
          border: 'border-indigo-300/60',
          text: 'Raciocínio Clínico em Andamento...',
          icon: Sparkles,
          accentColor: '#4F46E5'
        };
      default:
        return {
          primary: 'from-indigo-600 via-indigo-500 to-emerald-400',
          glow: 'rgba(79, 70, 229, 0.25)',
          border: 'border-indigo-200/50',
          text: 'Living Thinking Core',
          icon: Sparkles,
          accentColor: '#4F46E5'
        };
    }
  };

  const config = getGradients();
  const IconComponent = config.icon;

  const getDimensionClasses = () => {
    if (isExpandedMobile) return 'w-48 h-48 sm:w-56 sm:h-56';
    switch (size) {
      case 'sm': return 'w-10 h-10';
      case 'lg': return 'w-28 h-28';
      case 'hero': return 'w-36 h-36 sm:w-44 sm:h-44';
      case 'md': default: return 'w-20 h-20 sm:w-24 sm:h-24';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer Liquid Ambient Aura */}
      <motion.div
        animate={{
          scale: state === 'idle' ? [1, 1.12, 1] : [1, 1.28, 1],
          rotate: [0, 180, 360],
          opacity: state === 'idle' ? [0.25, 0.12, 0.25] : [0.5, 0.2, 0.5],
        }}
        transition={{
          duration: state === 'listening' ? 1.5 : 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute rounded-full blur-2xl pointer-events-none ${getDimensionClasses()} bg-gradient-to-tr ${config.primary}`}
        style={{
          boxShadow: `0 0 80px ${config.glow}`
        }}
      />

      {/* Secondary Pulse Ring */}
      <motion.div
        animate={{
          scale: state === 'idle' ? [1, 1.2, 1] : [1, 1.4, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: state === 'listening' ? 1.2 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
        className={`absolute rounded-full border border-white/40 blur-xs pointer-events-none ${getDimensionClasses()}`}
      />

      {/* Main Glassmorphic Sphere Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`relative z-10 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-xl overflow-hidden border ${config.border} ${getDimensionClasses()} bg-gradient-to-tr ${config.primary} shadow-xl shadow-indigo-500/15 group`}
        style={{
          boxShadow: `0 20px 40px -10px ${config.glow}, inset 0 2px 10px rgba(255,255,255,0.7)`
        }}
      >
        {/* Animated Inner Liquid Refraction */}
        <motion.div
          animate={{
            y: ['0%', '-25%', '0%'],
            x: ['0%', '10%', '0%'],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -inset-full bg-gradient-to-b from-white/30 via-transparent to-black/20 pointer-events-none"
        />

        {/* Center Glass Reflection Shimmer */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-1/3 bg-gradient-to-b from-white/50 to-transparent rounded-full blur-[1px] pointer-events-none" />

        {/* Dynamic Center Icon & Label */}
        <div className="relative z-20 flex flex-col items-center justify-center text-white p-2 text-center">
          <motion.div
            animate={state !== 'idle' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <IconComponent className={`text-white drop-shadow-md ${size === 'hero' || isExpandedMobile ? 'w-10 h-10 sm:w-12 sm:h-12' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'}`} />
          </motion.div>

          {(size === 'hero' || size === 'lg' || isExpandedMobile) && (
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/95 mt-1.5 drop-shadow-xs font-sans">
              {state === 'idle' ? 'Orbe Ativo' : config.text.split(' ')[0]}
            </span>
          )}
        </div>
      </motion.button>

      {/* Sub Label / State Indicator */}
      {subLabel && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 relative z-10 text-center"
        >
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight bg-white border border-slate-200/80 shadow-3xs text-[#0F172A]"
          >
            <span 
              className="w-2 h-2 rounded-full animate-pulse shrink-0" 
              style={{ backgroundColor: config.accentColor }} 
            />
            {subLabel}
          </span>
        </motion.div>
      )}
    </div>
  );
}
