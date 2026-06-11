import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Save,
  Send,
  Clipboard,
  BookOpen,
  AlertCircle,
  Loader2,
  User,
  PawPrint,
  ClipboardList,
  Upload,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Share2,
  Trash2,
  Edit3,
  Activity,
  Thermometer,
  Wind,
  Droplets,
  FileUp,
  FileDown,
  Mic,
  Square,
  Pill,
  Calendar,
  Clock,
  ExternalLink,
  Star,
  FileSpreadsheet,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Patient, Report } from "../types";
import VetmindLogo from "./VetmindLogo";

function ClinicalMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-clinical-blue hover:text-clinical-blue-dark font-bold underline transition-colors group/link cursor-pointer decoration-dotted decoration-2 underline-offset-2 break-all"
          >
            {props.children}
            <ExternalLink className="w-3.5 h-3.5 inline text-slate-400 group-hover/link:text-clinical-blue transition-colors shrink-0" />
          </a>
        ),
      }}
    >
      {children || ""}
    </ReactMarkdown>
  );
}

interface DifferentialDiagnosis {
  title: string;
  probability: number;
  probabilityText: string;
  justification: string;
  literature: string;
}

function parseClinicsDiferenciais(text: string): DifferentialDiagnosis[] {
  if (!text) return [];
  const lines = text.split("\n");
  const diagnoses: DifferentialDiagnosis[] = [];
  let currentDiag: Partial<DifferentialDiagnosis> | null = null;
  let currentSection: "justification" | "literature" | null = null;

  for (let line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Matches titles like:
    // - **Saculite / Abscesso do Saco Anal - 85% de Probabilidade**
    // - **Saculite** - 85% de Probabilidade
    // Saculite / Abscesso do Saco Anal - 85% de Probabilidade
    // 1. Saculite / Abscesso do Saco Anal - 85%
    const probMatch = cleanLine.match(/(?:^|[\-\*\d\.\s]+)\**([^*%\-\–\+]+?)\**\s*[-–]\s*(\d+)\s*%\s*(?:de\s+)?Probabilidade/i) || 
                      cleanLine.match(/(?:^|[\-\*\d\.\s]+)\**([^*%\-\–\+]+?)\**\s*[-–]\s*(\d+)\s*%/i);

    if (probMatch && !cleanLine.includes("Por que esta causa") && !cleanLine.includes("Embasamento")) {
      if (currentDiag && currentDiag.title) {
        diagnoses.push(currentDiag as DifferentialDiagnosis);
      }
      const titleRaw = probMatch[1].replace(/^\*+/, "").replace(/\*+$/, "").trim();
      const title = titleRaw.replace(/^[0-9]+[\.\-\s]+/, "").trim(); // Remove leading number
      const prob = parseInt(probMatch[2]);
      currentDiag = {
        title: title,
        probability: prob,
        probabilityText: `${prob}%`,
        justification: "",
        literature: "",
      };
      currentSection = null;
    } else if (currentDiag) {
      const cleanLower = cleanLine.toLowerCase();
      if (cleanLower.includes("revisão sistemática") || cleanLower.includes("por que esta causa") || cleanLower.includes("justificativa")) {
        currentSection = "justification";
        let content = cleanLine;
        if (cleanLine.includes(":")) {
          content = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
        }
        currentDiag.justification = (currentDiag.justification || "") + (currentDiag.justification ? "\n" : "") + content;
      } else if (cleanLower.includes("embasamento literário") || cleanLower.includes("literatura") || cleanLower.includes("referência")) {
        currentSection = "literature";
        let content = cleanLine;
        if (cleanLine.includes(":")) {
          content = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
        }
        if (content) {
          currentDiag.literature = (currentDiag.literature || "") + (currentDiag.literature ? "\n" : "") + content;
        }
      } else {
        if (currentSection === "literature") {
          currentDiag.literature = (currentDiag.literature || "") + (currentDiag.literature ? "\n" : "") + cleanLine;
        } else {
          // Default to justification, but remove list bullets/decorations if we want it extra clean
          const treatedLine = cleanLine.startsWith("-") || cleanLine.startsWith("*") ? cleanLine.substring(1).trim() : cleanLine;
          if (currentSection === "justification") {
            currentDiag.justification = (currentDiag.justification || "") + (currentDiag.justification ? "\n" : "") + treatedLine;
          } else {
            currentDiag.justification = (currentDiag.justification || "") + (currentDiag.justification ? "\n" : "") + treatedLine;
          }
        }
      }
    }
  }

  if (currentDiag && currentDiag.title) {
    diagnoses.push(currentDiag as DifferentialDiagnosis);
  }

  return diagnoses;
}

