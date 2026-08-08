import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileCheck, 
  BookOpen, 
  GitBranch, 
  Brain, 
  ClipboardCheck, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Database, 
  ArrowRight,
  PawPrint,
  Check,
  ChevronRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '../types';

interface ClinicalReasoningEngineProps {
  patient: Patient;
  anamnesisText: string;
  isGenerating: boolean;
  onComplete?: () => void;
  onGoToAnamnesis?: () => void;
}

export default function ClinicalReasoningEngine({
  patient,
  anamnesisText,
  isGenerating,
  onComplete,
  onGoToAnamnesis,
}: ClinicalReasoningEngineProps) {
  const [seconds, setSeconds] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(2); // 0 to 6

  const hasContent = Boolean(anamnesisText.trim() || isGenerating);

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate pipeline step advancement every 3-4 seconds if still generating
  useEffect(() => {
    if (!isGenerating) {
      setCurrentStepIndex(6); // All steps done when generation finishes
      return;
    }
    const stepTimer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, 3500);

    return () => clearInterval(stepTimer);
  }, [isGenerating]);

  // Formatted timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const estimatedRemaining = Math.max(0, 18 - seconds);

  // Extract bullets from actual anamnesis text
  const anamnesisBullets = React.useMemo(() => {
    if (!anamnesisText.trim()) {
      return [];
    }
    const lines = anamnesisText
      .split(/[\n;.]/)
      .map((l) => l.replace(/^[•\-*\d.]+\s*/, '').trim())
      .filter((l) => l.length > 3);

    if (lines.length > 0) {
      return lines.slice(0, 7);
    }
    return [anamnesisText.trim()];
  }, [anamnesisText]);

  // Extract chips/keywords for Step 1
  const extractedChips = React.useMemo(() => {
    if (anamnesisBullets.length === 0) return [];
    return anamnesisBullets.map((bullet) => {
      const words = bullet.split(' ');
      if (words.length <= 3) return bullet;
      return words.slice(0, 3).join(' ');
    }).slice(0, 5);
  }, [anamnesisBullets]);

  // Literature Sources
  const sources = [
    { name: 'PubMed', count: hasContent ? '52 artigos' : '0 artigos' },
    { name: 'WSAVA', count: 'Diretriz 2024' },
    { name: 'ACVIM', count: 'Consenso Internacional' },
    { name: 'AAHA', count: 'Protocolo Emergência' },
    { name: 'BSAVA', count: 'Gastroenterologia' },
    { name: 'Plumb\'s', count: 'Guia Dosagens' },
  ];

  // Pipeline Steps Definition
  const steps = [
    {
      id: 1,
      title: '1. Extraindo Achados Clínicos',
      icon: Search,
      subtitle: `${anamnesisBullets.length} achado(s) clínico(s) identificado(s) na anamnese`,
      chips: extractedChips.length > 0 ? extractedChips : undefined,
      status: currentStepIndex >= 0 ? 'completed' : 'pending',
    },
    {
      id: 2,
      title: '2. Estruturando Informações',
      icon: FileCheck,
      subtitle: 'Convertendo relato da consulta e exames em matriz de dados estruturada',
      status: currentStepIndex > 1 ? 'completed' : currentStepIndex === 1 ? 'running' : 'pending',
    },
    {
      id: 3,
      title: '3. Consultando Literatura Científica (RAG Engine)',
      icon: BookOpen,
      subtitle: hasContent ? '127 artigos, 8 consensos e 4 diretrizes internacionais localizadas' : 'Aguardando envio para busca em literatura',
      showSources: hasContent,
      status: currentStepIndex > 2 ? 'completed' : currentStepIndex === 2 ? 'running' : 'pending',
    },
    {
      id: 4,
      title: '4. Relacionando Evidências (Grafo do Conhecimento)',
      icon: GitBranch,
      subtitle: 'Correlacionando sinais clínicos com achados fisiopatológicos',
      status: currentStepIndex > 3 ? 'completed' : currentStepIndex === 3 ? 'running' : 'pending',
    },
    {
      id: 5,
      title: '5. Priorizando Hipóteses Diagnósticas',
      icon: Brain,
      subtitle: 'Calculando probabilidade clínica e grau de afinidade (%)',
      status: currentStepIndex > 4 ? 'completed' : currentStepIndex === 4 ? 'running' : 'pending',
    },
    {
      id: 6,
      title: '6. Planejando Conduta & Exames Complementares',
      icon: ClipboardCheck,
      subtitle: 'Selecionando exames para confirmação diagnóstica',
      status: currentStepIndex > 5 ? 'completed' : currentStepIndex === 5 ? 'running' : 'pending',
    },
    {
      id: 7,
      title: '7. Preparando Documentação & Prescrição',
      icon: FileText,
      subtitle: 'Estruturando receituário, orientações ao tutor e laudo SOAP',
      subItems: ['Receituário Terapêutico', 'Solicitação de Exames', 'Resumo Clínico SOAP'],
      status: currentStepIndex >= 6 ? 'completed' : 'pending',
    },
  ];

  // Dynamic Timeline
  const nowTime = React.useMemo(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), []);

  const timelineEvents = [
    { time: nowTime, label: `Caso de ${patient.name || 'Paciente'} recebido`, type: 'done' },
    { time: nowTime, label: `Anamnese estruturada (${anamnesisBullets.length} achados)`, type: 'done' },
    { time: nowTime, label: 'Busca RAG em bases científicas', type: 'done' },
    { time: nowTime, label: 'Evidências correlacionadas com Grafo', type: currentStepIndex >= 3 ? 'done' : 'processing' },
    { time: nowTime, label: 'Probabilidade de hipóteses calculada', type: currentStepIndex >= 4 ? 'done' : currentStepIndex === 3 ? 'processing' : 'pending' },
    { time: nowTime, label: 'Conduta e dosagens parametrizadas', type: currentStepIndex >= 5 ? 'done' : 'pending' },
    { time: nowTime, label: 'Laudo SOAP e documentação finalizados', type: currentStepIndex >= 6 ? 'done' : 'pending' },
  ];

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC] min-h-full font-sans text-[#0F172A] selection:bg-indigo-100 selection:text-indigo-700 animate-fadeIn">
      
      {/* HEADER SUPERIOR DO PIPELINE */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3 sm:px-6 shadow-2xs mb-3 sm:mb-4">
        <div className="max-w-[2160px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] shrink-0">
              <Sparkles className="w-5 h-5 animate-spin-slow text-[#4F46E5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight font-sans">
                  {isGenerating ? "Análise Clínica em Andamento" : hasContent ? "Raciocínio Clínico e Evidências RAG" : "Pipeline RAG de Raciocínio Clínico"}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-ping" />
                  Motor Vetmind 3.0
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-sans mt-0.5">
                {hasContent 
                  ? "O Vetmind está estruturando o caso e consultando literatura científica para construir hipóteses baseadas em evidências."
                  : "O Vetmind consulta literatura científica em tempo real assim que o caso é submetido na anamnese."}
              </p>
            </div>
          </div>

          {/* Timer and Time Estimate */}
          <div className="flex items-center gap-4 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-1.5 rounded-xl shrink-0 self-end sm:self-center">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
              <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span className="tabular-nums font-mono">{formatTime(seconds)}</span>
            </div>
            <div className="h-3.5 w-px bg-[#E2E8F0]" />
            <div className="text-[11px] text-[#64748B] font-medium font-sans">
              {isGenerating ? (
                <span>≈ {estimatedRemaining}s restantes</span>
              ) : hasContent ? (
                <span className="text-[#10B981] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Processamento Concluído
                </span>
              ) : (
                <span className="text-slate-500 font-medium">Aguardando Envio</span>
              )}
            </div>
          </div>

        </div>

        {/* PAINEL DE CONFIANÇA DO PROCESSO (PANEL DE MÉTRICAS) */}
        <div className="max-w-[2160px] mx-auto mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block font-sans">Achados Clínicos</span>
              <span className="font-bold text-[#0F172A] text-xs font-sans">{anamnesisBullets.length} identificados</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#4F46E5] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block font-sans">Literatura Consultada</span>
              <span className="font-bold text-[#0F172A] text-xs font-sans">{hasContent ? '127 publicações' : '0 publicações'}</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#4F46E5] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block font-sans">Diretrizes Internacionais</span>
              <span className="font-bold text-[#0F172A] text-xs font-sans">{hasContent ? '6 encontradas' : '0 encontradas'}</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-2 rounded-lg border border-slate-100 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#10B981] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block font-sans">Referências Elegíveis</span>
              <span className="font-bold text-[#0F172A] text-xs font-sans">{hasContent ? '24 selecionadas' : '0 selecionadas'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {!hasContent ? (
        <div className="p-4 sm:p-8 max-w-xl mx-auto w-full my-6">
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-2xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] mx-auto shadow-3xs">
              <Brain className="w-7 h-7 text-[#4F46E5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#0F172A] font-sans">
                Aguardando Anamnese para Processar
              </h3>
              <p className="text-xs text-[#64748B] font-sans leading-relaxed">
                Nenhum diagnóstico foi acionado para este atendimento. O pipeline RAG será executado automaticamente assim que você preencher a anamnese do paciente e clicar em <strong>"Gerar Diagnóstico"</strong>.
              </p>
            </div>
            {onGoToAnamnesis && (
              <button
                type="button"
                onClick={onGoToAnamnesis}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#3730A3] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 font-sans"
              >
                <span>Ir para Anamnese (Módulo 02)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 md:p-4 max-w-[2160px] w-full mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            
            {/* ================= ZONA 1 — RESUMO DO CASO (ESQUERDA ~24%) ================= */}
            <div className="lg:col-span-3 space-y-3">
              <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-3.5 shadow-2xs space-y-3">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <PawPrint className="w-4 h-4 text-[#4F46E5]" />
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">Resumo do Paciente</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#64748B] text-[9px] font-bold font-sans">
                    Somente Leitura
                  </span>
                </div>

                {/* Patient Header Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-[#E2E8F0] overflow-hidden bg-indigo-50/50 shrink-0 shadow-3xs flex items-center justify-center">
                    <img 
                      src={patient.species === 'Felino' ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=120" : (patient.species === 'Canino' ? "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=120" : "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=120")} 
                      alt={patient.name || "Pet"} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <h2 className="text-sm font-bold text-[#0F172A] font-sans truncate">{patient.name || "Paciente sem nome"}</h2>
                    <p className="text-xs font-medium text-[#64748B] font-sans truncate">
                      {patient.species || "Espécie N/I"} • {patient.breed || "Raça N/I"}
                    </p>
                    <p className="text-[11px] text-[#64748B] font-sans truncate">
                      {patient.sex || "Sexo N/I"} • {patient.age || "Idade N/I"} • {patient.weight ? `${patient.weight} kg` : "Peso N/I"}
                    </p>
                  </div>
                </div>

                {/* Tutor details */}
                <div className="bg-[#F8FAFC] p-2 rounded-xl border border-slate-100 text-xs space-y-1 font-sans">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Tutor:</span>
                    <span className="font-semibold text-[#0F172A]">{patient.ownerName || patient.tutorName || "Não informado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Data da Consulta:</span>
                    <span className="font-semibold text-[#0F172A]">Hoje, {nowTime.slice(0, 5)}</span>
                  </div>
                </div>

                {/* Extracted Anamnesis Bullets */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <h4 className="font-semibold text-[11px] uppercase tracking-wider text-[#64748B] font-sans">
                    Sinais Clínicos Extraídos:
                  </h4>
                  {anamnesisBullets.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-[#0F172A] font-sans">
                      {anamnesisBullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
                          <span className="leading-snug text-[11px] text-[#334155]">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-[#64748B] italic font-sans">Nenhum sinal específico registrado na anamnese.</p>
                  )}
                </div>

              </div>
            </div>


          {/* ================= ZONA 2 — PIPELINE DE RACIOCÍNIO CLÍNICO (CENTRO ~54%) ================= */}
          <div className="lg:col-span-6 space-y-2.5">
            <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">
                    Pipeline de Raciocínio Clínico Veterinário
                  </h3>
                </div>
                <span className="text-[10px] text-[#64748B] font-mono">
                  Etapa {Math.min(currentStepIndex + 1, 7)} de 7
                </span>
              </div>

              {/* Vertical Step Cards */}
              <div className="space-y-2.5">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = step.status === 'completed';
                  const isRunning = step.status === 'running';

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`p-3 rounded-xl border transition-all ${
                        isDone 
                          ? 'bg-emerald-50/20 border-emerald-200/60' 
                          : isRunning 
                          ? 'bg-indigo-50/30 border-[#4F46E5] ring-2 ring-[#4F46E5]/10' 
                          : 'bg-[#F8FAFC] border-slate-150 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                            isDone 
                              ? 'bg-[#10B981] text-white' 
                              : isRunning 
                              ? 'bg-[#4F46E5] text-white' 
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isDone ? (
                              <Check className="w-4 h-4" />
                            ) : isRunning ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Icon className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className={`text-xs font-bold font-sans ${isDone ? 'text-[#0F172A]' : isRunning ? 'text-[#4F46E5]' : 'text-[#64748B]'}`}>
                              {step.title}
                            </h4>
                            <p className="text-[11px] text-[#64748B] font-sans">
                              {step.subtitle}
                            </p>

                            {/* Optional Chips for Step 1 */}
                            {step.chips && (
                              <div className="flex flex-wrap gap-1 pt-1.5">
                                {step.chips.map((chip, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-semibold text-[#0F172A] shadow-3xs">
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Optional Sources Badges for Step 3 */}
                            {step.showSources && (
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {sources.map((src, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-indigo-50/80 border border-indigo-100 rounded-md text-[10px] font-medium text-[#4F46E5] font-mono">
                                    {src.name} • {src.count}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Sub-items for Step 7 */}
                            {step.subItems && (
                              <div className="flex items-center gap-2 pt-1 text-[10px] text-[#64748B]">
                                {step.subItems.map((sub, i) => (
                                  <span key={i} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-[#10B981]" />
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Label */}
                        <div className="shrink-0 text-right">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" /> Concluído
                            </span>
                          ) : isRunning ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> Em execução
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-full">
                              Pendente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar for active step */}
                      {isRunning && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                          <motion.div 
                            className="bg-[#4F46E5] h-full rounded-full"
                            initial={{ width: '10%' }}
                            animate={{ width: '85%' }}
                            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Completion CTA when pipeline finishes or ready */}
              {onComplete && (!isGenerating || currentStepIndex >= 6) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pt-2 flex justify-center"
                >
                  <button
                    type="button"
                    onClick={onComplete}
                    className="w-full sm:w-[400px] h-[48px] bg-[#4F46E5] hover:bg-[#3730A3] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans group"
                  >
                    <span>Visualizar Raciocínio Completo & Diagnósticos</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

            </div>
          </div>


          {/* ================= ZONA 3 — PAINEL DE ATIVIDADE EM TEMPO REAL (DIREITA ~22%) ================= */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-3.5 shadow-2xs space-y-3">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#10B981]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">
                    Atividade em Tempo Real
                  </h3>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              </div>

              {/* Timeline Items */}
              <div className="relative pl-3 space-y-3 border-l-2 border-slate-100 my-1">
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    
                    {/* Dot Indicator */}
                    <span className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      evt.type === 'done' 
                        ? 'bg-[#10B981]' 
                        : evt.type === 'processing' 
                        ? 'bg-[#4F46E5] animate-pulse' 
                        : 'bg-slate-300'
                    }`} />

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#64748B] block">
                        {evt.time}
                      </span>
                      <p className={`text-xs font-medium font-sans leading-tight ${
                        evt.type === 'done' ? 'text-[#0F172A]' : evt.type === 'processing' ? 'text-[#4F46E5] font-semibold' : 'text-[#64748B]'
                      }`}>
                        {evt.label}
                      </p>
                    </div>

                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100 text-[11px] text-[#64748B] font-sans space-y-1">
                <p className="font-semibold text-[#0F172A] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Rastreabilidade Científica
                </p>
                <p className="text-[10px] leading-relaxed">
                  Todas as hipóteses calculadas registram os identificadores PubMed e WSAVA no laudo final.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
      )}

    </div>
  );
}
