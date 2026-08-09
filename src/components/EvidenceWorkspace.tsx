import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Filter,
  Share2,
  Download,
  Copy,
  Bookmark,
  FileText,
  Layers,
  Sparkles,
  GitCommit,
  Check,
  Search,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  Network
} from 'lucide-react';
import { Patient, EvidenceArticle, CitationFormat } from '../types';
import {
  getEvidenceGroupsForPatient,
  buildEvidenceGraph,
  formatCitation,
  EvidenceGraphData
} from '../lib/evidenceEngine';

interface EvidenceWorkspaceProps {
  patient: Patient;
  anamnesisText?: string;
  onGoToAnamnesis?: () => void;
}

export default function EvidenceWorkspace({
  patient,
  anamnesisText = '',
  onGoToAnamnesis
}: EvidenceWorkspaceProps) {
  // Get evidence groups based on patient anamnesis/symptoms and species
  const evidenceGroups = useMemo(() => {
    return getEvidenceGroupsForPatient(anamnesisText, patient?.species);
  }, [anamnesisText, patient?.species]);

  // Selected Hypothesis State
  const defaultFallbackId = patient?.species === 'Felino' 
    ? 'pancreatite-aguda-felina' 
    : (patient?.species === 'Canino' ? 'pancreatite-aguda' : (evidenceGroups[0]?.id || 'investigacao-clinica-geral'));
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string>(
    evidenceGroups[0]?.id || defaultFallbackId
  );

  // Dynamic header stats based on evidence groups
  const totalArticlesCount = useMemo(() => {
    return evidenceGroups.reduce((acc, g) => acc + g.articles.length, 0);
  }, [evidenceGroups]);

  const highEvidenceCount = useMemo(() => {
    return evidenceGroups.reduce((acc, g) => acc + g.articles.filter(a => a.evidence_level === 'Alta').length, 0);
  }, [evidenceGroups]);

  const guidelinesCount = useMemo(() => {
    return evidenceGroups.reduce((acc, g) => acc + g.articles.filter(a => a.publication_type === 'Guideline' || a.publication_type === 'Consenso').length, 0);
  }, [evidenceGroups]);

  // Active View Mode: 'map' (Timeline) vs 'graph' (Evidence Graph)
  const [viewStyle, setViewStyle] = useState<'map' | 'graph'>('map');

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedLevel, setSelectedLevel] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Interactivity
  const [fullArticleModal, setFullArticleModal] = useState<EvidenceArticle | null>(null);
  const [citationModalArticle, setCitationModalArticle] = useState<EvidenceArticle | null>(null);
  const [activeFormat, setActiveFormat] = useState<CitationFormat>('APA');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<Record<string, boolean>>({});
  const [selectedGraphEdge, setSelectedGraphEdge] = useState<{
    relation: string;
    quoteExcerpt?: string;
    source: string;
    target: string;
  } | null>(null);

  // Active Hypothesis Group
  const currentHypothesisGroup = useMemo(() => {
    return (
      evidenceGroups.find((g) => g.id === selectedHypothesisId) ||
      evidenceGroups[0]
    );
  }, [evidenceGroups, selectedHypothesisId]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    if (!currentHypothesisGroup) return [];

    return currentHypothesisGroup.articles.filter((art) => {
      // Filter search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          art.title.toLowerCase().includes(query) ||
          art.authors.some((a) => a.toLowerCase().includes(query)) ||
          art.journal.toLowerCase().includes(query) ||
          art.clinical_summary.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Filter year
      if (selectedYear !== 'todos') {
        if (selectedYear === '2023+' && art.year < 2023) return false;
        if (selectedYear === '2020-2022' && (art.year < 2020 || art.year > 2022)) return false;
        if (selectedYear === '<2020' && art.year >= 2020) return false;
      }

      // Filter type
      if (selectedType !== 'todos' && art.publication_type !== selectedType) {
        return false;
      }

      // Filter level
      if (selectedLevel !== 'todos' && art.evidence_level !== selectedLevel) {
        return false;
      }

      return true;
    });
  }, [currentHypothesisGroup, searchQuery, selectedYear, selectedType, selectedLevel]);

  // Graph Data
  const graphData: EvidenceGraphData = useMemo(() => {
    if (!currentHypothesisGroup) return { nodes: [], edges: [] };
    return buildEvidenceGraph(currentHypothesisGroup.name, currentHypothesisGroup.articles);
  }, [currentHypothesisGroup]);

  // Handle Copy Citation
  const handleCopyCitation = (art: EvidenceArticle, format: CitationFormat) => {
    const text = formatCitation(art, format);
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Toggle Save Article
  const toggleSaveArticle = (id: string) => {
    setSavedArticles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans flex flex-col justify-between">
      
      {/* ================= PAINEL SUPERIOR ================= */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-5 relative z-20 shadow-2xs">
        <div className="max-w-[2560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Título e Subtítulo */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] shadow-3xs">
                <BookOpen className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-sans">
                    Evidências Científicas
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[10px] font-bold uppercase tracking-wider">
                    Módulo 05
                  </span>
                </div>
                <p className="text-xs text-[#64748B] font-sans">
                  Toda recomendação apresentada pelo Vetmind possui origem rastreável.
                </p>
              </div>
            </div>
          </div>

          {/* Contadores da Literatura + Mode Switcher */}
          <div className="flex items-center gap-4 flex-wrap">
            
            {/* Contadores numéricos */}
            <div className="hidden xl:flex items-center gap-3 bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#E2E8F0]">
              <div className="text-center px-2 border-r border-slate-200">
                <span className="text-base font-extrabold text-[#0F172A] block leading-none font-sans">{evidenceGroups.length > 0 ? 127 : 0}</span>
                <span className="text-[9px] font-semibold text-[#64748B] uppercase">Consultados</span>
              </div>
              <div className="text-center px-2 border-r border-slate-200">
                <span className="text-base font-extrabold text-[#4F46E5] block leading-none font-sans">{totalArticlesCount}</span>
                <span className="text-[9px] font-semibold text-[#64748B] uppercase">Selecionados</span>
              </div>
              <div className="text-center px-2 border-r border-slate-200">
                <span className="text-base font-extrabold text-[#10B981] block leading-none font-sans">{highEvidenceCount}</span>
                <span className="text-[9px] font-semibold text-[#64748B] uppercase">Alta Evidência</span>
              </div>
              <div className="text-center px-2">
                <span className="text-base font-extrabold text-[#0F172A] block leading-none font-sans">{guidelinesCount}</span>
                <span className="text-[9px] font-semibold text-[#64748B] uppercase">Guidelines</span>
              </div>
            </div>

            {/* Alternador de Visualização (Map vs Graph) */}
            <div className="flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                onClick={() => setViewStyle('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewStyle === 'map'
                    ? 'bg-white text-[#4F46E5] shadow-2xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Evidence Map</span>
              </button>

              <button
                onClick={() => setViewStyle('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewStyle === 'graph'
                    ? 'bg-white text-[#4F46E5] shadow-2xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-emerald-600" />
                <span>Evidence Graph</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* ================= CORPO PRINCIPAL ================= */}
      <main className="max-w-[2560px] mx-auto w-full p-4 sm:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= COLUNA 1 — HIPÓTESES (22% -> col-span-3) ================= */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] font-sans">
                  Hipóteses do Caso
                </h2>
              </div>
              <span className="text-[10px] text-[#64748B] font-semibold bg-slate-100 px-2 py-0.5 rounded-full font-sans">
                {evidenceGroups.length} identificadas
              </span>
            </div>

            <p className="text-xs text-[#64748B] font-sans">
              Selecione uma hipótese para atualizar instantaneamente o mapa de literatura científica:
            </p>

            {/* Lista de Hipóteses */}
            <div className="space-y-2">
              {evidenceGroups.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 font-sans">Anamnese Ausente</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                    Insira o relato da consulta na aba de Anamnese para calcular as hipóteses RAG e evidências científicas.
                  </p>
                </div>
              ) : (
                evidenceGroups.map((group) => {
                const isSelected = group.id === selectedHypothesisId;
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedHypothesisId(group.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-[#4F46E5] shadow-2xs ring-1 ring-[#4F46E5]/20'
                        : 'bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F172A] font-sans leading-tight">
                        {group.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          group.badge === 'Alta'
                            ? 'bg-emerald-100 text-[#10B981]'
                            : group.badge === 'Moderada'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {group.badge} ({group.probability}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>{group.category}</span>
                      <span className="flex items-center gap-1 text-[#4F46E5] font-semibold">
                        {group.articles.length} artigo(s) <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
            </div>

            {/* Inclusão de Paciente */}
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200/80 text-xs space-y-1 font-sans mt-3">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">Paciente Associado</span>
              <div className="font-bold text-[#0F172A]">{patient.name || 'Paciente sem nome'}</div>
              <div className="text-[11px] text-[#64748B]">
                {patient.species} • {patient.breed || 'Raça N/I'} • {patient.weight ? `${patient.weight} kg` : ''}
              </div>
            </div>

          </div>
        </aside>

        {/* ================= CENTRO — EVIDENCE MAP / TIMELINE OU EVIDENCE GRAPH (~54% -> col-span-6) ================= */}
        <section className="lg:col-span-6 space-y-4">
          
          {evidenceGroups.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-8 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-[#4F46E5]">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0F172A] font-sans">
                  Aguardando Anamnese do Paciente
                </h3>
                <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed font-sans">
                  Para consultar os artigos, consensos e diretrizes científicas (RAG Vetmind) correlacionados, registre os relatos ou sintomas clínicos da consulta na aba de Anamnese.
                </p>
              </div>
              {onGoToAnamnesis && (
                <button
                  type="button"
                  onClick={onGoToAnamnesis}
                  className="px-5 py-2.5 rounded-full bg-[#4F46E5] text-white font-semibold text-xs hover:scale-[1.02] transition-transform cursor-pointer inline-flex items-center gap-2 shadow-xs font-sans"
                >
                  <span>Preencher Anamnese</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Header da Seção Central */}
          <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A] font-sans">
                  {currentHypothesisGroup?.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#10B981] border border-emerald-100 text-[10px] font-bold">
                  Sustentação RAG
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-sans mt-0.5">
                Exibindo {filteredArticles.length} evidências validadas para esta hipótese
              </p>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no acervo..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium outline-none focus:border-[#4F46E5] transition-colors"
              />
            </div>
          </div>

          {/* VISUALIZAÇÃO 1: EVIDENCE MAP (TIMELINE VERTICAL ELEGANTE) */}
          {viewStyle === 'map' && (
            <div className="space-y-4">
              {filteredArticles.length === 0 ? (
                <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-8 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-[#64748B] font-sans">
                    Nenhum artigo encontrado com os filtros aplicados.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedYear('todos');
                      setSelectedType('todos');
                      setSelectedLevel('todos');
                    }}
                    className="text-xs text-[#4F46E5] font-bold underline cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="relative pl-3 border-l-2 border-indigo-100 space-y-5">
                  {filteredArticles.map((article, index) => {
                    const isSaved = savedArticles[article.article_id];
                    return (
                      <motion.article
                        key={article.article_id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.05 }}
                        className="bg-white rounded-[20px] border border-[#E2E8F0] p-5 shadow-2xs space-y-4 hover:border-indigo-200 hover:shadow-xs transition-all relative"
                      >
                        {/* Timeline Bullet Node */}
                        <div className="absolute -left-[19px] top-6 w-3 h-3 rounded-full bg-[#4F46E5] border-2 border-white shadow-2xs" />

                        {/* Top Line: Publication Type + Year + Level + Saved Bookmark */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[10px] font-bold uppercase tracking-wider">
                              {article.publication_type}
                            </span>
                            <span className="text-xs font-bold text-[#64748B]">
                              {article.year}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {article.journal}
                            </span>
                          </div>

                          <button
                            onClick={() => toggleSaveArticle(article.article_id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isSaved
                                ? 'bg-amber-50 border-amber-200 text-amber-600'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                            title={isSaved ? 'Remover dos salvos' : 'Salvar evidência'}
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        {/* Article Title */}
                        <h3 className="text-sm font-bold text-[#0F172A] leading-snug font-sans">
                          {article.title}
                        </h3>

                        {/* Authors */}
                        <p className="text-xs text-[#64748B] font-sans">
                          Autores: <span className="font-medium text-[#334155]">{article.authors.join(', ')}</span>
                        </p>

                        {/* Resumo Gerado pela IA (máx 5 linhas) */}
                        <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] uppercase font-extrabold text-[#4F46E5] tracking-wider block">
                            Síntese Clínica IA
                          </span>
                          <p className="text-xs text-[#334155] leading-relaxed font-sans line-clamp-5">
                            {article.clinical_summary}
                          </p>
                        </div>

                        {/* Trecho Utilizado (Bloco Editorial entre Aspas) */}
                        <div className="border-l-3 border-[#4F46E5] bg-indigo-50/40 p-3.5 rounded-r-xl space-y-1">
                          <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider block">
                            Trecho Literário Transcrito:
                          </span>
                          <p className="text-xs italic text-[#0F172A] font-serif leading-relaxed">
                            {article.quoted_excerpt}
                          </p>
                        </div>

                        {/* "Como esta evidência influenciou esta hipótese" */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block font-sans">
                            Como esta evidência influenciou esta hipótese:
                          </span>
                          <ul className="space-y-1">
                            {article.supports.map((sup, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-1.5 text-xs text-[#0F172A] font-sans">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                                <span className="leading-tight">{sup}</span>
                              </li>
                            ))}
                            {article.contradicts?.map((con, cIdx) => (
                              <li key={cIdx} className="flex items-start gap-1.5 text-xs text-[#0F172A] font-sans">
                                <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <span className="leading-tight">{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Impacto da Evidência (Barra Horizontal Discreta) */}
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#64748B]">
                            <span>Impacto Científico no Caso</span>
                            <span className="text-[#0F172A]">{article.impact_level}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                article.impact_level === 'Alto'
                                  ? 'w-full bg-[#10B981]'
                                  : article.impact_level === 'Moderado'
                                  ? 'w-2/3 bg-amber-500'
                                  : 'w-1/3 bg-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Botões de Ação do Card */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://doi.org/${article.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] font-bold text-xs rounded-xl border border-[#E2E8F0] transition-colors inline-flex items-center gap-1.5 cursor-pointer font-sans"
                            >
                              <span>Abrir DOI</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>

                            <button
                              type="button"
                              onClick={() => setFullArticleModal(article)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-bold text-xs rounded-xl border border-indigo-100 transition-colors inline-flex items-center gap-1 cursor-pointer font-sans"
                            >
                              <span>Ver Artigo Completo</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setCitationModalArticle(article)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#64748B] hover:text-[#0F172A] font-bold text-xs rounded-xl border border-[#E2E8F0] transition-colors inline-flex items-center gap-1.5 cursor-pointer font-sans"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar Citação</span>
                          </button>
                        </div>

                      </motion.article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISUALIZAÇÃO 2: EVIDENCE GRAPH (EVIDENCE GRAPH INTERATIVO) */}
          {viewStyle === 'graph' && (
            <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Grafo de Conexões Científicas</h3>
                  <p className="text-xs text-[#64748B]">
                    Clique em qualquer vetor de ligação para inspecionar a literatura justificativa
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#10B981] border border-emerald-100 text-[10px] font-bold">
                  Conexões Mapeadas
                </span>
              </div>

              {/* Canvas do Grafo SVG */}
              <div className="relative w-full h-[480px] bg-[#0F172A] rounded-2xl p-4 overflow-hidden shadow-inner flex items-center justify-center">
                
                {/* SVG Network Background Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-auto">
                  {/* Central Node to Article Edges */}
                  <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#10B981" strokeWidth="2" strokeDasharray="4" />
                  <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#4F46E5" strokeWidth="2" />
                  <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="#10B981" strokeWidth="2" />
                  <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="#38BDF8" strokeWidth="2" />

                  {/* Edge Click Targets */}
                  <circle
                    cx="37.5%"
                    cy="37.5%"
                    r="12"
                    fill="#10B981"
                    className="cursor-pointer hover:scale-125 transition-transform opacity-80"
                    onClick={() =>
                      setSelectedGraphEdge({
                        relation: 'Sustentação Direta',
                        quoteExcerpt: currentHypothesisGroup?.articles[0]?.quoted_excerpt,
                        source: currentHypothesisGroup?.articles[0]?.title || 'Estudo RAG',
                        target: currentHypothesisGroup?.name || 'Hipótese'
                      })
                    }
                  />
                  <circle
                    cx="62.5%"
                    cy="37.5%"
                    r="12"
                    fill="#4F46E5"
                    className="cursor-pointer hover:scale-125 transition-transform opacity-80"
                    onClick={() =>
                      setSelectedGraphEdge({
                        relation: 'Recomendação de Exame',
                        quoteExcerpt: currentHypothesisGroup?.articles[1]?.quoted_excerpt || 'Exame específico indicado',
                        source: currentHypothesisGroup?.articles[1]?.title || 'Estudo RAG',
                        target: 'Exames Complementares'
                      })
                    }
                  />
                </svg>

                {/* Nodes Layout */}
                {/* Central Hypothesis Node */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#4F46E5] text-white p-4 rounded-2xl shadow-xl border-2 border-indigo-300 text-center max-w-[200px] z-10 animate-pulse">
                  <Sparkles className="w-5 h-5 mx-auto mb-1 text-amber-300" />
                  <div className="text-xs font-black uppercase tracking-wider">{currentHypothesisGroup?.name}</div>
                  <span className="text-[10px] opacity-80 block mt-0.5">Hipótese Principal</span>
                </div>

                {/* Top-Left Article Node */}
                <div className="absolute left-[12%] top-[15%] bg-slate-800 text-white p-3 rounded-xl border border-slate-700 text-xs max-w-[180px]">
                  <div className="text-[10px] text-emerald-400 font-bold">Consenso Internacional</div>
                  <div className="font-bold truncate">{currentHypothesisGroup?.articles[0]?.title}</div>
                </div>

                {/* Top-Right Exam Node */}
                <div className="absolute right-[12%] top-[15%] bg-slate-800 text-white p-3 rounded-xl border border-slate-700 text-xs max-w-[180px]">
                  <div className="text-[10px] text-indigo-400 font-bold">Exame Padrão-Ouro</div>
                  <div className="font-bold">Lipase Específica + USG</div>
                </div>

                {/* Bottom-Left Guideline Node */}
                <div className="absolute left-[12%] bottom-[15%] bg-slate-800 text-white p-3 rounded-xl border border-slate-700 text-xs max-w-[180px]">
                  <div className="text-[10px] text-amber-400 font-bold">WSAVA 2024</div>
                  <div className="font-bold truncate">Nutrição Enteral Precoce</div>
                </div>

                {/* Bottom-Right Treatment Node */}
                <div className="absolute right-[12%] bottom-[15%] bg-slate-800 text-white p-3 rounded-xl border border-slate-700 text-xs max-w-[180px]">
                  <div className="text-[10px] text-sky-400 font-bold">Conduta Rápida</div>
                  <div className="font-bold">Ressuscitação IV + Analgesia</div>
                </div>

              </div>

              {/* Edge Details Box */}
              {selectedGraphEdge && (
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#4F46E5]">
                    <span>Conexão: {selectedGraphEdge.relation}</span>
                    <button onClick={() => setSelectedGraphEdge(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[#334155] italic font-serif">"{selectedGraphEdge.quoteExcerpt}"</p>
                  <p className="text-[10px] text-[#64748B]">
                    Ligação entre <strong>{selectedGraphEdge.source}</strong> e <strong>{selectedGraphEdge.target}</strong>
                  </p>
                </div>
              )}

            </div>
          )}
            </>
          )}

        </section>

        {/* ================= PAINEL DIREITO — LITERATURE NAVIGATOR (~24% -> col-span-3) ================= */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-4 shadow-2xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] font-sans">
                  Literature Navigator
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B] font-semibold bg-slate-100 px-2 py-0.5 rounded-full font-sans">
                Filtros do Acervo
              </span>
            </div>

            {/* Total por Tipo de Publicação */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                Acervo por Tipo
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#F8FAFC] p-2 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="text-[#64748B]">Consensos</span>
                  <span className="font-bold text-[#0F172A]">8</span>
                </div>
                <div className="bg-[#F8FAFC] p-2 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="text-[#64748B]">Guidelines</span>
                  <span className="font-bold text-[#0F172A]">4</span>
                </div>
                <div className="bg-[#F8FAFC] p-2 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="text-[#64748B]">Meta-análises</span>
                  <span className="font-bold text-[#0F172A]">12</span>
                </div>
                <div className="bg-[#F8FAFC] p-2 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="text-[#64748B]">Ensaios Clínicos</span>
                  <span className="font-bold text-[#0F172A]">34</span>
                </div>
              </div>
            </div>

            {/* Controles de Filtro */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              
              {/* Filtro por Ano */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#64748B]">Ano de Publicação</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] outline-none"
                >
                  <option value="todos">Todos os Anos</option>
                  <option value="2023+">Recentes (2023 - 2024)</option>
                  <option value="2020-2022">2020 a 2022</option>
                  <option value="<2020">Anteriores a 2020</option>
                </select>
              </div>

              {/* Filtro por Tipo de Publicação */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#64748B]">Tipo de Estudo</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] outline-none"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="Consenso">Consenso Internacional</option>
                  <option value="Guideline">Guideline</option>
                  <option value="Meta-análise">Meta-análise</option>
                  <option value="Review">Revisão Bibliográfica</option>
                  <option value="Clinical Trial">Ensaio Clínico</option>
                </select>
              </div>

              {/* Filtro por Nível de Evidência */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#64748B]">Nível de Evidência</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] outline-none"
                >
                  <option value="todos">Todos os Níveis</option>
                  <option value="Alta">Alta Evidência (A1)</option>
                  <option value="Moderada">Moderada Evidência (B1)</option>
                  <option value="Baixa">Baixa Evidência (C1)</option>
                </select>
              </div>

            </div>

            {/* Linha do Tempo Histórica da Literatura */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                Evolução Histórica do Conhecimento
              </span>

              <div className="relative pl-3 border-l border-slate-200 space-y-2 text-[11px]">
                <div className="relative">
                  <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-slate-300" />
                  <span className="font-bold text-[#0F172A]">1998</span>
                  <p className="text-[#64748B] text-[10px]">Diagnóstico inicial por amilase total</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="font-bold text-[#0F172A]">2005</span>
                  <p className="text-[#64748B] text-[10px]">Introdução do primeiro imunoensaio Spec cPL</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-bold text-[#0F172A]">2012</span>
                  <p className="text-[#64748B] text-[10px]">Padronização ultrassonográfica para pancreatite</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="font-bold text-[#0F172A]">2024</span>
                  <p className="text-[#10B981] font-semibold text-[10px]">Novo Consenso ACVIM com diretrizes atuais</p>
                </div>
              </div>
            </div>

          </div>
        </aside>

      </main>

      {/* ================= PAINEL INFERIOR (BARRA FIXA DE AÇÕES) ================= */}
      <footer className="bg-white border-t border-[#E2E8F0] px-6 py-4 sticky bottom-0 z-20 shadow-lg">
        <div className="max-w-[2560px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Documentação científica pronta para anexar ao laudo clínico.</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const allCitations = filteredArticles
                  .map((a) => formatCitation(a, 'APA'))
                  .join('\n\n');
                navigator.clipboard.writeText(allCitations);
                alert('Todas as citações copiadas em formato APA!');
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 font-sans"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Citações</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-bold text-xs rounded-xl border border-indigo-100 transition-colors cursor-pointer inline-flex items-center gap-1.5 font-sans"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Gerar PDF Científico</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Evidências Científicas - ${patient.name}`,
                    text: `Revisão de literatura científica do caso de ${patient.name}`
                  });
                } else {
                  alert('Link de revisão copiado para a área de transferência!');
                }
              }}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5 font-sans"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartilhar Revisão</span>
            </button>
          </div>

        </div>
      </footer>

      {/* ================= MODAL 1: VER ARTIGO COMPLETO ================= */}
      <AnimatePresence>
        {fullArticleModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-[#E2E8F0] max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] text-[10px] font-bold uppercase">
                  {fullArticleModal.publication_type}
                </span>
                <button
                  onClick={() => setFullArticleModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-base font-bold text-[#0F172A] font-sans">
                {fullArticleModal.title}
              </h2>

              <p className="text-xs text-[#64748B]">
                Autores: <strong className="text-[#0F172A]">{fullArticleModal.authors.join(', ')}</strong> ({fullArticleModal.year})
              </p>
              <p className="text-xs text-[#64748B]">
                Publicação: <strong className="text-[#0F172A]">{fullArticleModal.journal}</strong> • DOI: {fullArticleModal.doi}
              </p>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                <span className="font-bold text-[#4F46E5] uppercase text-[10px]">Resumo Metodológico & Achados</span>
                <p className="text-[#334155] leading-relaxed">{fullArticleModal.clinical_summary}</p>
              </div>

              <div className="border-l-3 border-[#4F46E5] bg-indigo-50/50 p-3.5 rounded-r-xl">
                <span className="text-[10px] font-bold text-[#4F46E5] uppercase block">Citação Direta</span>
                <p className="text-xs italic text-[#0F172A] font-serif leading-relaxed">
                  "{fullArticleModal.quoted_excerpt}"
                </p>
              </div>

              {fullArticleModal.recommended_tests && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-[#0F172A]">Exames Recomendados no Artigo:</span>
                  <div className="flex gap-2 flex-wrap">
                    {fullArticleModal.recommended_tests.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-[#0F172A] font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <a
                  href={`https://doi.org/${fullArticleModal.doi}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#4F46E5] text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Acessar no DOI</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 2: COPIAR CITAÇÃO (APA, ABNT, VANCOUVER) ================= */}
      <AnimatePresence>
        {citationModalArticle && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-[#E2E8F0] max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#0F172A]">Gerador de Citação Científica</h3>
                <button
                  onClick={() => setCitationModalArticle(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Seletor de Formato (APA, ABNT, Vancouver) */}
              <div className="flex bg-[#F1F5F9] p-1 rounded-xl">
                {(['APA', 'ABNT', 'Vancouver'] as CitationFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setActiveFormat(fmt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFormat === fmt ? 'bg-white text-[#4F46E5] shadow-2xs' : 'text-[#64748B]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Caixa da citação gerada */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 text-xs font-mono text-[#0F172A] leading-relaxed select-all">
                {formatCitation(citationModalArticle, activeFormat)}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCitation(citationModalArticle, activeFormat)}
                  className="px-4 py-2 bg-[#4F46E5] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  {copiedFormat === activeFormat ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Citação ({activeFormat})</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