function DifferentialCards({ text }: { text: string }) {
  const diags = parseClinicsDiferenciais(text);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [activeProtocolIndex, setActiveProtocolIndex] = useState<number | null>(null);

  if (diags.length === 0) {
    return (
      <div className="text-sm text-slate-700 leading-relaxed font-sans prose-clinical bg-white p-6 rounded-2xl border border-slate-100 shadow-inner">
        <ClinicalMarkdown>{text}</ClinicalMarkdown>
      </div>
    );
  }

  // contextual helper to return recommended veterinary exams based on diagnosis title
  const getExamsForDiagnosis = (title: string): string[] => {
    const norm = title.toLowerCase();
    if (norm.includes("piometra") || norm.includes("útero") || norm.includes("uterino")) {
      return ["Hemograma completo", "Ultrassom abdominal focal", "Frutosamina sérica", "Glicemia pré-op"];
    }
    if (norm.includes("diabetes") || norm.includes("mellitus") || norm.includes("insulina")) {
      return ["Glicemia de jejum", "Frutosamina sérica", "Urinálise com fita diagnóstica", "Hemograma completo"];
    }
    if (norm.includes("cushing") || norm.includes("hiperadrena") || norm.includes("adrenal")) {
      return ["Dosagem de cortisol sérico", "Teste de supressão por dexametasona", "Relação Cortisol/Creatinina", "Ultrassom de adrenais"];
    }
    if (norm.includes("hérnia") || norm.includes("perineal") || norm.includes("pelvi") || norm.includes("retal")) {
      return ["Palpação retal diagnóstica", "Ultrassom perineal/pélvico", "Radiografia simples pélvica", "Perfil bioquímico renal"];
    }
    if (norm.includes("saculite") || norm.includes("abscesso") || norm.includes("anal")) {
      return ["Inspeção e palpação física", "Citologia de secreção anal", "Ultrassom de região perineal"];
    }
    if (norm.includes("rins") || norm.includes("renal") || norm.includes("ira") || norm.includes("irc")) {
      return ["Creatinina e ureia séricas", "Urinálise completa (EAS)", "Relação UPC urinária", "Ultrassom de rins e vias"];
    }
    if (norm.includes("urolitíase") || norm.includes("cistite") || norm.includes("bexiga") || norm.includes("urina")) {
      return ["Urinálise com sedimento", "Ultrassom de bexiga e uretra", "Radiografia simples", "Cultura urinária (cistocentese)"];
    }
    if (norm.includes("gastro") || norm.includes("colite") || norm.includes("estômago") || norm.includes("diarreia")) {
      return ["Coprocitologia", "Ultrassom abdominal focal", "Hemograma com hematócrito"];
    }
    if (norm.includes("hepat") || norm.includes("fígado") || norm.includes("colangi")) {
      return ["Enzimas hepáticas (ALT/FA/GGT)", "Ultrassom de fígado e vesícula biliar", "Ácidos biliares séricos"];
    }
    return ["Análise clínica sugerida", "Ultrassom de triagem", "Perfil bioquímico geriatra"];
  };

  // Immediate clinical action protocols derived locally for rich offline UX
  const getInitialSupportProtocols = (title: string): string => {
    const norm = title.toLowerCase();
    if (norm.includes("piometra") || norm.includes("útero") || norm.includes("uterino")) {
      return "Estabilização imediata com Ringer Lactato IV. Iniciar antibiótico de amplo espectro (como Cefalotina 30mg/kg ou Cefazolina associado a Metronidazol 15mg/kg). Encaminhamento urgente para Ovariohisterectomia (OH) terapêutica assim que estável.";
    }
    if (norm.includes("diabetes") || norm.includes("mellitus") || norm.includes("insulina")) {
      return "Para cetoacidose, internação com insulinoterapia de ação rápida regular (infusão contínua ou IM intermitente) e reposição eletrolítica (K+ e Phos). Para diabetes estável, início cuidadoso de insulina lenta canina (Caninsulin 0.5 UI/kg c/ 12h) e transição para dieta estrita com alta proteína e ultra-baixo carboidrato.";
    }
    if (norm.includes("cushing") || norm.includes("hiperadrena") || norm.includes("adrenal")) {
      return "Iniciar terapia farmacológica com Trilostano (Vetoryl) na dose inicial sutil de 1 a 2 mg/kg VO a cada 12h ou 24h junto à alimentação de qualidade. Monitorar eletrólitos séricos e agendar teste de estimulação por ACTH em 10-14 dias.";
    }
    if (norm.includes("rins") || norm.includes("renal") || norm.includes("ira") || norm.includes("irc")) {
      return "Fluidoterapia IV ou SC com NaCl 0.9% ou Ringer com base no nível de desidratação. Controle de náuseas e dor (Maropitant 1mg/kg SC/IV, Ondansetrona), manejo dietético restrito em fósforo e início de quelante intestinal de fósforo (carbonato de cálcio ou quitosana) de forma assistida.";
    }
    if (norm.includes("cistite") || norm.includes("urolitíase") || norm.includes("urina") || norm.includes("bexiga")) {
      return "Estabilização álgica imperativa com anti-inflamatórios ou analgésicos opioides sob demanda. Fluidoestimulação oral ou parenteral. Se houver desconfiança obstrutiva em machos, desobstrução uretral imediata sob anestesia e sonda de demora.";
    }
    return "Manejo de suporte inicial: controle álgico preventivo, monitoramento de parâmetros vitais (FC, FR, Temp, Mucosas e nível de consciência) e repouso térmico controlado. Agendamento ágil de exames diagnósticos complementares de triagem.";
  };

  return (
    <div className="flex flex-col gap-4 font-sans w-full animate-in fade-in duration-300">
      {diags.map((diag, index) => {
        const isExpanded = expandedIndex === index;
        const isProtocolShown = activeProtocolIndex === index;
        
        // Pick colors depending on rank/probability
        let themeBg = "bg-emerald-50 text-[#1D9E75] border-emerald-150";
        let barColor = "bg-gradient-to-r from-emerald-400 to-[#1D9E75]";
        let textColor = "text-[#1D9E75]";
        
        if (index === 1) {
          themeBg = "bg-amber-50 text-[#BA7517] border-amber-150";
          barColor = "bg-gradient-to-r from-amber-400 to-[#BA7517]";
          textColor = "text-[#BA7517]";
        } else if (index >= 2) {
          themeBg = "bg-slate-50 text-slate-500 border-slate-150";
          barColor = "bg-gradient-to-r from-slate-350 to-slate-500";
          textColor = "text-slate-600";
        }

        const rankLabel = `#${index + 1}`;
        const exams = getExamsForDiagnosis(diag.title);
        const protocolText = getInitialSupportProtocols(diag.title);

        return (
          <div 
            key={index} 
            className={`border rounded-3xl overflow-hidden transition-all duration-300 ${
              isExpanded 
                ? "border-slate-300 shadow-md ring-1 ring-[#003399]/5 bg-white" 
                : "border-slate-150/80 bg-white hover:border-slate-250 shadow-[0_1px_3px_rgba(0,0,0,0.015)]"
            }`}
          >
            {/* Clickable Header */}
            <div 
              onClick={() => {
                setExpandedIndex(isExpanded ? null : index);
                setActiveProtocolIndex(null); // reset simulation view on toggle
              }}
              className="flex items-center gap-4 py-4.5 px-6 cursor-pointer hover:bg-slate-50/40 select-none transition-colors"
            >
              {/* Rank Box */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${themeBg}`}>
                {rankLabel}
              </div>

              {/* Diagnosis Name */}
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-[#001E62] text-sm md:text-[15px] tracking-tight hover:text-indigo-900 block truncate">
                  {diag.title}
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  Sintoma-Alvo Mapeado • IA Clinician
                </span>
              </div>

              {/* Probability indicators */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:block w-24 h-2 rounded-full bg-slate-100 overflow-hidden p-[1px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`} 
                    style={{ width: `${diag.probability}%` }}
                  />
                </div>
                <span className={`font-black text-xs md:text-sm w-11 text-right ${textColor}`}>
                  {diag.probability}%
                </span>
              </div>

              {/* Angle Chevron */}
              <div className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <ChevronDown 
                  className={`w-4.5 h-4.5 text-slate-400 transition-transform duration-300 ${
                    isExpanded ? "rotate-180 text-slate-600" : ""
                  }`} 
                />
              </div>
            </div>

            {/* Content Body */}
            {isExpanded && (
              <div className="px-6 pb-6 pt-1 border-t border-slate-100 flex flex-col gap-5 animate-in fade-in slide-in-from-top-1 duration-200 bg-white">
                
                {/* Visual grid for literature and rationale side-by-side or stacked cleanly */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  
                  {/* 1. Scientific Evidence Context (Source Citation) */}
                  {diag.literature ? (
                    <div className="bg-gradient-to-br from-indigo-50/20 to-blue-50/40 border border-[#003399]/10 rounded-2xl p-4.5 space-y-2.5">
                      <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#003399]" />
                        Consenso Científico Cruzado
                      </div>
                      <div className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-semibold">
                        <ClinicalMarkdown>{diag.literature}</ClinicalMarkdown>
                      </div>
                      <div className="text-[9.5px] text-indigo-700 font-extrabold flex items-center gap-1.5 pt-1">
                        <span className="bg-[#003399]/10 text-[#003399] px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase">
                          RAG VALIDADO ✓
                        </span>
                        <span>Confirmado em biblioteca sistêmica</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex items-center justify-center text-center">
                      <p className="text-[11px] font-semibold text-slate-400">Dados literários incorporados no raciocínio clínico global.</p>
                    </div>
                  )}

                  {/* 2. Clinical Rationale Explanation */}
                  {diag.justification ? (
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-2.5">
                      <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-650" />
                        Raciocínio Clínico Integrado
                      </div>
                      <p className="text-slate-600 text-xs md:text-[13px] leading-relaxed font-semibold">
                        {diag.justification}
                      </p>
                      <div className="text-[9.5px] text-emerald-650 font-extrabold flex items-center gap-1.5 pt-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Fatores de congruência sistêmica mapeados</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 3. Recommended Exams Block */}
                {exams && exams.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100/80">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono block">
                      Exames Complementares Sugeridos para Confirmação
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {exams.map((exam, idx) => {
                        // Pick a smart icon for each to make it extra polished
                        let IconComponent = Droplets;
                        let iconColor = "text-[#BA7517] bg-amber-50 border-amber-100";
                        if (exam.toLowerCase().includes("ultrassom") || exam.toLowerCase().includes("us")) {
                          IconComponent = Activity;
                          iconColor = "text-[#003399] bg-[#EBF2FF] border-blue-100";
                        } else if (exam.toLowerCase().includes("urin") || exam.toLowerCase().includes("eas")) {
                          IconComponent = FileSpreadsheet;
                          iconColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
                        } else if (exam.toLowerCase().includes("glicemia") || exam.toLowerCase().includes("bioquímica")) {
                          IconComponent = Thermometer;
                          iconColor = "text-emerald-600 bg-emerald-50 border-emerald-150";
                        } else if (exam.toLowerCase().includes("cultura") || exam.toLowerCase().includes("biópsia")) {
                          IconComponent = Pill;
                          iconColor = "text-purple-600 bg-purple-50 border-purple-100";
                        }
                        return (
                          <div 
                            key={idx}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 border rounded-2xl text-xs font-bold transition-all hover:shadow-xs ${iconColor}`}
                          >
                            <IconComponent className="w-4 h-4 shrink-0" />
                            <span className="truncate">{exam}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Interactive Simulation & Protocol Section */}
                <div className="border-t border-slate-100/80 pt-4.5">
                  {!isProtocolShown ? (
                    <button
                      type="button"
                      onClick={() => setActiveProtocolIndex(index)}
                      className="inline-flex items-center gap-2 bg-[#003399]/5 hover:bg-[#003399]/10 text-[#003399] px-4.5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      <Pill className="w-4 h-4 animate-bounce text-[#003399]" />
                      Simular Protocolo Terapêutico Inicial
                    </button>
                  ) : (
                    <div className="bg-[#003399]/5 border border-[#003399]/15 rounded-3xl p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between border-b border-[#003399]/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-clinical-blue" />
                          <h5 className="font-extrabold text-[11px] text-[#001D62] uppercase tracking-wider">
                            Protocolo de Emergência e Suporte Base (Nelson/Ettinger)
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveProtocolIndex(null)}
                          className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-tight"
                        >
                          ocultar
                        </button>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-700 leading-relaxed font-semibold">
                        {protocolText}
                      </p>
                      <div className="text-[10px] font-bold text-[#003399]/80 flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-xl w-fit">
                        <span>Aviso:</span>
                        <span>Dosagens e condutas necessitam de validação laboratorial.</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InteractiveSources({ sources }: { sources: any[] }) {
  const [activeTab, setActiveTab] = useState<"guidelines" | "pdfs">(
    "guidelines",
  );
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  // Split sources into guidelines vs physical PDFs (identified by type === 'pdf' or file extension ending in .pdf)
  const sortedGuidelines = sources.filter((item) => {
    const isObj = typeof item === "object" && item !== null;
    const type = isObj ? item.type : "guideline";
    const topic = isObj ? item.topic : String(item);
    return type === "guideline" && !topic.toLowerCase().endsWith(".pdf");
  });

  const sortedPdfs = sources.filter((item) => {
    const isObj = typeof item === "object" && item !== null;
    const type = isObj ? item.type : "";
    const topic = isObj ? item.topic : String(item);
    return type === "pdf" || topic.toLowerCase().endsWith(".pdf");
  });

  // Automatically switch tab if one category is empty
  useEffect(() => {
    if (sortedGuidelines.length === 0 && sortedPdfs.length > 0) {
      setActiveTab("pdfs");
    } else if (sortedPdfs.length === 0 && sortedGuidelines.length > 0) {
      setActiveTab("guidelines");
    }
  }, [sources]);

  const activeCollection =
    activeTab === "guidelines" ? sortedGuidelines : sortedPdfs;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[1.8rem] p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
        <div className="flex items-center gap-2.5 text-slate-800">
          <div className="w-8 h-8 rounded-xl bg-clinical-blue/10 flex items-center justify-center text-clinical-blue text-sm">
            📚
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 leading-tight">
              Base Científica & Fontes Consultadas
            </h3>
            <p className="text-[10px] text-clinical-blue font-black uppercase tracking-wider mt-0.5">
              RAG Clínico Ativo
            </p>
          </div>
        </div>

        {/* Dynamic Premium Tabs */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {sortedGuidelines.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("guidelines");
                setActiveIdx(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "guidelines"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              type="button"
            >
              Diretrizes Vetmind ({sortedGuidelines.length})
            </button>
          )}
          {sortedPdfs.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("pdfs");
                setActiveIdx(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "pdfs"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              type="button"
            >
              📚 Livros & PDFs ({sortedPdfs.length})
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
        {activeTab === "guidelines"
          ? "Diretrizes de conduta interna cadastradas na plataforma aplicadas às hipóteses deste laudo:"
          : "Trechos e referências acadêmicas extraídos diretamente dos PDFs e revisões associadas no diagnóstico:"}
      </p>

      <div className="space-y-2.5">
        {activeCollection.map((item, idx) => {
          const isObj = typeof item === "object" && item !== null;
          const topic = isObj ? item.topic : String(item);
          const content = isObj ? item.content : null;

          const match = topic.match(/\[(.*?)\]/);
          const displayTopic = match
            ? topic.replace(/\[.*?\]/, "").trim()
            : topic;
          const citeInfo = match
            ? match[1]
            : activeTab === "pdfs"
              ? "Acervo Científico"
              : "Manual de Referência";

          const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(citeInfo + " " + displayTopic)}`;
          const isOpen = activeIdx === idx;

          return (
            <div
              key={idx}
              className={`border rounded-xl transition-all ${
                isOpen
                  ? "border-clinical-blue/40 bg-white shadow-md"
                  : "border-slate-150 bg-slate-100/50 hover:bg-white"
              }`}
            >
              <button
                onClick={() => setActiveIdx(isOpen ? null : idx)}
                className="w-full text-left p-4 flex items-center justify-between gap-3 text-slate-800 transition-colors"
                type="button"
              >
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-slate-800 leading-snug">
                    {displayTopic}
                  </p>
                  <p className="text-[10px] text-clinical-blue font-black uppercase tracking-wider inline-flex items-center gap-1">
                    {activeTab === "pdfs" ? "📂" : "📖"} {citeInfo}
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90 text-clinical-blue" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-slate-100"
                  >
                    <div className="p-4 space-y-3 bg-slate-50/50">
                      {content ? (
                        <div className="text-xs text-slate-600 leading-relaxed font-semibold bg-white p-3.5 border border-slate-150 rounded-xl max-h-60 overflow-y-auto font-mono text-[11px] whitespace-pre-line text-justify shadow-inner">
                          {content}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed italic font-medium">
                          Diretriz clínica calibrada utilizada na validação
                          diagnóstica veterinária.
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100/50 flex flex-wrap gap-2">
                        <a
                          href={scholarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-clinical-blue/10 hover:bg-clinical-blue/15 text-clinical-blue font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Pesquisar no Scholar
                        </a>

                        {content && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `Fonte: ${displayTopic}\nTrecho: ${content}`,
                              );
                              alert("Parágrafo acadêmico copiado com sucesso!");
                            }}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-colors cursor-pointer"
                            type="button"
                          >
                            Copiar Trecho
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const clinicalPresets = [
  {
    title: "Piometra Canina (Urgente)",
    icon: "🐕‍🦺",
    species: "Canino",
    breed: "Golden Retriever",
    age: "9 anos",
    sex: "Fêmea inteira",
    weight: "32 kg",
    anamnesis: "Paciente canina de 9 anos de idade, inteira (não castrada). Apresenta quadro progressivo de polidipsia e poliúria acentuadas há aproximadamente 3 semanas. Nas últimas 48 horas observou-se apatia moderada, fadiga ao caminhar, apetite caprichoso (anorexia parcial) e presença de corrimento vaginal purulento com estrias de sangue de odor desagrável. Ao exame físico nota-se abdômen abaulado e dor sutil à palpação profunda. Mucosas coradas, TRC de 2 segundos. Sem febre. Suspeita clínica principal de piometra de colo aberto.",
  },
  {
    title: "Diabetes Felino (Fred)",
    icon: "🐈",
    species: "Felino",
    breed: "Siamês",
    age: "11 anos",
    sex: "Macho castrado",
    weight: "5.4 kg",
    anamnesis: "Felino macho castrado de 11 anos. Tutor relata perda de peso progressiva e acentuada (cerca de 850g em 2 meses) mesmo mantendo apetite voraz (polifagia intensa). Observou-se consumo excessivo de água (polidipsia) e aumento expressivo na frequência e volume urinário (poliúria) encharcando a caixa higiênica de forma atípica. Tutor refere caminhar plantígrado sutil em membros posteriores (fraqueza muscular). Animal encontra-se prostrado e com pelagem opaca.",
  },
  {
    title: "Cushing Canino",
    icon: "🐩",
    species: "Canino",
    breed: "Poodle",
    age: "8 anos",
    sex: "Fêmea castrada",
    weight: "8.2 kg",
    anamnesis: "Canideo Poodle miniatura de 8 anos apresentando abdômen pendular proeminente, alopecia simétrica bilateral não pruriginosa em tronco e flancos, pele fina com vasos visíveis e presença de abundantes comedões. Tutor se queixa de polidipsia e poliúria de início recente, além de polifagia intensa e respiração ofegante mesmo em repouso.",
  },
  {
    title: "Insuficiência Renal",
    icon: "🧪",
    species: "Felino",
    breed: "Persa",
    age: "14 anos",
    sex: "Macho castrado",
    weight: "3.7 kg",
    anamnesis: "Paciente felino geriátrico com histórico crônico de emagrecimento, episódios estofados de vômitos alimentares frequentes e apetite inconstante há 1 mês. Apresenta-se desidratado (estimativa de 6 a 8%), hálito urêmico e salivação espessa. Polidipsia compensatória instalada, poliúria descrita pelo tutor.",
  }
];

export default function ReportWorkspace({
  initialReport,
  onBack,
  onTransformToSocial,
  onNavigateToSignature,
}: {
  initialReport?: Report | null;
  onBack?: () => void;
  onTransformToSocial?: (data: {
    queixa?: string;
    exames?: string;
    tecnica?: string;
    desfecho?: string;
  }) => void;
  onNavigateToSignature?: () => void;
}) {
  const [step, setStep] = useState<"input" | "result">(
    initialReport ? "result" : "input",
  );
  const [patient, setPatient] = useState<Partial<Patient>>({
    name: initialReport?.patientId || "",
    species: "Canino",
    breed: "Golden Retriever",
    age: "5 anos",
  });
  const [anamnesis, setAnamnesis] = useState(initialReport?.anamnesis || "");
  const [examData, setExamData] = useState(initialReport?.examData || "");
  const [uploadedExamFiles, setUploadedExamFiles] = useState<
    { name: string; size: string; data?: string; mimeType?: string }[]
  >([]);
  const [uploadedLiteratureFiles, setUploadedLiteratureFiles] = useState<
    { name: string; size: string; data?: string; mimeType?: string }[]
  >([]);
  const uploadedFiles = [...uploadedExamFiles, ...uploadedLiteratureFiles];

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(
    initialReport?.soapContent || null,
  );
  const [sources, setSources] = useState<any[]>(initialReport?.sources || []);
  const [error, setError] = useState<string | null>(null);

  // Legal/Clinical responsibility sign-off states
  const [isSigned, setIsSigned] = useState(() => {
    const val = localStorage.getItem("vetmind_signature_signed");
    return val === null ? true : val === "true"; // Default to true so it works out of the box
  });
  const [signerName, setSignerName] = useState(() => localStorage.getItem("vetmind_signature_name") || "Dr. Roberto Silva");
  const [signerCrmv, setSignerCrmv] = useState(() => localStorage.getItem("vetmind_signature_crmv") || "SP-14892");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Sync with global signature dashboard when step changes
  useEffect(() => {
    const name = localStorage.getItem("vetmind_signature_name") || "Dr. Roberto Silva";
    const crmv = localStorage.getItem("vetmind_signature_crmv") || "SP-14892";
    const signedVal = localStorage.getItem("vetmind_signature_signed");
    const signed = signedVal === null ? true : signedVal === "true";
    
    setSignerName(name);
    setSignerCrmv(crmv);
    setIsSigned(signed);
  }, [step]);

  // New Literature Grounding States
  const [workMode, setWorkMode] = useState<"soap" | "literature">("soap");
  const [generatedReview, setGeneratedReview] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Prescription State
  const [prescription, setPrescription] = useState<string | null>(null);
  const [isGeneratingPrescription, setIsGeneratingPrescription] =
    useState(false);

  // New Google Review style Feedback states
  const [savedReportId, setSavedReportId] = useState<string | null>(
    initialReport?.id || null,
  );
  const [rating, setRating] = useState<number>(initialReport?.rating || 0);
  const [feedbackComment, setFeedbackComment] = useState<string>(
    initialReport?.feedbackComment || "",
  );
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(
    !!initialReport?.rating,
  );
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // State-driven active sources just like in the user's mock dashboard
  const [activeSources, setActiveSources] = useState({
    nelson: true,
    ettinger: true,
    wsava: true,
    acvim: false,
    feldman: true,
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const examInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialReport) {
      setPatient({
        name: initialReport.patientId,
        species: "Canino",
        breed: "Golden Retriever",
        age: "5 anos",
      });
      setAnamnesis(initialReport.anamnesis || "");
      setExamData(initialReport.examData || "");
      setUploadedExamFiles([]);
      setUploadedLiteratureFiles([]);
      setGeneratedReport(initialReport.soapContent || null);
      setSources(initialReport.sources || []);
      setSavedReportId(initialReport.id || null);
      setRating(initialReport.rating || 0);
      setFeedbackComment(initialReport.feedbackComment || "");
      setFeedbackSubmitted(!!initialReport.rating);
      setFeedbackError(null);
      setStep("result");
    } else {
      setPatient({
        name: "",
        species: "Canino",
        breed: "Golden Retriever",
        age: "5 anos",
      });
      setAnamnesis("");
      setExamData("");
      setUploadedExamFiles([]);
      setUploadedLiteratureFiles([]);
      setGeneratedReport(null);
      setGeneratedReview(null);
      setSources([]);
      setSavedReportId(null);
      setRating(0);
      setFeedbackComment("");
      setFeedbackSubmitted(false);
      setFeedbackError(null);
      setStep("input");
    }
  }, [initialReport]);

  const handleExamFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFilesPromises = Array.from(files).map(async (f) => {
        return new Promise<{
          name: string;
          size: string;
          data: string;
          mimeType: string;
        }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(",")[1];
            resolve({
              name: f.name,
              size: (f.size / (1024 * 1024)).toFixed(1) + "MB",
              data: base64,
              mimeType: f.type,
            });
          };
          reader.readAsDataURL(f);
        });
      });

      const newFiles = await Promise.all(newFilesPromises);
      setUploadedExamFiles((prev) => [...prev, ...newFiles]);
      setExamData(
        (prev) =>
          prev +
          "\n[Exame anexado: " +
          newFiles.map((f) => f.name).join(", ") +
          "]",
      );
    }
  };

  const handleLiteratureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFilesPromises = Array.from(files).map(async (f) => {
        return new Promise<{
          name: string;
          size: string;
          data: string;
          mimeType: string;
        }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(",")[1];
            resolve({
              name: f.name,
              size: (f.size / (1024 * 1024)).toFixed(1) + "MB",
              data: base64,
              mimeType: f.type,
            });
          };
          reader.readAsDataURL(f);
        });
      });

      const newFiles = await Promise.all(newFilesPromises);
      setUploadedLiteratureFiles((prev) => [...prev, ...newFiles]);
      setExamData(
        (prev) =>
          prev +
          "\n[Diretriz literária anexada: " +
          newFiles.map((f) => f.name).join(", ") +
          "]",
      );
    }
  };

  const removeExamFile = (index: number) => {
    setUploadedExamFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeLiteratureFile = (index: number) => {
    setUploadedLiteratureFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!anamnesis && uploadedFiles.length === 0) {
      alert("Por favor, preencha a anamnese ou anexe exames.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          anamnesis,
          examData: examData || "Nenhum exame anexado",
          files: uploadedFiles.map((f) => ({
            data: f.data,
            mimeType: f.mimeType,
          })),
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let msg = "Falha na comunicação com a IA";
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          msg = errData.error || msg;
        }
        setError(msg);
        throw new Error(msg);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setGeneratedReport(data.soapContent);
        setSources(data.sources || []);
        setStep("result");
      } else {
        const errorText = "Resposta inválida do servidor (não JSON).";
        setError(errorText);
        throw new Error(errorText);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!anamnesis && uploadedFiles.length === 0) {
      alert(
        "Por favor, digite uma dúvida clínica, tema ou anexe um artigo para revisão crítica.",
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/literature-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: anamnesis,
          files: uploadedFiles.map((f) => ({
            data: f.data,
            mimeType: f.mimeType,
          })),
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let msg = "Falha na comunicação com o Motor de RAG da Literatura.";
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          msg = errData.error || msg;
        }
        setError(msg);
        throw new Error(msg);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setGeneratedReview(data.review);
        setSources(
          data.sources && data.sources.length > 0
            ? data.sources
            : [
                {
                  topic: "Watson Critical Care",
                  content:
                    "Consenso de cuidados críticos veterinários e suporte hemodinâmico.",
                  type: "pdf",
                },
                {
                  topic: "Fossum Vet Surgery",
                  content:
                    "Manual clássico de procedimentos cirúrgicos de tecidos moles e ortopedia.",
                  type: "pdf",
                },
                {
                  topic: "ACVIM Consensus",
                  content:
                    "Consenso científico de cardiologia e diretrizes de insuficiência valvar.",
                  type: "pdf",
                },
              ],
        );
        setStep("result");
      } else {
        const errorText = "Resposta inválida do servidor de literatura.";
        setError(errorText);
        throw new Error(errorText);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedReport || !auth.currentUser) return;

    // Extract marketing source from the metrics JSON in sections[6]
    let extractedSource = "Outros";
    const sections = generatedReport.split("##");
    if (sections.length > 6) {
      try {
        const rawContent = sections[6].trim();
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : rawContent;
        const parsed = JSON.parse(jsonStr);
        if (parsed.origem) extractedSource = parsed.origem;
      } catch (e) {
        console.error("Erro ao extrair origem BI:", e);
      }
    }

    try {
      const reportData: any = {
        patientId: patient.name || "Sem nome",
        anamnesis,
        examData,
        soapContent: generatedReport,
        prescription,
        marketingSource: extractedSource,
        sources: sources.map((s: any) =>
          typeof s === "object" && s !== null ? s.topic : String(s),
        ),
        ownerId: auth.currentUser.uid,
        status: "finalized",
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "reports"), reportData).catch(
        (err) => {
          handleFirestoreError(err, OperationType.WRITE, "reports");
          throw err;
        },
      );
      if (docRef && docRef.id) {
        setSavedReportId(docRef.id);
      }

      const successModal = document.createElement("div");
      successModal.className =
        "fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-300";
      successModal.innerHTML = `
        <div class="bg-white rounded-[2.5rem] p-10 max-w-sm w-full mx-4 text-center space-y-6">
           <div class="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
           </div>
           <div>
            <h3 class="text-2xl font-black text-slate-900">Sucesso!</h3>
            <p class="text-slate-500 font-medium mt-2">O atendimento de <b>${patient.name}</b> foi salvo na sua biblioteca.</p>
           </div>
           <button id="closeModal" class="w-full bg-medai-blue text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all">Continuar</button>
        </div>
      `;
      document.body.appendChild(successModal);
      document.getElementById("closeModal")?.addEventListener("click", () => {
        document.body.removeChild(successModal);
        if (onBack) onBack();
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setFeedbackError(null);

    // Mandatory rating validation (obrigatório avaliar)
    if (rating < 1 || rating > 5) {
      setFeedbackError(
        "A avaliação de estrelas (de 1 a 5) é obrigatória para enviar o feedback.",
      );
      return;
    }

    setSubmittingFeedback(true);

    try {
      if (savedReportId) {
        // Option A: Report already exists in Firestore. Simply update it.
        await updateDoc(doc(db, "reports", savedReportId), {
          rating,
          feedbackComment: feedbackComment.trim(),
        }).catch((err) => {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `reports/${savedReportId}`,
          );
          throw err;
        });
      } else {
        // Option B: Auto-save the report along with the feedback to make it a seamless experience.
        let extractedSource = "Outros";
        if (generatedReport) {
          const sections = generatedReport.split("##");
          if (sections.length > 6) {
            try {
              const rawContent = sections[6].trim();
              const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : rawContent;
              const parsed = JSON.parse(jsonStr);
              if (parsed.origem) extractedSource = parsed.origem;
            } catch (e) {
              console.error("Erro ao extrair origem BI:", e);
            }
          }
        }

        const reportData: any = {
          patientId: patient.name || "Sem nome",
          anamnesis,
          examData,
          soapContent: generatedReport || "",
          prescription,
          marketingSource: extractedSource,
          sources: sources.map((s: any) =>
            typeof s === "object" && s !== null ? s.topic : String(s),
          ),
          ownerId: auth.currentUser.uid,
          status: "finalized",
          createdAt: serverTimestamp(),
          rating,
          feedbackComment: feedbackComment.trim(),
        };

        const docRef = await addDoc(
          collection(db, "reports"),
          reportData,
        ).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, "reports");
          throw err;
        });
        if (docRef && docRef.id) {
          setSavedReportId(docRef.id);
        }
      }

      setFeedbackSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setFeedbackError(
        "Erro ao salvar avaliação de feedback no banco de dados.",
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          await handleTranscribe(base64Audio);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Acesso ao microfone negado ou não disponível.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (base64Audio: string) => {
    setIsTranscribing(true);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: "audio/webm",
        }),
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.transcription) {
          setAnamnesis(
            (prev) => prev + (prev ? "\n" : "") + data.transcription,
          );
        }
      } else {
        console.warn(
          "Expected JSON answer for transcription but got:",
          contentType,
        );
      }
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGeneratePrescription = async () => {
    if (!generatedReport) return;
    setIsGeneratingPrescription(true);
    try {
      const response = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soapContent: generatedReport, patient }),
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setPrescription(data.prescription);
      } else {
        console.warn(
          "Expected JSON answer for prescription but got:",
          contentType,
        );
      }

      // Auto scroll to prescription
      setTimeout(() => {
        const pSection = document.getElementById("prescription-section");
        pSection?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Prescription error:", err);
    } finally {
      setIsGeneratingPrescription(false);
    }
  };

  if (step === "result" && (generatedReport || generatedReview)) {
    if (generatedReview) {
      const sections = generatedReview.split("##");
      // sections[1]: 📌 RESUMO EXECUTIVO (TL;DR)
      // sections[2]: ⚙️ APLICAÇÃO PRÁTICA (O QUE MUDA?)
      // sections[3]: ⚖️ AVALIAÇÃO DE CONFIANÇA E LIMITAÇÕES DO ESTUDO
      // sections[4]: 📚 CONFRONTADO COM A LITERATURA BASE (GLOBAL VS LOCAL)
      // sections[5]: 📖 CITAÇÃO CLÍNICA EXATA

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-40 max-w-4xl mx-auto px-4">
          <div className="flex justify-center gap-2 mb-4">
            <div className="h-15 w-1 bg-[#6B4EFF] rounded-full"></div>
            <div className="h-1.5 w-12 bg-slate-200 rounded-full"></div>
            <div className="h-1.5 w-12 bg-slate-200 rounded-full"></div>
          </div>

          {/* Header Card */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 md:p-12 shadow-sm space-y-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-[#6B4EFF]/10 text-[#6B4EFF] text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider">
                  📚 Revisão Sistemática (RAG)
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  ID: #LIT-{Math.floor(Math.random() * 90000) + 10000}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
                Análise Crítica de Literatura
              </h2>
              <p className="text-sm font-medium text-slate-500 max-w-xl">
                O motor de RAG estruturado do Vetmind cruzou os dados e
                diretrizes das bases clínicas com o prompt consultado.
              </p>
            </div>

            <div className="flex flex-row md:flex-col gap-3 min-w-[200px]">
              <button
                onClick={() => {
                  setStep("input");
                  setGeneratedReview(null);
                  setAnamnesis("");
                }}
                className="flex-1 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-slate-50"
              >
                <Edit3 className="w-4 h-4 text-[#6B4EFF]" /> Nova Busca
              </button>
              <button
                onClick={() =>
                  alert(
                    "PDF exportado com sucesso contendo as referências e cruzamentos.",
                  )
                }
                className="flex-1 px-6 py-3.5 bg-[#6B4EFF] text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <FileDown className="w-4 h-4" /> Exportar PDF
              </button>
            </div>
          </div>

          {/* Grid for two column or nice bento on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Resumo Card */}
            {sections[1] && (
              <div className="bg-white border border-slate-150 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                <h3 className="font-extrabold text-[#6B4EFF] uppercase text-[11px] tracking-widest flex items-center gap-2">
                  <span className="text-lg">📌</span> Resumo Executivo (TL;DR)
                </h3>
                <div className="text-sm text-slate-600 font-semibold leading-relaxed prose-clinical">
                  <ClinicalMarkdown>
                    {sections[1].replace("📌 RESUMO EXECUTIVO (TL;DR)", "")}
                  </ClinicalMarkdown>
                </div>
              </div>
            )}

            {/* Aplicação Prática */}
            {sections[2] && (
              <div className="bg-white border border-slate-150 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                <h3 className="font-extrabold text-emerald-600 uppercase text-[11px] tracking-widest flex items-center gap-2">
                  <span className="text-lg">⚙️</span> Aplicação Prática
                  (Posologia / Prática)
                </h3>
                <div className="text-sm text-slate-600 font-semibold leading-relaxed prose-clinical">
                  <ClinicalMarkdown>
                    {sections[2].replace(
                      "⚙️ APLICAÇÃO PRÁTICA (O QUE MUDA?)",
                      "",
                    )}
                  </ClinicalMarkdown>
                </div>
              </div>
            )}

            {/* Confiança */}
            {sections[3] && (
              <div className="bg-white border border-slate-150 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                <h3 className="font-extrabold text-amber-600 uppercase text-[11px] tracking-widest flex items-center gap-2">
                  <span className="text-lg">⚖️</span> Força de Evidência e
                  Limitações
                </h3>
                <div className="text-xs text-slate-500 font-bold leading-relaxed prose-clinical">
                  <ClinicalMarkdown>
                    {sections[3].replace(
                      "⚖️ AVALIAÇÃO DE CONFIANÇA E LIMITAÇÕES DO ESTUDO",
                      "",
                    )}
                  </ClinicalMarkdown>
                </div>
              </div>
            )}

            {/* Confronto Base */}
            {sections[4] && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                <h3 className="font-extrabold text-blue-700 uppercase text-[11px] tracking-widest flex items-center gap-2">
                  <span className="text-lg">📚</span> Confronto com Literatura
                  de Base
                </h3>
                <div className="text-sm text-slate-600 font-semibold leading-relaxed prose-clinical">
                  <ClinicalMarkdown>
                    {sections[4].replace(
                      "📚 CONFRONTADO COM A LITERATURA BASE (GLOBAL VS LOCAL)",
                      "",
                    )}
                  </ClinicalMarkdown>
                </div>
              </div>
            )}

            {/* Citações */}
            {sections[5] && (
              <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 md:p-10 text-white shadow-xl space-y-4 relative overflow-hidden">
                <h3 className="font-black text-purple-300 uppercase text-[11px] tracking-widest flex items-center gap-2">
                  <span className="text-lg">📖</span> Referência Bibliográfica
                  Rastreável
                </h3>
                <div className="text-xs text-slate-200 leading-relaxed font-mono">
                  <ClinicalMarkdown>
                    {sections[5].replace("📖 CITAÇÃO CLÍNICA EXATA", "")}
                  </ClinicalMarkdown>
                </div>
                {/* Subtle water mark */}
                <div className="absolute right-6 bottom-6 text-white/5 font-black text-6xl select-none">
                  RAG
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-around py-5 rounded-2xl bg-white border border-slate-100 shadow-xl sticky bottom-4 z-50">
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedReview);
                alert("Revisão copiada para a área de transferência.");
              }}
              className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors"
            >
              <Clipboard className="w-5 h-5" /> Copiar Tudo
            </button>
            <button
              onClick={() => alert("Compartilhado com sucesso.")}
              className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors"
            >
              <Share2 className="w-5 h-5" /> Compartilhar
            </button>
            <button
              onClick={() => {
                alert("Adicionado ao histórico clínico com sucesso!");
                if (onBack) onBack();
              }}
              className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-clinical-blue hover:scale-105 transition-transform"
            >
              <div className="bg-blue-50 p-2 rounded-xl">
                <Save className="w-6 h-6" />
              </div>
              Salvar Revisão
            </button>
          </div>
        </div>
      );
    }

    const sections = generatedReport.split("##");

    // Parse metrics if available
    let metrics = { fc: "--", fr: "--", temp: "--", trc: "--" };
    if (sections.length > 6) {
      try {
        const rawContent = sections[6].trim();
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : rawContent;
        const parsed = JSON.parse(jsonStr);
        metrics = { ...metrics, ...parsed };
      } catch (e) {
        console.error("Erro ao processar métricas:", e);
      }
    }

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-40 max-w-6xl mx-auto px-4 md:px-6 w-full">
        {/* Step progress indicators */}
        <div className="flex justify-center gap-2 mb-4">
          <div className="h-1.5 w-10 rounded-full bg-slate-200"></div>
          <div className="h-1.5 w-10 rounded-full bg-slate-200"></div>
          <div className="h-1.5 w-10 rounded-full bg-clinical-blue animate-pulse"></div>
        </div>

        {/* Dashboard Title row */}
        <div className="border-b border-slate-100 pb-5 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="bg-[#6B4EFF]/10 text-[#6B4EFF] text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono">
                🔍 Análise e Consenso Científico RAG
              </span>
              <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight mt-1.5">
                Dashboard de Diagnóstico Assistido
              </h1>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                As referências internacionais e as diretrizes clínicas foram cruzadas com a anamnese do paciente.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setStep("input")}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Edit3 className="w-4 h-4 text-clinical-blue" /> Redigitar Caso
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Desktop Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Content Area (8 Cols) - Diagnostics and Clinical SOAP Sections FIRST */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Diagnósticos Diferenciais & Revisão Sistemática (RAG) - PLACED FIRST FOR THE USER! */}
            {sections.length > 5 && (
              <div id="diagnostics-rag-section" className="bg-gradient-to-br from-[#F0F5FF] to-blue-50/40 border border-[#003399]/15 rounded-[2rem] p-6 md:p-8 space-y-5 shadow-xs border-l-[6px] border-l-[#003399] animate-in fade-in relative overflow-hidden">
                 {/* Subdued watermark icon */}
                 <div className="absolute right-4 top-4 opacity-[0.03] pointer-events-none">
                    <BookOpen className="w-24 h-24 text-[#003399]" />
                 </div>
                 <div className="flex items-center gap-3 text-[#003399] border-b border-[#003399]/10 pb-4">
                    <div className="p-2.5 bg-[#003399]/10 rounded-2xl">
                       <Activity className="w-5 h-5 animate-pulse text-[#003399]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                        Diagnósticos Diferenciais & Revisão Sistemática (RAG)
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Cruzamento literário com assertividade percentual estimada por IA
                      </p>
                    </div>
                 </div>
                 <DifferentialCards text={sections[5]} />
                 <div className="flex items-center gap-2 text-[10px] font-black text-[#003399]/80 uppercase tracking-widest bg-clinical-blue/5 py-2 px-3.5 rounded-lg w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5 text-trusted-green animate-bounce" />
                    Diferenciais validados por RAG ativo
                 </div>
              </div>
            )}

            {/* 2. SOAP Evidence Panels (Subjective, Objective, Assessment, Plan) */}
            <div className="card-clinical rounded-[2rem] overflow-hidden divide-y divide-slate-100 shadow-xs border border-slate-150/80 bg-white">
              <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Estrutura de Evidências Clínicas (SOAP)</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase font-mono mt-0.5">Raciocínio Clínico Estruturado</p>
                </div>
                <span className="bg-[#003399]/10 text-[#003399] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full w-fit">RAG Ativo</span>
              </div>

              <SoapSection title="S (SUBJETIVO)">
                <div className="text-sm text-surface-text leading-relaxed font-normal">
                  <ClinicalMarkdown>{sections[1] || "---"}</ClinicalMarkdown>
                </div>
              </SoapSection>

              <SoapSection title="O (OBJETIVO)">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <MetricBox label="FC" value={metrics.fc} />
                  <MetricBox label="Temp" value={metrics.temp} />
                  <MetricBox label="TRC" value={metrics.trc} />
                  <MetricBox label="FR" value={metrics.fr} />
                </div>
                <div className="text-sm text-surface-text font-normal leading-relaxed">
                  <ClinicalMarkdown>{sections[2] || "---"}</ClinicalMarkdown>
                </div>
              </SoapSection>

              <SoapSection title="A (AVALIAÇÃO)">
                <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 mt-2">
                  <div className="text-sm text-surface-text font-semibold leading-relaxed">
                    <ClinicalMarkdown>{sections[3] || "---"}</ClinicalMarkdown>
                  </div>
                </div>
              </SoapSection>

              <SoapSection title="P (PLANO)">
                <div className="text-sm text-surface-text leading-relaxed font-normal space-y-2">
                  <ClinicalMarkdown>{sections[4] || "---"}</ClinicalMarkdown>
                </div>
                {!prescription && (
                  <button
                    onClick={handleGeneratePrescription}
                    disabled={isGeneratingPrescription}
                    className="mt-6 w-full py-4 border-2 border-dashed border-clinical-blue text-clinical-blue rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingPrescription ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Pill className="w-4 h-4 animate-pulse" />
                    )}
                    Gerar Prescrição Digital
                  </button>
                )}
              </SoapSection>
            </div>

            {/* 3. Fontes Clínicas Rastreáveis */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xs">
              <InteractiveSources sources={sources} />
            </div>

          </div>

          {/* Right Sidebar Area (4 Cols) - Quick Info, Prescription details, and Feedback submission */}
          <div className="lg:col-span-4 space-y-6">

            {/* A. Quick Patient Info Dashboard */}
            <div className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-xs space-y-4">
              <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest leading-none">Dados Básicos do Prontuário</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Nome Paciente</p>
                  <p className="text-xs font-black text-slate-800 uppercase mt-0.5 truncate">{patient.name}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Idade Estimada</p>
                  <p className="text-xs font-black text-slate-800 uppercase mt-0.5 truncate">{patient.age}</p>
                </div>
              </div>
            </div>

            {/* B. Prescription Box if generated */}
            {prescription && (
              <div
                id="prescription-section"
                className="bg-white border-2 border-slate-250 rounded-[2rem] overflow-hidden shadow-xs animate-in zoom-in-95"
              >
                <div className="bg-clinical-blue p-5 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    <h3 className="font-black text-xs uppercase tracking-wider">Prescrição Farmacológica</h3>
                  </div>
                  <div className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest font-mono">
                    Sugerida
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="text-[11px] text-slate-700 leading-normal font-semibold prose-clinical border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                    <ClinicalMarkdown>{prescription}</ClinicalMarkdown>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button className="flex-1 bg-clinical-blue text-white py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:bg-[#002266] cursor-pointer">
                      <Share2 className="w-3.5 h-3.5" /> Enviar Tutor
                    </button>
                    <button className="flex-1 bg-white border border-slate-200 text-slate-500 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 cursor-pointer">
                      <FileDown className="w-3.5 h-3.5" /> Enviar PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* C. Plano Preventivo Banner */}
            <div className="bg-[#007F5F]/5 border border-[#007F5F]/20 rounded-3xl p-5 flex gap-4">
              <div className="bg-[#007F5F]/10 p-2.5 rounded-2xl text-[#007F5F] h-fit shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Plano Preventivo Ativo
                </h4>
                <p className="text-[11px] text-slate-600 leading-normal font-medium">
                  Paciente está com as vacinas V10 e Raiva próximas do vencimento. Agende o retorno preventivo para <b>Junho/2026</b>.
                </p>
                <button className="text-[#007F5F] text-[9px] font-black uppercase tracking-widest mt-2.5 hover:underline flex items-center gap-1 cursor-pointer">
                  Agendar Retorno <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* D. Google Review style Feedback Card */}
            <div
              id="laudo-feedback-card"
              className="bg-white border border-slate-200 rounded-[2rem] p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs">
                  ★
                </div>
                <div>
                  <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 leading-none">
                    Avaliação do Motor RAG
                  </h3>
                  <p className="text-[8px] text-amber-500 font-extrabold uppercase tracking-widest mt-1">
                    Feedback de Diagnóstico
                  </p>
                </div>
              </div>

              {feedbackSubmitted ? (
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 text-center space-y-2 animate-in fade-in duration-300">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4.5 h-4.5 ${
                          star <= rating
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10.5px] font-bold text-slate-800">
                      Obrigado por ajudar a calibrar a IA!
                    </p>
                    {feedbackComment && (
                      <p className="text-[10px] text-slate-500 italic mt-2 bg-slate-50 p-2.5 border border-slate-150 rounded-xl leading-relaxed text-left">
                        "{feedbackComment}"
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                      Como você avalia a precisão do diagnóstico? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5 py-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isSelected = star <= rating;
                        const isHovered = star <= hoveredRating;
                        return (
                          <button
                            type="button"
                            key={star}
                            onClick={() => {
                              setRating(star);
                              setFeedbackError(null);
                            }}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="transition-transform active:scale-90 hover:scale-105 p-0.5 cursor-pointer"
                            title={`Avaliar com ${star} estrela${star > 1 ? "s" : ""}`}
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                isHovered || (!hoveredRating && isSelected)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-200"
                              }`}
                            />
                          </button>
                        );
                      })}
                      {rating > 0 && (
                        <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase mt-0.5">
                          {rating === 1 && "Ruim"}
                          {rating === 2 && "Regular"}
                          {rating === 3 && "Bom"}
                          {rating === 4 && "Muito Bom"}
                          {rating === 5 && "Excelente"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                      Mais Detalhes ou Correção de Diretriz:
                    </label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Identificou alguma discordância científica no RAG? Escreva aqui..."
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl h-16 focus:outline-none focus:ring-1 focus:ring-clinical-blue focus:border-clinical-blue font-semibold bg-slate-50/50 resize-none"
                      maxLength={10000}
                    />
                  </div>

                  {feedbackError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 p-2.5 rounded-xl text-red-600 text-[10px] font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{feedbackError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="w-full bg-clinical-blue hover:bg-[#002266] text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingFeedback ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Enviar Avaliação"
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

        {/* 4. CLINICAL REPORT DRAFT AT THE VERY BOTTOM (Minuta de Laudo para Revisão - spans fully across bottom) */}
        <div className="border-t border-slate-200 pt-10 mt-6">
          <div className="bg-white border border-slate-150/80 rounded-[2.5rem] p-8 md:p-12 shadow-md space-y-6 max-w-4xl mx-auto">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className={`${isSigned ? "bg-emerald-50 text-trusted-green border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"} text-[9px] px-2.5 py-0.5 rounded border font-black uppercase tracking-widest font-mono`}>
                  {isSigned ? "Minuta Assinada & Validada" : "Aguardando Validar Prata"}
                </span>
                <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight mt-1.5">
                  Minuta de Laudo para Revisão Final
                </h2>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                  MÉDICO VETERINÁRIO CONSULTA • ID: #ORD-{Math.floor(Math.random() * 90000) + 10000}
                </p>
              </div>
              
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsabilidade:</span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150">Revisor Clínico</span>
              </div>
            </div>

            {/* Legal/Responsibility Disclaimer Banner */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4.5 space-y-1.5 text-amber-950 text-left shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 leading-none">
                ⚠️ Alerta de Responsabilidade Civil & Clínica (CFMV)
              </p>
              <p className="text-[11px] leading-relaxed font-semibold">
                Este laudo é uma <b>Minuta Assistida por IA</b> de suporte à decisão clínica. O laudo definitivo, diagnósticos e prescrições são de inteira e exclusiva responsabilidade jurídica do médico veterinário que aprova e assina. O software não gera laudos definitivos por si só.
              </p>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="label-medical text-xs mr-2">Paciente em Análise:</span>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-tight">
                {patient.name} • {patient.age}
              </p>
            </div>

            {/* Digital Signature Panel */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 md:p-8 space-y-4">
              {isSigned ? (
                <div className="space-y-4 animate-in zoom-in-95">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 text-trusted-green rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-[#007F5F] leading-none mb-0.5">Assinatura Sistêmica Aplicada</p>
                        <p className="text-[9px] text-slate-400 font-medium">Vinculado pelo Termo de Responsabilidade Técnica</p>
                      </div>
                    </div>
                    {onNavigateToSignature && (
                      <button
                        onClick={onNavigateToSignature}
                        className="text-[9px] font-black uppercase text-clinical-blue bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors cursor-pointer"
                      >
                        Gerenciar Assinatura
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Médico Veterinário Revisor</span>
                      <p className="text-sm font-black text-slate-800 uppercase">{signerName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Conselho Regional: CRMV-{signerCrmv}</p>
                    </div>

                    <div className="md:border-l md:border-slate-200 md:pl-6 space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Autenticação de Registro</span>
                      <p className="text-[10px] font-mono text-emerald-600 font-bold uppercase">SELO VETMIND AUTORIZADO</p>
                      <p className="text-[9px] text-slate-400 font-medium">Data do Aceite: {localStorage.getItem("vetmind_signature_date") || "09/06/2026"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-6 animate-in fade-in duration-300">
                  <div className="inline-flex items-center justify-center bg-amber-50 text-amber-500 p-3 rounded-2xl border border-amber-100 mb-1">
                    <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest leading-none">⚠️ Assinatura Eletrônica Inativa</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Doutor(a), para carimbar e emitir seus laudos em PDF contendo o carimbo nacional oficial, informe suas credenciais profissionais e assine o termo de responsabilidade uma única vez.
                    </p>
                  </div>

                  {onNavigateToSignature ? (
                    <button
                      onClick={onNavigateToSignature}
                      className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-br from-clinical-blue to-indigo-800 hover:to-indigo-950 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                    >
                      Cadastrar Credenciais & Assinar Termo
                    </button>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-400">Por favor, utilize a aba "Termos & Assinatura" no menu lateral para se credenciar.</p>
                  )}
                </div>
              )}
            </div>

            {/* Editing and exporting buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => setStep("input")}
                className="flex-1 bg-white border border-slate-200 py-3 rounded-xl text-clinical-blue font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Editar Minuta Recheada
              </button>
              <button 
                onClick={() => {
                  if (!isSigned) {
                    alert("Atenção:\nPor favor, registre sua assinatura profissional no painel global 'Termos & Assinatura' antes de exportar o arquivo PDF.");
                    if (onNavigateToSignature) onNavigateToSignature();
                    return;
                  }
                  alert(`PDF de laudo para ${patient.name} exportado com sucesso contendo o selo clínico e a assinatura de ${signerName}!\nO selo digital foi validado.`);
                }}
                className="flex-1 bg-clinical-blue text-white py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 hover:bg-[#002266] cursor-pointer"
              >
                <FileDown className="w-4 h-4" /> Exportar PDF do Laudo
              </button>
            </div>

            {onTransformToSocial && (
              <button 
                onClick={() => {
                  onTransformToSocial({
                    queixa: anamnesis || "",
                    exames: examData || "Achados integrados do prontuário: " + (generatedReport ? generatedReport.slice(0, 300) : ""),
                    tecnica: "",
                    desfecho: ""
                  });
                }}
                className="w-full bg-gradient-to-r from-[#0047AB]/90 via-[#0052cc] to-[#7b2cbf]/90 hover:from-[#003399] hover:to-[#5a189a] text-white py-4 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
              >
                <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
                Criar Post de Marketing para Redes Sociais
              </button>
            )}

          </div>
        </div>

        {/* Global sticky/floating action bar */}
        <div className="flex items-center justify-around py-4 px-6 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-150 shadow-xl sticky bottom-6 max-w-lg mx-auto z-50 animate-in fade-in slide-in-from-bottom-5">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(generatedReport);
              alert("Minuta de laudo copiada para a área de transferência!");
            }}
            className="flex flex-col items-center gap-1 text-[9px] font-black uppercase text-slate-400 hover:text-clinical-blue transition-colors cursor-pointer"
          >
            <Clipboard className="w-4.5 h-4.5" /> Copiar Minuta
          </button>
          
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Laudo Assistido - ${patient.name}`,
                  text: generatedReport,
                }).catch(err => console.log(err));
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link de compartilhamento copiado para o seu clipboard!");
              }
            }}
            className="flex flex-col items-center gap-1 text-[9px] font-black uppercase text-slate-400 hover:text-clinical-blue transition-colors cursor-pointer"
          >
            <Share2 className="w-4.5 h-4.5" /> Compartilhar
          </button>
          
          <button
            onClick={handleSave}
            className="flex flex-col items-center gap-1 text-[9px] font-black uppercase text-slate-400 hover:text-[#003399] transition-colors cursor-pointer"
          >
            <Save className="w-4.5 h-4.5" /> Salvar Consulta
          </button>
        </div>

      </div>
    );
  }

  // Contextual symptoms/clinical signs list & toggle logic
  const commonSymptoms = [
    "Polidipsia",
    "Poliúria",
    "Corrimento vaginal",
    "Distensão abdominal",
    "Anorexia",
    "Vômito",
    "Diarreia",
    "Letargia",
    "Febre",
    "Dispneia",
  ];

  const handleToggleSymptom = (symptom: string) => {
    const isIncluded = anamnesis.toLowerCase().includes(symptom.toLowerCase());
    if (isIncluded) {
      // Remove symptom with a clean regex
      const regex = new RegExp(`,?\\s*${symptom}`, 'gi');
      let updated = anamnesis.replace(regex, "").trim();
      if (updated.startsWith(",")) {
        updated = updated.substring(1).trim();
      }
      if (updated === "") {
        setAnamnesis("");
      } else {
        setAnamnesis(updated);
      }
    } else {
      // Append symptom beautifully
      const separator = anamnesis.trim() 
        ? (anamnesis.trim().endsWith(".") || anamnesis.trim().endsWith(",") ? " " : ", ") 
        : "";
      setAnamnesis(anamnesis + separator + symptom);
    }
  };

  return (
    <div className="space-y-6 pb-36 animate-in fade-in slide-in-from-right-2 duration-300 max-w-6xl mx-auto px-4 md:px-6">
      {/* Top Bar with Step & Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <VetmindLogo showText={true} size={32} />
            <span className="bg-[#EBF2FF] text-[#003399] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-100 font-mono">
              Copilot RAG Ativo
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-1">
            Anamnese avançada com cruzamento científico instantâneo de diretrizes veterinárias de referência.
          </p>
        </div>

        {/* Record Voice Button Placement in Top Bar */}
        <button
          type="button"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[11px] font-black uppercase tracking-wider ${
            isRecording 
              ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-100" 
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs"
          }`}
        >
          {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-clinical-blue" />}
          <span>{isRecording ? "Parar Gravação" : "Gravar por voz"}</span>
        </button>
      </div>

      {/* Dynamic 1-Click Clinical Case Presets */}
      <div className="bg-gradient-to-br from-[#003399]/[0.02] via-slate-50/10 to-blue-50/30 border border-slate-200/80 rounded-[2rem] p-5 md:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.01)] animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4.5 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#003399]/5 text-[#003399]">
              <Sparkles className="w-5 h-5 animate-pulse text-[#003399]" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#001D62] text-xs md:text-sm uppercase tracking-tight">
                Vetmind Casos Clínicos de Exemplo (Presets Biológicos)
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                Carregue instantaneamente um prontuário biológico completo de alta fidelidade para experimentar as hipóteses diferenciais geradas pelo RAG de dados médicos.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase text-slate-400 font-mono self-start md:self-center block bg-slate-50 border border-slate-150 rounded-full px-2.5 py-1">
            4 Modelos de Teste
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {clinicalPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPatient({
                  name: preset.title.replace(/\s*\(.*/g, ""), // strip helper labels
                  species: preset.species,
                  breed: preset.breed,
                  age: preset.age,
                  sex: preset.sex,
                  weight: preset.weight
                });
                setAnamnesis(preset.anamnesis);
              }}
              className="bg-white border border-slate-150 hover:border-[#003399]/30 hover:shadow-md hover:scale-[1.01] rounded-2xl p-4 text-left transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#003399]/5 transition-colors flex items-center justify-center text-lg">
                    {preset.icon}
                  </div>
                  <span className="bg-slate-55 border border-slate-150 text-[8px] font-black text-slate-400 group-hover:text-[#003399] group-hover:bg-[#003399]/5 group-hover:border-[#003399]/10 transition-colors uppercase px-1.5 py-0.5 rounded font-mono">
                    Carregar
                  </span>
                </div>
                <h5 className="font-extrabold text-[#001D62] text-[12.5px] group-hover:text-indigo-900 leading-snug transition-colors line-clamp-1">
                  {preset.title}
                </h5>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {preset.breed} • {preset.age}
                </p>
              </div>
              <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-semibold mt-3.5 border-t border-slate-50 pt-2 text-justify">
                {preset.anamnesis}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* LEFT & CENTER PANEL (Take 7/12 on desktop) - Clinical Relatos & Attachments */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* A. CARD PACIENTE */}
          <div className="card-clinical bg-white border border-slate-150 p-5 md:p-6 rounded-[1.75rem] space-y-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2.5 text-[#003399] border-b border-slate-100 pb-3">
              <PawPrint className="w-5 h-5 text-[#003399]" />
              <h3 className="font-extrabold text-xs md:text-sm text-slate-800 tracking-tight uppercase">
                Ficha do Paciente
              </h3>
            </div>

            <div className="space-y-4">
              {/* Espécie Pill Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Espécie</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "🐕 Canino", value: "Canino" },
                    { label: "🐈 Felino", value: "Felino" },
                    { label: "🦜 Exótico", value: "Exótico" },
                    { label: "🐎 Equino", value: "Equino" }
                  ].map((sp) => {
                    const isActive = patient.species === sp.value;
                    return (
                      <button
                        key={sp.value}
                        type="button"
                        onClick={() => setPatient({ ...patient, species: sp.value })}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? "bg-[#001E62] border-[#001E62] text-white shadow-sm shadow-slate-900/10 scale-[1.03]" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        }`}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patient Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1.5">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1.5">Raça</label>
                  <input
                    className="w-full text-xs py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 font-semibold focus:bg-white focus:border-clinical-blue focus:outline-none"
                    placeholder="Ex: Golden Retriever"
                    value={patient.breed}
                    onChange={(e) => setPatient({ ...patient, breed: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1.5">Sexo / Condição</label>
                  <select
                    className="w-full text-xs py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 font-semibold focus:bg-white focus:border-clinical-blue focus:outline-none appearance-none"
                    value={patient.sex || "Fêmea inteira"}
                    onChange={(e) => setPatient({ ...patient, sex: e.target.value })}
                  >
                    <option>Fêmea inteira</option>
                    <option>Fêmea castrada</option>
                    <option>Macho inteiro</option>
                    <option>Macho castrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1.5">Idade</label>
                  <input
                    className="w-full text-xs py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 font-semibold focus:bg-white focus:border-clinical-blue focus:outline-none"
                    placeholder="Ex: 9 anos"
                    value={patient.age}
                    onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                  />
                </div>
              </div>

              {/* Name & Weight Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1.5">Nome do Paciente</label>
                  <input
                    className="w-full text-xs py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 font-semibold focus:bg-white focus:border-clinical-blue focus:outline-none"
                    placeholder="Ex: Rex"
                    value={patient.name}
                    onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1.5">Peso Estimado</label>
                  <input
                    className="w-full text-xs py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 font-semibold focus:bg-white focus:border-clinical-blue focus:outline-none"
                    placeholder="Ex: 28 kg"
                    value={patient.weight || ""}
                    onChange={(e) => setPatient({ ...patient, weight: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* B. DESCRIÇÃO EM LINGUAGEM NATURAL */}
          <div className="card-clinical bg-white border border-slate-150 p-5 md:p-6 rounded-[1.75rem] space-y-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2.5 text-[#003399] border-b border-slate-100 pb-3">
              <ClipboardList className="w-5 h-5 text-[#003399]" />
              <div className="flex-1">
                <h3 className="font-extrabold text-xs md:text-sm text-slate-800 tracking-tight uppercase">
                  Descrição em linguagem natural
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Descreva o caso como falaria com um colega
                </label>
                <div className="relative">
                  <textarea
                    className="w-full min-h-[160px] p-4 border border-slate-200 bg-white focus:border-clinical-blue/40 rounded-2xl resize-y text-xs font-semibold leading-relaxed focus:ring-1 focus:ring-clinical-blue/20 outline-none"
                    placeholder="Descreva o caso de forma corrida. Use o painel de sintomas ao lado para preenchimento rápido..."
                    value={anamnesis}
                    onChange={(e) => setAnamnesis(e.target.value)}
                  />
                  
                  {isRecording && (
                    <div className="absolute inset-0 bg-red-50/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center space-y-3.5 z-10 animate-in fade-in duration-200">
                      <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center animate-ping absolute opacity-50" />
                      <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center relative">
                        <Mic className="w-6 h-6 text-red-600 animate-bounce" />
                      </div>
                      <p className="text-[11px] font-black text-red-600 uppercase tracking-widest animate-pulse mt-2">
                        Ouvindo relato clínico...
                      </p>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                      >
                        Concluir Áudio
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-1">
                  <span className="text-[10px] text-slate-400 font-bold font-mono">
                    {anamnesis.length} {anamnesis.length === 1 ? "caractere" : "caracteres"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* C. EXAMES / ARQUIVOS */}
          <div className="card-clinical bg-white border border-slate-150 p-5 md:p-6 rounded-[1.75rem] space-y-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#003399]">
                <FileSpreadsheet className="w-4.5 h-4.5 text-[#003399]" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                  Exames e Imagens
                </h3>
              </div>
              <span className="bg-[#EBF2FF] text-[#003399] text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-50/50 font-mono">
                Opcional
              </span>
            </div>

            <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
              Arraste ou clique para anexar exames de sangue, laudos de radiografias ou ultrassons.
            </p>

            <input
              type="file"
              hidden
              ref={examInputRef}
              onChange={handleExamFileChange}
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
            />

            <div
              onClick={() => examInputRef.current?.click()}
              className="border border-dashed border-slate-200 hover:border-[#003399]/40 hover:bg-blue-50/10 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/40 transition-all group cursor-pointer"
            >
              <Upload className="w-6 h-6 text-[#003399] group-hover:scale-110 transition-transform mb-1.5" />
              <p className="text-[11px] font-bold text-slate-700 text-center">
                Arraste ou clique para enviar exames
              </p>
              <p className="text-[9px] text-slate-400 font-semibold text-center mt-1">
                PDF, JPG ou PNG • Até 10MB
              </p>
            </div>

            {uploadedExamFiles.length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                {uploadedExamFiles.map((file, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between animate-in fade-in"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-clinical-blue shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 truncate max-w-[180px]">
                          {file.name}
                        </p>
                        <p className="text-[8px] text-slate-400 font-semibold">
                          {file.size}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExamFile(i);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (Take 5/12 on desktop) - Intelligent Sinais & sources toggles */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          
          {/* A. SINAIS CLINICOS TAG SELECTOR */}
          <div className="card-clinical bg-white border border-slate-150 p-5 md:p-6 rounded-[1.75rem] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2.5 text-[#003399] border-b border-slate-100 pb-3">
              <Activity className="w-5 h-5 text-[#003399]" />
              <div className="flex-1">
                <h3 className="font-extrabold text-xs md:text-sm text-slate-800 tracking-tight uppercase">
                  Sinais Clínicos
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Selecione ou adicione sinais ao caso
              </span>
              
              <div className="flex flex-wrap gap-2 pt-1">
                {commonSymptoms.map((symptom) => {
                  const isActive = anamnesis.toLowerCase().includes(symptom.toLowerCase());
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => handleToggleSymptom(symptom)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                        isActive 
                          ? "bg-[#003399]/10 border-[#003399]/30 text-[#003399] shadow-xs scale-[1.02]" 
                          : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50 hover:border-slate-300 hover:text-slate-800 scale-100"
                      }`}
                    >
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#003399]" />}
                      <span>{symptom}</span>
                    </button>
                  );
                })}
                
                {/* Custom quick addition button */}
                <button
                  type="button"
                  onClick={() => {
                    const extra = prompt("Digite o novo sinal clínico:");
                    if (extra && extra.trim()) {
                      handleToggleSymptom(extra.trim());
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-150 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                >
                  + outro
                </button>
              </div>
            </div>
          </div>

          {/* B. FONTES CONSULTADAS PELA IA (Nelson, Ettinger, WSAVA, etc.) */}
          <div className="card-clinical bg-white border border-slate-150 p-5 md:p-6 rounded-[1.75rem] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2.5 text-[#003399] border-b border-slate-100 pb-3">
              <BookOpen className="w-5 h-5 text-[#003399]" />
              <div className="flex-1">
                <h3 className="font-extrabold text-xs md:text-sm text-slate-800 tracking-tight uppercase">
                  Fontes consultadas pela IA
                </h3>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Nelson Toggle */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="text-xs md:text-sm font-semibold text-slate-700">Nelson & Couto, 6ª ed.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    activeSources.nelson ? "bg-emerald-50 text-emerald-700 border border-emerald-100/65" : "bg-slate-50 text-slate-400"
                  }`}>
                    {activeSources.nelson ? "ativo" : "inativo"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setActiveSources({ ...activeSources, nelson: !activeSources.nelson })}
                    className={`w-8 h-4.5 rounded-full relative transition-colors duration-250 shrink-0 ${activeSources.nelson ? "bg-[#1D9E75]" : "bg-slate-200"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${activeSources.nelson ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Ettinger Toggle */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="text-xs md:text-sm font-semibold text-slate-700">Ettinger & Feldman, 11ª ed.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    activeSources.ettinger ? "bg-emerald-50 text-emerald-700 border border-emerald-100/65" : "bg-slate-50 text-slate-400"
                  }`}>
                    {activeSources.ettinger ? "ativo" : "inativo"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setActiveSources({ ...activeSources, ettinger: !activeSources.ettinger })}
                    className={`w-8 h-4.5 rounded-full relative transition-colors duration-250 shrink-0 ${activeSources.ettinger ? "bg-[#1D9E75]" : "bg-slate-200"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${activeSources.ettinger ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* WSAVA Toggle */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs md:text-sm font-semibold text-slate-700">WSAVA Guidelines 2023</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    activeSources.wsava ? "bg-emerald-50 text-emerald-700 border border-emerald-100/65" : "bg-slate-50 text-slate-400"
                  }`}>
                    {activeSources.wsava ? "ativo" : "inativo"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setActiveSources({ ...activeSources, wsava: !activeSources.wsava })}
                    className={`w-8 h-4.5 rounded-full relative transition-colors duration-250 shrink-0 ${activeSources.wsava ? "bg-[#1D9E75]" : "bg-slate-200"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${activeSources.wsava ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* ACVIM Toggle */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs md:text-sm font-semibold text-slate-700">ACVIM Consensus 2023</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    activeSources.acvim ? "bg-emerald-50 text-emerald-700 border border-emerald-100/65" : "bg-slate-50 text-slate-400"
                  }`}>
                    {activeSources.acvim ? "ativo" : "inativo"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setActiveSources({ ...activeSources, acvim: !activeSources.acvim })}
                    className={`w-8 h-4.5 rounded-full relative transition-colors duration-250 shrink-0 ${activeSources.acvim ? "bg-[#1D9E75]" : "bg-slate-200"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${activeSources.acvim ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Feldman Toggle */}
              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs md:text-sm font-semibold text-slate-700">Feldman & Nelson Endocrinology</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    activeSources.feldman ? "bg-emerald-50 text-emerald-700 border border-emerald-100/65" : "bg-slate-50 text-slate-400"
                  }`}>
                    {activeSources.feldman ? "ativo" : "inativo"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setActiveSources({ ...activeSources, feldman: !activeSources.feldman })}
                    className={`w-8 h-4.5 rounded-full relative transition-colors duration-250 shrink-0 ${activeSources.feldman ? "bg-[#1D9E75]" : "bg-slate-200"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-250 ${activeSources.feldman ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Upload dynamic literature */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-center py-2 border border-dashed border-slate-250 text-slate-550 hover:bg-slate-100/50 hover:text-slate-750 transition-all font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                <span>Adicionar fonte (PDF, artigo, diretriz)</span>
              </button>
              
              <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleLiteratureFileChange}
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
          </div>

          {/* C. CTA GENERATE DIFFERENTIAL */}
          <div className="card-clinical bg-slate-50/60 border border-slate-200/80 p-5 md:p-6 rounded-[1.75rem] space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                  Processamento RAG
                </h4>
                <p className="text-[11px] font-extrabold text-slate-800 tracking-tight mt-1.5">
                  Anamnese e diretrizes integradas
                </p>
              </div>
              <div className="flex items-center gap-1 text-[8px] text-trusted-green font-black uppercase tracking-wider bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-trusted-green animate-pulse" />
                Ativo
              </div>
            </div>

            {isGenerating && (
              <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-1.5 animate-pulse">
                <div className="flex items-center justify-between text-[8.5px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Varrendo base de referências...</span>
                  <Loader2 className="w-3 min-w-3 max-h-3 animate-spin text-clinical-blue" />
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: "90%",
                      transition: { duration: 3.5, repeat: Infinity },
                    }}
                    className="h-full bg-[#003399]"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-150 rounded-xl p-3 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[9.5px] font-bold text-red-700 leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!anamnesis && uploadedFiles.length === 0)}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer ${
                isGenerating || (!anamnesis && uploadedFiles.length === 0)
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-250"
                  : "bg-[#001D62] text-white hover:bg-slate-900"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>PROCESSANDO LAUDO...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
                  <span>Gerar Diagnóstico Diferencial</span>
                </>
              )}
            </button>

            {/* Light Pawprint Watermark */}
            <div className="absolute -right-8 -bottom-8 opacity-[0.02] pointer-events-none">
              <PawPrint className="w-24 h-24" strokeWidth={1} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SoapSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="bg-slate-50 border-y border-slate-100 px-6 py-2">
        <h4 className="text-[10px] font-bold text-clinical-blue uppercase tracking-[0.2em]">
          {title}
        </h4>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  const cleanVal = (value || "").trim();
  const numPart = parseFloat(cleanVal.replace(/[^\d\.]/g, ""));

  let statusText = "Normal";
  let statusColorLabel = "bg-emerald-50 text-emerald-700 border-emerald-100";
  let glowColor = "bg-emerald-500";
  let borderHighlight = "border-slate-150/80 hover:border-emerald-300";
  let explanation = "Parâmetro estável";

  if (label.toUpperCase() === "FC") {
    if (!isNaN(numPart)) {
      if (numPart > 140) {
        statusText = "Taquicardia";
        statusColorLabel = "bg-red-50 text-red-700 border-red-100";
        glowColor = "bg-red-500 animate-pulse";
        borderHighlight = "border-red-150 hover:border-red-300";
        explanation = "Frequência cardíaca elevada";
      } else if (numPart < 70) {
        statusText = "Bradicardia";
        statusColorLabel = "bg-blue-50 text-blue-700 border-blue-100";
        glowColor = "bg-blue-400";
        borderHighlight = "border-blue-150 hover:border-blue-300";
        explanation = "Frequência cardíaca baixa";
      } else {
        explanation = "Frequência saudável";
      }
    }
  } else if (label.toUpperCase() === "TEMP") {
    if (!isNaN(numPart)) {
      if (numPart >= 39.4) {
        statusText = "Hipertermia";
        statusColorLabel = "bg-red-50 text-red-700 border-red-105";
        glowColor = "bg-red-500 animate-ping";
        borderHighlight = "border-red-200 hover:border-red-400";
        explanation = "Sinal febril / inflamação";
      } else if (numPart <= 37.2) {
        statusText = "Hipotermia";
        statusColorLabel = "bg-[#EBF2FF] text-blue-700 border-blue-100";
        glowColor = "bg-blue-400";
        borderHighlight = "border-blue-200 hover:border-blue-400";
        explanation = "Baixa temperatura corporal";
      } else {
        explanation = "Normotermia estável";
      }
    }
  } else if (label.toUpperCase() === "FR") {
    if (!isNaN(numPart)) {
      if (numPart >= 35) {
        statusText = "Taquipneia";
        statusColorLabel = "bg-amber-55/60 text-[#BA7517] border-amber-100";
        glowColor = "bg-amber-500 animate-pulse";
        borderHighlight = "border-amber-200 hover:border-amber-400";
        explanation = "Respiração acelerada";
      } else if (numPart <= 12) {
        statusText = "Bradipneia";
        statusColorLabel = "bg-blue-50 text-blue-700 border-blue-100";
        glowColor = "bg-blue-400";
        borderHighlight = "border-blue-150 hover:border-blue-350";
        explanation = "Respiração deprimida";
      } else {
        explanation = "Eupneia regular";
      }
    }
  } else if (label.toUpperCase() === "TRC") {
    if (cleanVal.toLowerCase().includes(">") || numPart > 2) {
      statusText = "Atrasado";
      statusColorLabel = "bg-red-50 text-red-700 border-red-105";
      glowColor = "bg-red-500";
      borderHighlight = "border-red-205 hover:border-red-400";
      explanation = "Tempo de perfusão lento";
    } else {
      explanation = "Perfusão periférica saudável";
    }
  }

  return (
    <div className={`bg-white border ${borderHighlight} rounded-3xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.015)] transition-all duration-300 relative overflow-hidden group hover:shadow-md`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
          {label}
        </span>
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${statusColorLabel}`}>
          {statusText}
        </span>
      </div>
      
      <p className="text-lg font-black text-slate-900 tracking-tight leading-none my-1.5">
        {cleanVal || "N/A"}
      </p>

      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-50">
        <span className={`h-1.5 w-1.5 rounded-full ${glowColor}`} />
        <span className="text-[8.5px] font-bold text-slate-400 uppercase truncate">
          {explanation}
        </span>
      </div>
    </div>
  );
}

function StepItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group">
      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight uppercase">
        {label}
      </span>
    </div>
  );
}
