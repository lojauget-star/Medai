import { Variants } from 'motion/react';

/**
 * MÓDULO 10 — VETMIND MOTION BIBLE & DESIGN SYSTEM
 * Inspired by Apple Human Interface Motion, Linear, Raycast, Arc Browser, Notion & iOS.
 * 
 * Philosophy: Clinical Calm Motion
 * Animations are never decorative noise. They communicate state, priority, and continuity.
 * Never use exaggerated bounce or elastic curves. Prioritize 60 FPS transform and opacity.
 */

// 1. TIMING CONSTANTS (IN SECONDS)
export const MOTION_TIMING = {
  hover: 0.12,     // 120ms
  click: 0.15,     // 150ms
  fade: 0.18,      // 180ms
  expand: 0.22,    // 220ms
  modal: 0.26,     // 260ms
  page: 0.28,      // 280ms
};

// 2. EASING CURVES (iOS EASE-OUT & SMOOTH SPRING)
export const MOTION_EASINGS = {
  iosEaseOut: [0.16, 1, 0.3, 1] as const, // Smooth deceleration curve
  subtleSpring: { type: 'spring', stiffness: 380, damping: 28 },
  calmSpring: { type: 'spring', stiffness: 300, damping: 26 },
};

// 3. REUSABLE MICRO-INTERACTION PROPS
export const BUTTON_MOTION_PROPS = {
  whileHover: { scale: 1.01, transition: { duration: MOTION_TIMING.hover, ease: MOTION_EASINGS.iosEaseOut } },
  whileTap: { scale: 0.98, transition: { duration: MOTION_TIMING.click, ease: MOTION_EASINGS.iosEaseOut } },
};

export const CARD_HOVER_MOTION = {
  whileHover: { 
    y: -2, 
    transition: { duration: MOTION_TIMING.hover, ease: MOTION_EASINGS.iosEaseOut } 
  },
};

// 4. VARIANTS
export const PAGE_TRANSITION_VARIANTS: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: MOTION_TIMING.page, ease: MOTION_EASINGS.iosEaseOut } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    transition: { duration: MOTION_TIMING.fade, ease: 'easeIn' } 
  },
};

export const MODAL_MOTION_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { duration: MOTION_TIMING.modal, ease: MOTION_EASINGS.iosEaseOut } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: 8, 
    transition: { duration: MOTION_TIMING.click, ease: 'easeIn' } 
  },
};

export const ACCORDION_EXPAND_VARIANTS: Variants = {
  closed: { 
    height: 0, 
    opacity: 0, 
    transition: { duration: MOTION_TIMING.expand, ease: 'easeInOut' } 
  },
  open: { 
    height: 'auto', 
    opacity: 1, 
    transition: { duration: MOTION_TIMING.expand, ease: MOTION_EASINGS.iosEaseOut } 
  },
};

export const STAGGER_CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const CASCADE_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: MOTION_TIMING.fade, ease: MOTION_EASINGS.iosEaseOut } 
  },
};

// 5. CLINICAL CALM PIPELINE STEPS
export interface CalmPipelineStep {
  id: string;
  label: string;
  detail: string;
  status: 'pending' | 'processing' | 'completed';
}

export const INITIAL_CALM_PIPELINE_STEPS: CalmPipelineStep[] = [
  { id: 'step-1', label: 'Estruturando Anamnese & Sinais', detail: 'Extração limpa de dados do prontuário', status: 'completed' },
  { id: 'step-2', label: 'Consultando Literatura & Diretrizes RAG', detail: 'ACVIM, WSAVA & Plumb Veterinary Handbook', status: 'completed' },
  { id: 'step-3', label: 'Priorizando Hipóteses & Diagnósticos', detail: 'Ranqueamento com % de afinidade epidemiológica', status: 'processing' },
  { id: 'step-4', label: 'Avaliando Condutas & Dosagens', detail: 'Validação de segurança mg/kg e espécie', status: 'pending' },
  { id: 'step-5', label: 'Preparando Documentação Final', detail: 'Sincronização com o Clinical Documentation Studio', status: 'pending' },
];
