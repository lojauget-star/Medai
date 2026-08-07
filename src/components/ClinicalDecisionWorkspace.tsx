import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  BookOpen,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Share2,
  Save,
  MessageSquare,
  FlaskRound,
  RotateCcw,
  Sliders,
  HelpCircle,
  Eye,
  CheckSquare,
  ArrowRight,
  Send,
  Zap,
  Bookmark
} from 'lucide-react';
import { Patient, CarePlan, ClinicalGoal, RecommendedTestItem, RecommendedInterventionItem, MonitoringParamItem, ClinicalAlertItem, ItemDecisionStatus } from '../types';
import { generateCarePlanForHypothesis, simulateClinicalScenario, ScenarioSimulationResult } from '../lib/clinicalDecisionEngine';
import { generateClinicalData } from './DifferentialDiagnosisWorkspace';

interface ClinicalDecisionWorkspaceProps {
  patient: Patient;
  anamnesisText: string;
  onGoToAnamnesis?: () => void;
  onGoToEvidence?: () => void;
  onGoToPrescription?: () => void;
}

export const ClinicalDecisionWorkspace: React.FC<ClinicalDecisionWorkspaceProps> = ({
  patient,
  anamnesisText,
  onGoToAnamnesis,
  onGoToEvidence,
  onGoToPrescription
}) => {
  // Compute dynamic clinical data based on active patient and anamnesis
  const dynamicData = useMemo(() => {
    return generateClinicalData(anamnesisText, patient);
  }, [anamnesisText, patient]);

  // Compute available hypotheses dynamically
  const hypothesesList = useMemo(() => {
    if (dynamicData.hypotheses && dynamicData.hypotheses.length > 0) {
      return dynamicData.hypotheses.map((h) => ({
        id: h.id,
        name: h.title,
        prob: h.confidence || (h.probability === 'Alta' ? 82 : h.probability === 'Moderada' ? 62 : 38),
        confidence: h.probability as 'Alta' | 'Moderada' | 'Baixa'
      }));
    }
    return [];
  }, [dynamicData]);

  const [selectedHypothesisIndex, setSelectedHypothesisIndex] = useState(0);
  const activeHypothesis = hypothesesList[selectedHypothesisIndex] || hypothesesList[0] || {
    id: 'empty',
    name: 'Nenhuma hipótese calculada',
    prob: 0,
    confidence: 'Baixa' as const
  };

  // Primary Care Plan State generated from current hypothesis
  const [carePlan, setCarePlan] = useState<CarePlan>(() => {
    return generateCarePlanForHypothesis({
      hypothesisId: activeHypothesis.id,
      hypothesisName: activeHypothesis.name,
      probability: activeHypothesis.prob,
      confidenceLevel: activeHypothesis.confidence,
      patient,
      anamnesisText
    });
  });

  // Re-sync care plan whenever hypothesis, patient, or anamnesis changes
  useEffect(() => {
    const newPlan = generateCarePlanForHypothesis({
      hypothesisId: activeHypothesis.id,
      hypothesisName: activeHypothesis.name,
      probability: activeHypothesis.prob,
      confidenceLevel: activeHypothesis.confidence,
      patient,
      anamnesisText
    });
    setCarePlan(newPlan);
  }, [selectedHypothesisIndex, activeHypothesis.id, activeHypothesis.name, activeHypothesis.prob, activeHypothesis.confidence, patient, anamnesisText]);

  // Track focused intervention for column 3 (Fundamentação)
  const [selectedItemForFundamentation, setSelectedItemForFundamentation] = useState<{
    title: string;
    type: 'Objetivo' | 'Exame' | 'Intervenção' | 'Monitoramento';
    justification: string;
    guideline: string;
    references: string[];
  }>({
    title: carePlan.recommended_interventions[0]?.description || 'Aguardando seleção de item',
    type: 'Intervenção',
    justification: carePlan.recommended_interventions[0]?.justification || 'Preencha a anamnese para gerar o plano.',
    guideline: carePlan.recommended_interventions[0]?.guidelineSource || 'RAG Vetmind',
    references: [carePlan.recommended_interventions[0]?.reference || 'Diretrizes Médicas']
  });

  // Hover Popover State
  const [hoveredPopover, setHoveredPopover] = useState<{
    id: string;
    title: string;
    reason: string;
    evidence: string;
    x: number;
    y: number;
  } | null>(null);

  // Modal / Inline Editing state
  const [editingItem, setEditingItem] = useState<{
    category: 'goals' | 'tests' | 'interventions' | 'monitoring';
    id: string;
    field: string;
    value: string;
  } | null>(null);

  // Scenario Simulator State
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeSimulationScenario, setActiveSimulationScenario] = useState<'lipase_normal' | 'foreign_body' | 'no_response_24h' | null>(null);
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResult | null>(null);

  // Modal to change hypothesis
  const [showHypothesisSelectorModal, setShowHypothesisSelectorModal] = useState(false);

  // Action toast state
  const [actionToast, setActionToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  };

  // Change hypothesis handler
  const handleSelectHypothesis = (index: number) => {
    setSelectedHypothesisIndex(index);
    const newHyp = hypothesesList[index];
    const newPlan = generateCarePlanForHypothesis({
      hypothesisId: newHyp.id,
      hypothesisName: newHyp.name,
      probability: newHyp.prob,
      confidenceLevel: newHyp.confidence,
      patient,
      anamnesisText
    });
    setCarePlan(newPlan);
    setShowHypothesisSelectorModal(false);
    triggerToast(`Hipótese alterada para: ${newHyp.name}`);
  };

  // Status toggle handler
  const handleToggleStatus = (category: 'goals' | 'recommended_tests' | 'recommended_interventions' | 'monitoring', id: string) => {
    setCarePlan(prev => {
      const updatedCategory = prev[category].map((item: any) => {
        if (item.id === id) {
          const nextStatus: ItemDecisionStatus = item.status === 'Aceito' ? 'Removido' : item.status === 'Removido' ? 'Editado' : 'Aceito';
          return { ...item, status: nextStatus };
        }
        return item;
      });
      return { ...prev, [category]: updatedCategory };
    });
  };

  // Run scenario simulation
  const handleRunSimulation = (scenario: 'lipase_normal' | 'foreign_body' | 'no_response_24h') => {
    setActiveSimulationScenario(scenario);
    const result = simulateClinicalScenario(scenario);
    setSimulationResult(result);
  };

  const handleCloseSimulation = () => {
    setActiveSimulationScenario(null);
    setSimulationResult(null);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: ItemDecisionStatus) => {
    switch (status) {
      case 'Aceito':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#10B981] border border-[#10B981]/20 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> Aceito
          </span>
        );
      case 'Editado':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Edit3 className="w-2.5 h-2.5" /> Editado pelo Vet
          </span>
        );
      case 'Removido':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 line-through">
            <X className="w-2.5 h-2.5" /> Removido
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#0F172A] font-[#Inter] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 selection:bg-indigo-100 selection:text-indigo-900 pb-32">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-24 right-8 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{actionToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR / HEADER */}
      <div className="w-full bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-100 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-[#4F46E5]" /> Módulo 06 — Decision Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F4EA] text-[#10B981] border border-[#10B981]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#10B981]" /> Decisão Final Pertence ao Veterinário
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] tracking-tight">
            Plano Clínico Estruturado
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Recomendações organizadas a partir das hipóteses diagnósticas e da literatura científica disponível.
          </p>
        </div>

        {/* Right Info Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4F46E5]" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Hipótese Ativa</p>
              <p className="font-semibold text-[#0F172A]">{activeHypothesis.name} ({activeHypothesis.prob}%)</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#10B981]" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Diretriz Predominante</p>
              <p className="font-semibold text-[#0F172A]">ACVIM / WSAVA Consensus</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Motor RAG Decision</p>
              <p className="font-semibold text-[#0F172A]">Processado em 0.6s</p>
            </div>
          </div>
        </div>
      </div>

      {/* TOGGLE SIMULADOR DE CENÁRIOS BAR */}
      <div className="w-full bg-gradient-to-r from-indigo-900 to-slate-900 rounded-[20px] p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Simulador de Cenários Clínicos
              <span className="bg-indigo-500 text-white text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">
                E se...?
              </span>
            </h3>
            <p className="text-xs text-indigo-200">
              Teste hipóteses alternativas e desfechos laboratoriais sem alterar os dados do paciente original.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="px-5 py-2.5 rounded-full bg-white text-[#4F46E5] hover:bg-indigo-50 font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          {showSimulator ? (
            <>
              <ChevronUp className="w-4 h-4" /> Esconder Simulador
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-600" /> Abrir Simulador de Cenários
            </>
          )}
        </button>
      </div>

      {/* SIMULADOR DE CENÁRIOS EXPANDABLE PANEL */}
      <AnimatePresence>
        {showSimulator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-white rounded-[20px] p-6 border-2 border-indigo-200 shadow-lg flex flex-col gap-5 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase text-[#4F46E5] tracking-wider">
                  Ambiente de Simulação Segura — Preserva o Caso Original
                </span>
                <h4 className="text-lg font-semibold text-[#0F172A]">
                  Selecione uma Pergunta Investigativa de Cenário
                </h4>
              </div>

              {activeSimulationScenario && (
                <button
                  onClick={handleCloseSimulation}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Caso Original
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleRunSimulation('lipase_normal')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  activeSimulationScenario === 'lipase_normal'
                    ? 'border-[#4F46E5] bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-[#E2E8F0] hover:border-indigo-300 bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-100 px-2.5 py-0.5 rounded-full">
                    Cenário A
                  </span>
                  <FlaskRound className="w-4 h-4 text-[#4F46E5]" />
                </div>
                <h5 className="text-sm font-semibold text-[#0F172A]">
                  "E se o resultado da lipase vier normal?"
                </h5>
                <p className="text-xs text-[#64748B]">
                  Simula normalidade de lipase pancreática e reorienta para gastroenterite primária.
                </p>
              </button>

              <button
                onClick={() => handleRunSimulation('foreign_body')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  activeSimulationScenario === 'foreign_body'
                    ? 'border-[#4F46E5] bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-[#E2E8F0] hover:border-indigo-300 bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-100 px-2.5 py-0.5 rounded-full">
                    Cenário B
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <h5 className="text-sm font-semibold text-[#0F172A]">
                  "E se o ultrassom mostrar corpo estranho?"
                </h5>
                <p className="text-xs text-[#64748B]">
                  Simula achado de artefato obstrutivo mecânico exigindo preparação cirúrgica emergencial.
                </p>
              </button>

              <button
                onClick={() => handleRunSimulation('no_response_24h')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  activeSimulationScenario === 'no_response_24h'
                    ? 'border-[#4F46E5] bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-[#E2E8F0] hover:border-indigo-300 bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-100 px-2.5 py-0.5 rounded-full">
                    Cenário C
                  </span>
                  <Clock className="w-4 h-4 text-rose-500" />
                </div>
                <h5 className="text-sm font-semibold text-[#0F172A]">
                  "E se o paciente não responder em 24h?"
                </h5>
                <p className="text-xs text-[#64748B]">
                  Simula refratariedade clínica, intensificação de analgesia contínua e suporte intensivo de UTI.
                </p>
              </button>
            </div>

            {/* Simulation Active Banner & Recalculated Plan summary */}
            {simulationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#4F46E5]" />
                    <h5 className="text-sm font-bold text-[#0F172A]">
                      Resultado Recalculado: {simulationResult.scenarioTitle}
                    </h5>
                  </div>
                  <span className="bg-[#4F46E5] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Nova Hipótese: {simulationResult.modifiedHypothesis} ({simulationResult.recalculatedProbability}%)
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-indigo-100">
                  {simulationResult.keyChangesDescription}
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setCarePlan(simulationResult.recalculatedPlan);
                      triggerToast('Plano recalculado aplicado ao workspace!');
                    }}
                    className="px-4 py-2 rounded-full bg-[#4F46E5] text-white text-xs font-semibold hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" /> Aplicar Este Plano Simulado ao Workspace
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN 3-COLUMN LAYOUT (22% - 56% - 22%) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA 1 — CONTEXTO CLÍNICO (22% -> lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4F46E5]" />
                Contexto Clínico
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                Coluna 01
              </span>
            </div>

            {/* Patient Card Summary */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A] text-sm">{patient.name || 'Paciente Sem Nome'}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] font-bold text-[10px]">
                  {patient.species || 'Canina'}
                </span>
              </div>
              <div className="text-[#64748B] space-y-1">
                <p><strong className="text-slate-700">Raça:</strong> {patient.breed || 'Não informada'}</p>
                <p><strong className="text-slate-700">Idade / Peso:</strong> {patient.age || 'N/I'} • {patient.weight ? `${patient.weight} kg` : 'N/I'}</p>
                <p><strong className="text-slate-700">Tutor:</strong> {patient.tutorName || 'Não informado'}</p>
              </div>
            </div>

            {/* Anamnesis Summary */}
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-medium text-[#64748B] uppercase text-[10px] tracking-wider">
                Resumo da Anamnese
              </label>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 text-slate-700 text-xs leading-relaxed max-h-36 overflow-y-auto">
                {anamnesisText || 'Nenhuma anamnese informada. Insira os relatos da consulta na aba Anamnese.'}
              </div>
            </div>

            {/* Selected Hypothesis Card */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-medium text-[#64748B] uppercase text-[10px] tracking-wider">
                  Hipótese Atualmente Selecionada
                </label>
                <span className="text-[10px] font-bold text-[#10B981] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                  Confiança {activeHypothesis.confidence}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A]">{activeHypothesis.name}</span>
                  <span className="text-xs font-extrabold text-[#4F46E5] bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-3xs">
                    {activeHypothesis.prob}%
                  </span>
                </div>
                {activeHypothesis.id !== 'empty' && (
                  <p className="text-[11px] text-slate-600">
                    Sintomas e perfil correlacionados com diretrizes clínicas veterinárias.
                  </p>
                )}

                <button
                  onClick={() => setShowHypothesisSelectorModal(true)}
                  className="mt-1 w-full py-2 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-[#4F46E5] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Alterar Hipótese Ativa
                </button>
              </div>
            </div>

            {/* Checklist Automático */}
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
              <label className="font-medium text-[#64748B] uppercase text-[10px] tracking-wider">
                Verificações de Segurança
              </label>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#10B981] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
                  <span>Anamnese e sinais clínicos revisados</span>
                </div>
                <div className="flex items-center gap-2 text-[#10B981] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
                  <span>Literatura internacional consultada</span>
                </div>
                <div className="flex items-center gap-2 text-[#10B981] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
                  <span>Evidências científicas verificadas</span>
                </div>
                <div className="flex items-center gap-2 text-[#10B981] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
                  <span>Exames recomendados analisados</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA 2 — PLANO CLÍNICO PRINCIPAL (56% -> lg:col-span-6) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-[#4F46E5] uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full">
                  Coluna 02 — Protagonista
                </span>
                <h2 className="text-xl font-semibold text-[#0F172A] mt-1">
                  Plano Clínico Personalizável
                </h2>
              </div>
              <div className="text-xs text-[#64748B] flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                <Info className="w-3.5 h-3.5 text-[#4F46E5]" />
                Clique nos itens para alterar o status
              </div>
            </div>

            {/* BLOCO 1 — OBJETIVOS CLÍNICOS */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#4F46E5]" />
                  1. Objetivos Imediatos
                </h3>
                <span className="text-xs text-[#64748B]">
                  {carePlan.goals.filter(g => g.status === 'Aceito').length}/{carePlan.goals.length} Selecionados
                </span>
              </div>

              <div className="space-y-3">
                {carePlan.goals.length === 0 ? (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 text-center space-y-2">
                    <p className="text-sm font-bold text-[#0F172A]">Aguardando dados da Anamnese</p>
                    <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
                      Preencha o relato da consulta na aba de Anamnese para gerar os objetivos clínicos, exames e condutas recomendados.
                    </p>
                  </div>
                ) : (
                  carePlan.goals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 relative ${
                        goal.status === 'Aceito'
                          ? 'border-[#E2E8F0] bg-white hover:border-indigo-300'
                          : goal.status === 'Removido'
                          ? 'border-slate-200 bg-slate-50/60 opacity-60'
                          : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => handleToggleStatus('goals', goal.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              goal.status === 'Aceito'
                                ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <h4 className={`text-sm font-semibold ${goal.status === 'Removido' ? 'line-through text-slate-500' : 'text-[#0F172A]'}`}>
                              {goal.title}
                            </h4>
                            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                              {goal.justification}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            goal.priority === 'Alta' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Prioridade {goal.priority}
                          </span>
                          {renderStatusBadge(goal.status)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BLOCO 2 — EXAMES COMPLEMENTARES */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-[#4F46E5]" />
                  2. Exames Complementares Recomendados
                </h3>
                <span className="text-xs text-[#64748B]">
                  {carePlan.recommended_tests.filter(t => t.status === 'Aceito').length}/{carePlan.recommended_tests.length} Solicitados
                </span>
              </div>

              <div className="space-y-3">
                {carePlan.recommended_tests.map((test) => (
                  <div
                    key={test.id}
                    onMouseEnter={() => {
                      setSelectedItemForFundamentation({
                        title: test.name,
                        type: 'Exame',
                        justification: test.motive,
                        guideline: test.guidelineSource,
                        references: [test.confirmationGoal]
                      });
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer ${
                      test.status === 'Aceito'
                        ? 'border-[#E2E8F0] bg-white hover:border-indigo-300'
                        : test.status === 'Removido'
                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus('recommended_tests', test.id);
                          }}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            test.status === 'Aceito'
                              ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div>
                          <h4 className={`text-sm font-semibold ${test.status === 'Removido' ? 'line-through text-slate-500' : 'text-[#0F172A]'}`}>
                            {test.name}
                          </h4>
                          <p className="text-xs text-slate-700 font-medium mt-1">
                            Motivo: <span className="font-normal text-[#64748B]">{test.motive}</span>
                          </p>
                          <p className="text-xs text-indigo-700 mt-0.5 font-medium">
                            Objetivo de confirmação: <span className="font-normal text-slate-600">{test.confirmationGoal}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                          Urgência {test.urgency}
                        </span>
                        {renderStatusBadge(test.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BLOCO 3 — INTERVENÇÕES RECOMENDADAS (LINGUAGEM NÃO IMPERATIVA) */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-[#4F46E5]" />
                    3. Intervenções Recomendadas
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Linguagem orientativa baseada em literatura. O médico-veterinário valida a dosagem final.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {carePlan.recommended_interventions.map((rx) => (
                  <div
                    key={rx.id}
                    onMouseEnter={() => {
                      setSelectedItemForFundamentation({
                        title: rx.description,
                        type: 'Intervenção',
                        justification: rx.justification,
                        guideline: rx.guidelineSource,
                        references: [rx.reference]
                      });
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer ${
                      rx.status === 'Aceito'
                        ? 'border-[#E2E8F0] bg-white hover:border-indigo-300'
                        : rx.status === 'Removido'
                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus('recommended_interventions', rx.id);
                          }}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            rx.status === 'Aceito'
                              ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div>
                          <p className={`text-xs sm:text-sm font-medium leading-relaxed ${rx.status === 'Removido' ? 'line-through text-slate-500' : 'text-[#0F172A]'}`}>
                            {rx.description}
                          </p>
                          <p className="text-xs text-[#64748B] mt-1">
                            <strong className="text-slate-700">Justificativa:</strong> {rx.justification}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              Ref: {rx.reference}
                            </span>
                            <span className="text-[10px] font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              Diretriz {rx.guidelineSource}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {renderStatusBadge(rx.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BLOCO 4 — MONITORAMENTO */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#4F46E5]" />
                4. Monitoramento Clínico Sugerido
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {carePlan.monitoring.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A]">{item.parameter}</span>
                      <span className="text-[10px] font-extrabold text-[#10B981] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-[#10B981]/20">
                        {item.frequency}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* BLOCO 5 — PONTOS DE ATENÇÃO E ALERTAS */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F43F5E]" />
                5. Pontos de Atenção e Alertas Clínicos
              </h3>

              <div className="space-y-3">
                {carePlan.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      alert.severity === 'alerta'
                        ? 'border-rose-200 bg-rose-50/50 text-rose-900'
                        : 'border-amber-200 bg-amber-50/50 text-amber-900'
                    }`}
                  >
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                      alert.severity === 'alerta' ? 'text-[#F43F5E]' : 'text-amber-600'
                    }`} />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">{alert.title}</h4>
                      <p className="text-xs leading-relaxed mt-1">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* COLUNA 3 — PAINEL DE FUNDAMENTAÇÃO (22% -> lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                Fundamentação & Literatura
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                Coluna 03
              </span>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-[#4F46E5] tracking-wider">
                Foco Atual
              </span>
              <h4 className="text-xs font-bold text-[#0F172A]">
                {selectedItemForFundamentation.title}
              </h4>
              <p className="text-[11px] text-slate-700 leading-relaxed mt-1">
                {selectedItemForFundamentation.justification}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-[#64748B] uppercase text-[10px] tracking-wider">
                Diretrizes Aplicáveis
              </label>
              <div className="p-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                {selectedItemForFundamentation.guideline}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-[#64748B] uppercase text-[10px] tracking-wider">
                Referências Científicas
              </label>
              <div className="space-y-2">
                {selectedItemForFundamentation.references.map((ref, i) => (
                  <div key={i} className="p-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-slate-700 leading-relaxed">
                    "{ref}"
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <label className="font-medium text-[#64748B] uppercase text-[10px] tracking-wider">
                Outras Fontes no Grafo de Conhecimento
              </label>
              <ul className="text-[11px] text-[#64748B] space-y-1.5 list-disc pl-4">
                {carePlan.supporting_references.map((s, idx) => (
                  <li key={idx} className="hover:text-[#4F46E5] cursor-pointer transition-colors">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={onGoToEvidence}
              className="mt-2 w-full py-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-semibold text-xs border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" /> Explorar Grafo no Módulo 05
            </button>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM BAR WITH ACTION BUTTONS */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] p-4 shadow-xl mt-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#0F172A]">
              Decisão Registrada pelo Vet ({carePlan.recommended_interventions.filter(i => i.status === 'Aceito').length} Intervenções Aceitas)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (onGoToPrescription) onGoToPrescription();
                else triggerToast('Aguardando módulo de prescrição final!');
              }}
              className="px-5 py-2.5 rounded-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Gerar Prescrição
            </button>

            <button
              onClick={() => triggerToast('Solicitação de Exames gerada em PDF!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FlaskConical className="w-4 h-4 text-[#4F46E5]" /> Gerar Solicitação de Exames
            </button>

            <button
              onClick={() => triggerToast('Resumo para Tutor gerado com linguagem leiga e acolhedora!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#10B981]" /> Explicar ao Tutor
            </button>

            <button
              onClick={() => triggerToast('Evolução clínica gerada em rascunho SOAP!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-amber-600" /> Criar Evolução Clínica
            </button>

            <button
              onClick={() => triggerToast('Plano exportado em formato estruturado!')}
              className="px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Exportar
            </button>

            <button
              onClick={() => triggerToast('Caso Clínico salvo com sucesso no histórico!')}
              className="px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Salvar Caso
            </button>
          </div>
        </div>
      </div>

      {/* MODAL ALTERAR HIPÓTESE */}
      <AnimatePresence>
        {showHypothesisSelectorModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#4F46E5]" />
                  Selecione a Hipótese Diagnóstica Ativa
                </h3>
                <button
                  onClick={() => setShowHypothesisSelectorModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#64748B]">
                Alterar a hipótese recalculará automaticamente os objetivos, exames recomendados e intervenções propostas pelo Decision Engine.
              </p>

              <div className="space-y-2.5">
                {hypothesesList.map((hyp, idx) => (
                  <button
                    key={hyp.id}
                    onClick={() => handleSelectHypothesis(idx)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedHypothesisIndex === idx
                        ? 'border-[#4F46E5] bg-indigo-50/80 ring-2 ring-indigo-500/20'
                        : 'border-[#E2E8F0] hover:border-indigo-300 bg-white'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-[#0F172A]">{hyp.name}</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">Confiança do modelo: {hyp.confidence}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#4F46E5] bg-white px-2.5 py-1 rounded-full border border-indigo-100">
                        {hyp.prob}%
                      </span>
                      {selectedHypothesisIndex === idx && (
                        <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowHypothesisSelectorModal(false)}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClinicalDecisionWorkspace;
