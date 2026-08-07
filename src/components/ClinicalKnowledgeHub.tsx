import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  Sparkles,
  Filter,
  Layers,
  Clock,
  CheckCircle2,
  Bookmark,
  Share2,
  FileText,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileSpreadsheet,
  Download,
  Send,
  SlidersHorizontal,
  Stethoscope,
  Activity,
  Award,
  BarChart3,
  ListFilter,
  Tag,
  UserCheck,
  FlaskConical,
  HeartPulse,
  Scale,
  X,
  Star,
  Check,
  Presentation,
  Library,
  Copy
} from 'lucide-react';
import {
  ClinicalCase,
  ClinicalKnowledgeStats,
  CaseComparisonResult,
  Patient
} from '../types';
import {
  MOCK_CLINICAL_CASES,
  MOCK_KNOWLEDGE_STATS,
  getIndexedRAGCases,
  searchClinicalMemory,
  compareClinicalCases
} from '../lib/knowledgeEngine';

interface ClinicalKnowledgeHubProps {
  patient?: Patient;
  anamnesisText?: string;
  onSelectCaseToOpen?: (c: ClinicalCase) => void;
  onGoToDecision?: () => void;
  onGoToDocumentation?: () => void;
}

export const ClinicalKnowledgeHub: React.FC<ClinicalKnowledgeHubProps> = ({
  patient,
  anamnesisText,
  onSelectCaseToOpen,
  onGoToDecision,
  onGoToDocumentation
}) => {
  // Build active live case dynamically if patient is provided
  const activeCaseObj: ClinicalCase | null = useMemo(() => {
    if (!patient || !patient.name) return null;
    const lower = (anamnesisText || '').toLowerCase();
    
    let diagnosis = 'Afeção Clínica em Avaliação';
    let specialty = 'Clínica Geral';
    if (lower.includes('otite') || lower.includes('coceira') || lower.includes('orelha')) {
      diagnosis = 'Otite Externa / Dermatopatia Aguda';
      specialty = 'Dermatologia / Otologia';
    } else if (lower.includes('xixi') || lower.includes('urina') || lower.includes('cistite') || lower.includes('rim')) {
      diagnosis = 'Cistite / Afeção Trato Urinário';
      specialty = 'Nefrologia / Urologia';
    } else if (lower.includes('carrapato') || lower.includes('erliquia') || lower.includes('anemia')) {
      diagnosis = 'Afeção Hematológica / Hemoparasitose';
      specialty = 'Infectologia / Hematologia';
    } else if (lower.includes('tosse') || lower.includes('dispneia') || lower.includes('ar')) {
      diagnosis = 'Síndrome Respiratória Aguda';
      specialty = 'Pneumologia / Cardiorrespiratório';
    } else if (lower.includes('mancando') || lower.includes('dor') || lower.includes('coluna')) {
      diagnosis = 'Afeção Osteomioarticular / Dor Aguda';
      specialty = 'Ortopedia / Neurologia';
    }

    return {
      id: `live-case-${patient.id || 'curr'}`,
      patient: {
        id: patient.id || 'p-live',
        name: patient.name,
        species: patient.species || 'Canina',
        breed: patient.breed || 'SRD',
        age: patient.age || 'Em avaliação',
        weight: patient.weight ? `${patient.weight} kg` : '10 kg',
        tutorName: patient.tutorName || 'Tutor Ativo',
        ownerId: 'owner-current'
      },
      date: new Date().toLocaleDateString('pt-BR'),
      initialHypothesis: diagnosis,
      finalDiagnosis: diagnosis,
      outcome: 'Em Tratamento',
      followUpDuration: '30 dias',
      returnVisitsCount: 1,
      tags: [patient.species || 'Canina', specialty, 'Atendimento Atual'],
      clinicalFindings: [anamnesisText || 'Triagem inicial'],
      specialty,
      affectedSystem: specialty,
      procedure: 'Consulta Clínica + RAG IA + Exames',
      vetName: 'Dr. Roberto Silva (CRMV-SP 14892)',
      summary: anamnesisText || 'Atendimento em andamento com suporte RAG IA.',
      learnedLessons: [
        {
          id: 'lesson-live-1',
          text: `Manter conduta multimodal e reavaliar parâmetros vitais de ${patient.name}.`,
          favorited: true
        }
      ],
      timeline: [],
      documents: ['Laudo SOAP', 'Prescrição Médica'],
      references: ['Consenso Veterinário 2024'],
      similarityScore: 100
    };
  }, [patient, anamnesisText]);

  // Knowledge Base State
  const [allCases, setAllCases] = useState<ClinicalCase[]>(() => {
    const ragCases = getIndexedRAGCases();
    return activeCaseObj ? [activeCaseObj, ...ragCases] : ragCases;
  });

  // Re-sync allCases if activeCaseObj updates
  useEffect(() => {
    if (activeCaseObj) {
      setAllCases(prev => {
        const withoutLive = prev.filter(c => !c.id.startsWith('live-case-'));
        return [activeCaseObj, ...withoutLive];
      });
      setExpandedCaseId(activeCaseObj.id);
    }
  }, [activeCaseObj]);

  const [stats, setStats] = useState<ClinicalKnowledgeStats>(MOCK_KNOWLEDGE_STATS);

  // Search Query (Natural Language Semantic Search)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Filters
  const [selectedSpecies, setSelectedSpecies] = useState<string>('Todas');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Todas');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Todos');

  // Expanded Case ID
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>('case-001');

  // Case Selection for Comparison (Clinical Case Comparison)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>(['case-001', 'case-003']);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Toggle Favorite Lesson
  const toggleFavoriteLesson = (caseId: string, lessonId: string) => {
    setAllCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          learnedLessons: c.learnedLessons.map(l => {
            if (l.id === lessonId) {
              return { ...l, favorited: !l.favorited };
            }
            return l;
          })
        };
      }
      return c;
    }));
    triggerToast('Lição aprendida favoritada no seu acervo pessoal!');
  };

  // Toggle Case Selection for Side-by-Side Comparison
  const toggleCompareCase = (id: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(id)) {
        return prev.filter(cId => cId !== id);
      } else {
        if (prev.length >= 3) {
          triggerToast('Você pode comparar no máximo 3 casos simultaneamente.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Filter Cases
  let filteredCases = searchClinicalMemory(searchQuery, allCases);

  if (selectedSpecies !== 'Todas') {
    filteredCases = filteredCases.filter(c => c.patient.species.toLowerCase() === selectedSpecies.toLowerCase());
  }
  if (selectedSpecialty !== 'Todas') {
    filteredCases = filteredCases.filter(c => c.specialty.includes(selectedSpecialty));
  }
  if (selectedOutcome !== 'Todos') {
    filteredCases = filteredCases.filter(c => c.outcome === selectedOutcome);
  }

  // Active Comparison Data
  const comparisonData: CaseComparisonResult = compareClinicalCases(selectedForComparison, allCases);

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans p-6 sm:p-8 lg:p-12 flex flex-col gap-8 selection:bg-indigo-100 selection:text-indigo-900 pb-36">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-24 right-8 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER BAR */}
      <div className="w-full bg-white rounded-[20px] p-8 shadow-xs border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-100 flex items-center gap-1.5">
              <Library className="w-3.5 h-3.5 text-[#4F46E5]" /> Módulo 08 — Clinical Memory Engine
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#E6F4EA] text-[#10B981] border border-[#10B981]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#10B981]" /> Busca Semântica Ativa
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Clinical Knowledge Hub
          </h1>
          <p className="text-base text-[#64748B] mt-1">
            Toda experiência clínica organizada, pesquisável e conectada em uma biblioteca viva.
          </p>
        </div>

        {/* Top Header Indicators */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Layers className="w-5 h-5 text-[#4F46E5]" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Casos Armazenados</p>
              <p className="font-extrabold text-[#0F172A] text-sm">{stats.totalCases} Casos Clínicos</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Artigos Conectados</p>
              <p className="font-extrabold text-[#0F172A] text-sm">{stats.relatedArticles} Referências RAG</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Documentos Gerados</p>
              <p className="font-extrabold text-[#0F172A] text-sm">{stats.generatedDocs} Laudos/Receitas</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Sincronização</p>
              <p className="font-semibold text-[#0F172A] text-xs">{stats.lastSync}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN 3-COLUMN LAYOUT (22% - 56% - 22%) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA 1 — NAVEGAÇÃO INTELIGENTE (22% -> lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E2E8F0] flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4F46E5]" />
                Explorar Casos
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                Coluna 01
              </span>
            </div>

            {/* Natural Language Search Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center justify-between">
                <span>Busca em Linguagem Natural</span>
                <span className="text-[10px] text-[#4F46E5] font-semibold flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-[#4F46E5]" /> IA Semântica
                </span>
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Ex: "Cães idosos com pancreatite e vômito"'
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E2E8F0] focus:ring-2 focus:ring-indigo-500 text-xs text-[#0F172A] placeholder-slate-400 bg-[#F8FAFC] transition-all"
                />
              </div>

              {/* Sample Natural Language Prompts */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Consultas Frequentes:</span>
                <button
                  onClick={() => setSearchQuery('Cães idosos com pancreatite e vômito')}
                  className="text-left text-[11px] text-[#4F46E5] hover:underline bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100 font-medium truncate cursor-pointer"
                >
                  "Cães idosos com pancreatite e vômito"
                </button>
                <button
                  onClick={() => setSearchQuery('Gatos com anemia regenerativa')}
                  className="text-left text-[11px] text-[#4F46E5] hover:underline bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100 font-medium truncate cursor-pointer"
                >
                  "Gatos com anemia regenerativa"
                </button>
              </div>
            </div>

            {/* Quick Filters Group */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" /> Filtros Rápidos
              </h4>

              {/* Filter: Espécie */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">Espécie</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Todas', 'Canina', 'Felina'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSpecies(s)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedSpecies === s
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Especialidade */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">Especialidade / Sistema</label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] bg-[#F8FAFC]"
                >
                  <option value="Todas">Todas as Especialidades</option>
                  <option value="Gastroenterologia">Gastroenterologia</option>
                  <option value="Nefrologia">Nefrologia</option>
                  <option value="Cirurgia">Cirurgia de Pequenos</option>
                  <option value="Hematologia">Hematologia Felina</option>
                </select>
              </div>

              {/* Filter: Desfecho Clínico */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">Resultado Clínico</label>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] bg-[#F8FAFC]"
                >
                  <option value="Todos">Todos os Resultados</option>
                  <option value="Alta">Alta</option>
                  <option value="Cura">Cura</option>
                  <option value="Em Acompanhamento">Em Acompanhamento</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(selectedSpecies !== 'Todas' || selectedSpecialty !== 'Todas' || selectedOutcome !== 'Todos' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setSelectedSpecies('Todas');
                    setSelectedSpecialty('Todas');
                    setSelectedOutcome('Todos');
                    setSearchQuery('');
                  }}
                  className="mt-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Limpar Todos os Filtros
                </button>
              )}
            </div>

            {/* Quick Case Comparison Trigger Bar */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col gap-2">
                <span className="text-[10px] font-extrabold uppercase text-[#4F46E5]">
                  Ferramenta de Análise Comparativa
                </span>
                <p className="text-xs font-medium text-slate-700">
                  {selectedForComparison.length} caso(s) selecionado(s) para comparação lado a lado.
                </p>
                <button
                  onClick={() => setShowComparisonModal(true)}
                  disabled={selectedForComparison.length < 2}
                  className={`w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedForComparison.length >= 2
                      ? 'bg-[#4F46E5] hover:bg-indigo-700 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" /> Comparar Casos Agora
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* COLUNA 2 — TIMELINE INTELIGENTE (PRINCIPAL) (56% -> lg:col-span-6) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#4F46E5]" />
              Linha do Tempo dos Casos ({filteredCases.length})
            </h2>
            <span className="text-xs text-[#64748B]">Ordenado por relevância e cronologia</span>
          </div>

          {/* List of Case Cards */}
          <div className="flex flex-col gap-5">
            {filteredCases.map((c) => {
              const isExpanded = expandedCaseId === c.id;
              const isSelectedForComp = selectedForComparison.includes(c.id);

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-[20px] p-6 shadow-xs border transition-all flex flex-col gap-5 ${
                    isExpanded ? 'border-[#4F46E5] ring-2 ring-indigo-500/10' : 'border-[#E2E8F0] hover:border-indigo-200'
                  }`}
                >
                  {/* Case Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3.5">
                      {/* Species Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4F46E5] font-black text-lg flex items-center justify-center shrink-0">
                        {c.patient.species.toLowerCase().includes('canin') ? '🐶' : '🐱'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-[#0F172A]">{c.patient.name}</h3>
                          <span className="text-xs text-[#64748B]">({c.patient.species} • {c.patient.breed}, {c.patient.age})</span>
                        </div>

                        <p className="text-xs text-[#64748B] mt-0.5">
                          Tutor: <strong className="text-[#0F172A]">{c.patient.tutorName}</strong> • Atendido em {c.date} por {c.vetName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Comparison Checkbox */}
                      <button
                        onClick={() => toggleCompareCase(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelectedForComp
                            ? 'bg-indigo-50 text-[#4F46E5] border-indigo-200 font-bold'
                            : 'bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:bg-slate-100'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>{isSelectedForComp ? 'Selecionado' : 'Comparar'}</span>
                      </button>

                      {/* Outcome Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        c.outcome === 'Alta' || c.outcome === 'Cura'
                          ? 'bg-[#E6F4EA] text-[#10B981] border border-[#10B981]/20'
                          : 'bg-indigo-50 text-[#4F46E5] border border-indigo-100'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> {c.outcome}
                      </span>
                    </div>
                  </div>

                  {/* Diagnostic Summary Line */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 text-xs">
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Hipótese Inicial</p>
                      <p className="font-bold text-[#0F172A]">{c.initialHypothesis}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Diagnóstico Final</p>
                      <p className="font-extrabold text-[#4F46E5]">{c.finalDiagnosis}</p>
                    </div>
                  </div>

                  {/* Case Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.tags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                        #{tag}
                      </span>
                    ))}
                    <span className="text-xs text-slate-500 font-semibold ml-auto">
                      Acompanhamento: {c.followUpDuration} ({c.returnVisitsCount} retornos)
                    </span>
                  </div>

                  {/* Expand / Collapse Button */}
                  <button
                    onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                    className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 text-[#4F46E5] font-semibold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <span>{isExpanded ? 'Ocultar Linha do Tempo e Lições' : 'Ver Linha do Tempo e Lições Aprendidas'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* EXPANDABLE SECTION (TIMELINE + AI SUMMARY + LESSONS LEARNED) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-6 pt-4 border-t border-slate-100 overflow-hidden"
                      >
                        {/* 1. RESUMO INTELIGENTE DA IA (MAX 8 LINHAS) */}
                        <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                              Resumo Inteligente do Caso (Síntese RAG)
                            </h4>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                            {c.summary}
                          </p>
                        </div>

                        {/* 2. LINHA DO TEMPO CRONOLÓGICA (Consulta -> Exames -> Mudanças -> Conduta -> Evolução -> Alta) */}
                        <div className="flex flex-col gap-3">
                          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-[#4F46E5]" /> Linha do Tempo Cronológica do Atendimento
                          </h4>

                          <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4 ml-2">
                            {c.timeline.map((ev) => (
                              <div key={ev.id} className="relative flex flex-col gap-1">
                                <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                                  ev.type === 'consultation' ? 'bg-[#4F46E5]' :
                                  ev.type === 'exam' ? 'bg-amber-500' :
                                  ev.type === 'hypothesis_change' ? 'bg-rose-500' :
                                  ev.type === 'conduct' ? 'bg-indigo-600' :
                                  ev.type === 'discharge' ? 'bg-[#10B981]' : 'bg-slate-400'
                                }`} />

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {ev.date} às {ev.time}
                                  </span>
                                  <span className="text-xs font-extrabold text-[#0F172A]">
                                    {ev.title}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-700 font-medium">
                                  {ev.summary}
                                </p>
                                {ev.details && (
                                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 mt-0.5">
                                    {ev.details}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 3. LIÇÕES APRENDIDAS (DESTAQUE ESPECIAL) */}
                        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-amber-600" /> Lições Aprendidas & Ativo Intelectual
                            </h4>
                            <span className="text-[10px] text-amber-700 font-semibold">
                              Salvável no Acervo Pessoal
                            </span>
                          </div>

                          <div className="space-y-2">
                            {c.learnedLessons.map((lesson) => (
                              <div key={lesson.id} className="bg-white p-3.5 rounded-xl border border-amber-200/80 flex items-start justify-between gap-3 text-xs text-slate-800">
                                <p className="leading-relaxed font-medium">
                                  "{lesson.text}"
                                </p>
                                <button
                                  onClick={() => toggleFavoriteLesson(c.id, lesson.id)}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                                    lesson.favorited
                                      ? 'bg-amber-100 text-amber-600'
                                      : 'bg-slate-100 hover:bg-amber-50 text-slate-400'
                                  }`}
                                  title="Favoritar Lição"
                                >
                                  <Star className={`w-4 h-4 ${lesson.favorited ? 'fill-amber-500' : ''}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Case Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                          <button
                            onClick={() => {
                              if (onSelectCaseToOpen) onSelectCaseToOpen(c);
                              triggerToast(`Caso do paciente ${c.patient.name} reaberto no workspace!`);
                            }}
                            className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Stethoscope className="w-3.5 h-3.5" /> Reabrir este Caso no Workspace
                          </button>

                          <button
                            onClick={() => triggerToast(`Resumo do caso ${c.patient.name} exportado para PDF!`)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Exportar Resumo
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3 — PAINEL ANALÍTICO (22% -> lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-xs border border-[#E2E8F0] flex flex-col gap-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                Insights Clínicos
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                Coluna 03
              </span>
            </div>

            {/* Insight 1: Diagnósticos mais frequentes */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Diagnósticos Mais Frequentes
              </h4>
              <div className="space-y-2">
                {stats.frequentDiagnoses.map((diag, idx) => (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>{diag.name}</span>
                      <span className="text-[#4F46E5] font-bold">{diag.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all duration-500"
                        style={{ width: `${diag.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insight 2: Tempo Médio de Diagnóstico */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Tempo Médio até Definição</p>
                <p className="text-xl font-black text-[#4F46E5] mt-0.5">{stats.avgTimeToDiagnosis}</p>
              </div>
              <Clock className="w-8 h-8 text-[#4F46E5]/40" />
            </div>

            {/* Insight 3: Distribuição dos Desfechos */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Evolução dos Desfechos
              </h4>
              <div className="space-y-2">
                {stats.outcomeDistribution.map((out, idx) => (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>{out.outcome}</span>
                      <span className="text-[#10B981] font-bold">{out.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${out.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insight 4: Diretrizes Mais Consultadas */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Diretrizes Mais Consultadas (RAG)
              </h4>
              <div className="space-y-2 text-xs text-slate-700">
                {stats.frequentGuidelines.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                    <span className="truncate">{g.name}</span>
                    <span className="font-bold text-[#4F46E5] shrink-0 ml-2">{g.count}x</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic text-center">
              *Análises descritivas baseadas exclusivamente nos dados do seu acervo.
            </p>

          </div>
        </div>

      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] p-4 shadow-xl mt-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#0F172A]">
              Central do Conhecimento: <strong className="text-[#4F46E5]">{stats.totalCases} Casos Ativos</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => triggerToast('Abertura de formulário de novo caso!')}
              className="px-5 py-2.5 rounded-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Caso
            </button>

            <button
              onClick={() => setShowComparisonModal(true)}
              disabled={selectedForComparison.length < 2}
              className={`px-4 py-2.5 rounded-full font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedForComparison.length >= 2
                  ? 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[#4F46E5]'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Scale className="w-4 h-4 text-[#4F46E5]" /> Comparar Casos ({selectedForComparison.length})
            </button>

            <button
              onClick={() => triggerToast('Apresentação em slides (PowerPoint/Keynote) gerada!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Presentation className="w-4 h-4 text-purple-600" /> Criar Apresentação
            </button>

            <button
              onClick={() => triggerToast('Sintese de literatura gerada com referências das diretrizes!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" /> Gerar Revisão de Literatura
            </button>

            <button
              onClick={() => triggerToast('Link de compartilhamento anônimo gerado para discussão!')}
              className="px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" /> Compartilhar Caso
            </button>
          </div>
        </div>
      </div>

      {/* CLINICAL CASE COMPARISON MODAL (FEATURE REVOLUCIONÁRIA) */}
      <AnimatePresence>
        {showComparisonModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-indigo-50 text-[#4F46E5] border border-indigo-100">
                    Clinical Case Comparison Engine
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#0F172A] mt-1">
                    Comparativo Lado a Lado de Casos Clínicos
                  </h3>
                </div>

                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Similarities Banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Semelhanças Identificadas Pela IA
                </h4>
                <ul className="text-xs text-emerald-800 space-y-1 list-disc pl-5">
                  {comparisonData.similarities.map((sim, i) => (
                    <li key={i}>{sim}</li>
                  ))}
                </ul>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
                {comparisonData.cases.map((c) => (
                  <div key={c.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="text-base font-extrabold text-[#0F172A]">{c.patient.name} ({c.patient.species})</h4>
                        <p className="text-xs text-[#64748B]">{c.patient.breed} • {c.patient.age}</p>
                      </div>
                      <span className="bg-indigo-50 text-[#4F46E5] text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                        {c.outcome}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-[#64748B] uppercase text-[10px]">Diagnóstico Final:</span>
                        <p className="font-extrabold text-[#0F172A]">{c.finalDiagnosis}</p>
                      </div>

                      <div>
                        <span className="font-bold text-[#64748B] uppercase text-[10px]">Procedimento Adotado:</span>
                        <p className="font-medium text-slate-800">{c.procedure}</p>
                      </div>

                      <div>
                        <span className="font-bold text-[#64748B] uppercase text-[10px]">Acompanhamento:</span>
                        <p className="font-medium text-slate-800">{c.followUpDuration} ({c.returnVisitsCount} retornos)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Differences Matrix */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#4F46E5]" /> Matriz de Diferenças e Conduta
                </h4>

                <div className="space-y-3">
                  {comparisonData.differences.map((diff, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-2 text-xs">
                      <span className="font-bold text-[#4F46E5] uppercase text-[11px]">{diff.category}</span>
                      <p className="text-slate-600 font-medium">{diff.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        {Object.entries(diff.detailsByCase).map(([cId, detail]) => {
                          const patientName = comparisonData.cases.find(c => c.id === cId)?.patient.name || 'Paciente';
                          return (
                            <div key={cId} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <strong className="text-[#0F172A]">{patientName}:</strong> {detail}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Fechar Comparação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ClinicalKnowledgeHub;
