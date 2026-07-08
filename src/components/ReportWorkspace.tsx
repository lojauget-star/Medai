import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Save,
  Send,
  Clipboard,
  Printer,
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
  MessageSquare,
  Stethoscope,
  Check,
  Copy,
  Zap,
  Database,
  ArrowLeft,
  Menu,
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
  getDocs,
  query,
  orderBy,
  setDoc,
  where,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Patient, Report } from "../types";
import VetmindLogo from "./VetmindLogo";

function ClinicalMarkdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
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
    </div>
  );
}

interface DifferentialDiagnosis {
  title: string;
  probability: number;
  probabilityText: string;
  justification: string;
  literature: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  type?: "text" | "clinical_observation" | "system" | "file";
  fileName?: string;
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

    const probMatch = cleanLine.match(/(?:^|[\-\*\d\.\s]+)\**([^*%\-\–\+]+?)\**\s*[-–]\s*(\d+)\s*%\s*(?:de\s+)?Probabilidade/i) || 
                      cleanLine.match(/(?:^|[\-\*\d\.\s]+)\**([^*%\-\–\+]+?)\**\s*[-–]\s*(\d+)\s*%/i);

    if (probMatch && !cleanLine.includes("Por que esta causa") && !cleanLine.includes("Embasamento")) {
      if (currentDiag && currentDiag.title) {
        diagnoses.push(currentDiag as DifferentialDiagnosis);
      }
      const titleRaw = probMatch[1].replace(/^\*+/, "").replace(/\*+$/, "").trim();
      const title = titleRaw
        .replace(/^[0-9]+[\.\-\s]+/, "")
        .replace(/^[ºª\d\.\-\:\s]+/, "")
        .trim();
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
          const treatedLine = cleanLine.startsWith("-") || cleanLine.startsWith("*") ? cleanLine.substring(1).trim() : cleanLine;
          currentDiag.justification = (currentDiag.justification || "") + (currentDiag.justification ? "\n" : "") + treatedLine;
        }
      }
    }
  }

  if (currentDiag && currentDiag.title) {
    diagnoses.push(currentDiag as DifferentialDiagnosis);
  }

  return diagnoses;
}

function DifferentialCards({ text, onSuggestExams, onSuggestProtocol, onGeneratePrescriptionForDiag }: { text: string; onSuggestExams?: (title: string, exams: string[]) => void; onSuggestProtocol?: (title: string, protocol: string) => void; onGeneratePrescriptionForDiag?: (title: string) => void }) {
  const diags = parseClinicsDiferenciais(text);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [activeProtocolIndex, setActiveProtocolIndex] = useState<number | null>(null);

  if (diags.length === 0) {
    return (
      <div className="text-sm text-slate-750 leading-relaxed max-w-prose space-y-3 font-medium bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <ClinicalMarkdown>{text}</ClinicalMarkdown>
      </div>
    );
  }

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
    return ["Análise clínica sugerida", "Ultrassom de triagem", "Perfil bioquímico geral"];
  };

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
      return "Estabilização álgica imperativa com anti-inflamatórios ou analgésicos opioides sob demanda. Fluidoestimulação oral ou parenteral. Se houver desobstrução necessária, sondagem uretral imediata sob anestesia de curta duração.";
    }
    return "Manejo de suporte inicial: controle álgico preventivo, monitoramento de parâmetros vitais (FC, FR, Temp, Mucosas e nível de consciência) e repouso térmico controlado. Agendamento ágil de exames diagnósticos complementares de triagem.";
  };

  return (
    <div className="flex flex-col gap-4 font-sans w-full animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-2.5">
        {diags.map((diag, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <button
              key={`pill-${index}`}
              onClick={() => {
                setExpandedIndex(isExpanded ? null : index);
                setActiveProtocolIndex(null);
              }}
              className={`px-4 py-2 rounded-full font-bold text-xs border transition-all flex items-center gap-2 cursor-pointer outline-none hover:scale-[1.02] active:scale-95 ${
                isExpanded 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10" 
                : "bg-slate-50 text-slate-700 border-slate-200/60 hover:bg-slate-100/80 shadow-3xs"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shadow-inner ${isExpanded ? "bg-white" : "bg-indigo-600"}`} />
              <span>{diag.title}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ml-1 ${isExpanded ? "bg-indigo-700 text-white" : "bg-slate-200/80 text-slate-650"}`}>
                {diag.probability}%
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {expandedIndex !== null && diags[expandedIndex] && (
          <motion.div
            key={`accordion-${expandedIndex}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 rounded-2xl border border-slate-150 shadow-md p-6 mt-1 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-3">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold font-display text-slate-900 text-base">
                  {diags[expandedIndex].title}
                </h4>
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-mono ml-auto">
                  {diags[expandedIndex].probabilityText} Compatibilidade
                </span>
              </div>

              <div className="space-y-5">
                {diags[expandedIndex].justification && (
                  <div className="space-y-1.5 text-left">
                    <div className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 shrink-0" />
                      Justificativa & Raciocínio Clínico
                    </div>
                    <p className="text-slate-750 text-sm leading-relaxed font-semibold bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/40 whitespace-pre-wrap break-words">
                      {diags[expandedIndex].justification}
                    </p>
                  </div>
                )}

                {diags[expandedIndex].literature && (
                  <div className="space-y-1.5 text-left">
                    <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      Embasamento Literário (Consensos & Diretrizes)
                    </div>
                    <div className="text-sm text-slate-750 leading-relaxed font-semibold bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/40 whitespace-pre-wrap break-words">
                      <ClinicalMarkdown>{diags[expandedIndex].literature}</ClinicalMarkdown>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
                    Exames Sugeridos Confirmatórios
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {getExamsForDiagnosis(diags[expandedIndex].title).map((exam, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-3xs rounded-xl text-xs font-bold text-slate-750">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{exam}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-4 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap gap-2.5">
                    {!activeProtocolIndex ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProtocolIndex(expandedIndex);
                          if (onSuggestProtocol) {
                            onSuggestProtocol(diags[expandedIndex].title, getInitialSupportProtocols(diags[expandedIndex].title));
                          }
                        }}
                        className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 hover:border-slate-350 text-indigo-650 border border-slate-200 font-bold px-5 py-2.5 rounded-full text-xs transition-all shadow-3xs cursor-pointer"
                      >
                        <Pill className="w-4 h-4 text-indigo-600" />
                        Ver Protocolo e Dosagens
                      </button>
                    ) : (
                      <div className="w-full space-y-2.5">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2">
                            <div className="flex items-center gap-1.5 text-left">
                              <Pill className="w-4 h-4 text-indigo-600" />
                              <h5 className="font-bold text-xs text-indigo-600 uppercase tracking-wider">
                                Protocolo Emergencial / Suporte
                              </h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveProtocolIndex(null)}
                              className="p-1 rounded-full hover:bg-indigo-100 text-indigo-600/60 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-xs text-slate-750 leading-relaxed font-semibold whitespace-pre-wrap break-words text-left">
                            {getInitialSupportProtocols(diags[expandedIndex].title)}
                          </div>
                        </div>
                      </div>
                    )}

                    {onGeneratePrescriptionForDiag && (
                      <button
                        type="button"
                        onClick={() => onGeneratePrescriptionForDiag(diags[expandedIndex].title)}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-all shadow-md shadow-indigo-600/15 cursor-pointer hover:scale-[1.02] active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        Gerar Prescrição para este Diagnóstico
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InteractiveSources({ sources }: { sources: any[] }) {
  const [activeTab, setActiveTab] = useState<"guidelines" | "pdfs">("guidelines");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

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

  useEffect(() => {
    if (sortedGuidelines.length === 0 && sortedPdfs.length > 0) {
      setActiveTab("pdfs");
    } else if (sortedPdfs.length === 0 && sortedGuidelines.length > 0) {
      setActiveTab("guidelines");
    }
  }, [sources]);

  const activeCollection = activeTab === "guidelines" ? sortedGuidelines : sortedPdfs;

  return (
    <div className="bg-slate-50 border border-slate-150 rounded-[1.5rem] p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2 text-slate-800">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 leading-tight">
            Acervo Científico e Fontes
          </h3>
        </div>

        <div className="flex bg-slate-100 border border-slate-200/50 p-1 rounded-xl shrink-0">
          {sortedGuidelines.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("guidelines");
                setActiveIdx(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "guidelines" ? "bg-white text-indigo-600 shadow-3xs" : "text-slate-500 hover:text-slate-800"
              }`}
              type="button"
            >
              Manuais ({sortedGuidelines.length})
            </button>
          )}
          {sortedPdfs.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("pdfs");
                setActiveIdx(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "pdfs" ? "bg-white text-indigo-600 shadow-3xs" : "text-slate-500 hover:text-slate-800"
              }`}
              type="button"
            >
              PDFs ({sortedPdfs.length})
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {activeCollection.map((item, idx) => {
          const isObj = typeof item === "object" && item !== null;
          const topic = isObj ? item.topic : String(item);
          const content = isObj ? item.content : null;

          const match = topic.match(/\[(.*?)\]/);
          const displayTopic = match ? topic.replace(/\[.*?\]/, "").trim() : topic;
          const citeInfo = match ? match[1] : activeTab === "pdfs" ? "Tratado Veterinário" : "Manual de Práticas";
          const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(citeInfo + " " + displayTopic)}`;
          const isOpen = activeIdx === idx;

          return (
            <div
              key={idx}
              className={`border rounded-xl transition-all ${
                isOpen ? "border-indigo-200 bg-white shadow-sm" : "border-slate-100 bg-white hover:bg-slate-50/50"
              }`}
            >
              <button
                onClick={() => setActiveIdx(isOpen ? null : idx)}
                className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-slate-850"
                type="button"
              >
                <div>
                  <p className="text-xs font-extrabold text-slate-800 leading-snug">{displayTopic}</p>
                  <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest mt-0.5">{citeInfo}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-250 ${isOpen ? "rotate-90 text-indigo-600" : ""}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                  >
                    <div className="p-3.5 space-y-2.5">
                      {content ? (
                        <div className="text-xs text-slate-700 leading-relaxed font-semibold bg-white p-4 border border-slate-150 rounded-xl font-mono text-[11px] whitespace-pre-line shadow-inner relative">
                          {(() => {
                            const terms = [
                              "ovariohisterectomia", "piometra", "obstrução uretral", "rins", "creatinina", "insulina", "Trilostano", "corticoides",
                              "secreção vaginal", "polidipsia", "ureia", "bexiga", "cistite", "urolitíase", "hematúria", "prurido", "ceruminosa", "eritromicina"
                            ];
                            let highlightedContent = content;
                            terms.forEach(term => {
                              const regex = new RegExp(`\\b(${term})\\b`, "gi");
                              highlightedContent = highlightedContent.replace(regex, `MARK_START$1MARK_END`);
                            });
                            const parts = highlightedContent.split(/(MARK_START.*?MARK_END)/g);
                            return parts.map((part, pidx) => {
                              if (part.startsWith("MARK_START") && part.endsWith("MARK_END")) {
                                const cleanText = part.replace("MARK_START", "").replace("MARK_END", "");
                                return (
                                  <span key={pidx} className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md mx-0.5 inline-block text-[11px]">
                                    {cleanText}
                                  </span>
                                );
                              }
                              return <span key={pidx}>{part}</span>;
                            });
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Diretriz validada na base de dados.</p>
                      )}

                      <div className="flex gap-2">
                        <a
                          href={scholarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver no Scholar
                        </a>
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
    anamnesis: "Fêmea inteira de 9 anos com secreção vaginal purulenta abundante e aumento moderado de ingestão de água (polidipsia) observado após 6 semanas do último estro.",
  },
  {
    title: "Otite Externa Bilateral",
    icon: "🐕",
    species: "Canino",
    breed: "Golden Retriever",
    age: "4 anos",
    sex: "Macho inteiro",
    weight: "34 kg",
    anamnesis: "Paciente Golden Retriever, 4 anos, macho, com prurido intenso em orelhas bilateralmente há 10 dias. Balança muito a cabeça. Ao exame físico: eritema acentuado em conduto auditivo externo bilateral, secreção ceruminosa marrom abundante com odor fétido.",
  },
  {
    title: "Bexigoma Felino (Obstrução)",
    icon: "🐈",
    species: "Felino",
    breed: "SRD",
    age: "3 anos",
    sex: "Macho castrado",
    weight: "4.5 kg",
    anamnesis: "Felino, SRD, 3 anos, macho castrado. Tutor relata estrangúria, hematúria e vocalização ao tentar usar a caixa de areia há 24h. Hoje apático e anoréxico. Ao exame físico: bexiga extremamente distendida, rígida e dolorosa.",
  }
];

const STATIC_REFERENCES = [
  { id: "Bioquímica Renal em Cães", title: "Bioquímica Renal em Cães", source: "Nelson & Couto, Medicina Interna, Cap. 38", type: "static" as const },
  { id: "Enzimas Hepáticas Felinas", title: "Enzimas Hepáticas Felinas", source: "Nelson & Couto, Medicina Interna, Cap. 45", type: "static" as const },
  { id: "Obstrução Digestiva e Gastroenterites", title: "Obstrução Digestiva e Gastroenterites", source: "Fossum, Cirurgia de Pequenos Animais, Cap. 18", type: "static" as const },
  { id: "Diretrizes de Manejo de Dor em Cães", title: "Manejo de Dor em Cães", source: "WSAVA Pain Guidelines", type: "static" as const },
  { id: "Tratamento de Cardiomiopatia Dilatada", title: "Cardiomiopatia Dilatada", source: "ACVIM Consensus, pág. 8-14", type: "static" as const },
  { id: "Hérnia Perineal em Cães", title: "Hérnia Perineal em Cães", source: "Fossum, Cirurgia de Pequenos Animais, Cap. 19", type: "static" as const },
];

export default function ReportWorkspace({
  initialReport,
  initialPatient,
  onBack,
  onTransformToSocial,
  onNavigateToSignature,
  onToggleMenu,
}: {
  initialReport?: Report | null;
  initialPatient?: Partial<Patient> | null;
  onBack?: () => void;
  onTransformToSocial?: (data: {
    queixa?: string;
    exames?: string;
    tecnica?: string;
    desfecho?: string;
  }) => void;
  onNavigateToSignature?: () => void;
  onToggleMenu?: () => void;
}) {
  const [step, setStep] = useState<"input" | "result">(initialReport ? "result" : "input");
  const [showReferencesSettings, setShowReferencesSettings] = useState(false);
  const [disabledReferences, setDisabledReferences] = useState<string[]>([]);
  const [dbGuidelines, setDbGuidelines] = useState<any[]>([]);
  const [pdfGuidelines, setPdfGuidelines] = useState<any[]>([]);
  const [savedPatients, setSavedPatients] = useState<Patient[]>([]);

  const uniqueReferences = React.useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    [...STATIC_REFERENCES, ...dbGuidelines, ...pdfGuidelines].forEach((ref) => {
      if (ref && ref.id && !seen.has(ref.id)) {
        seen.add(ref.id);
        result.push(ref);
      }
    });
    return result;
  }, [dbGuidelines, pdfGuidelines]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchSavedPatients = async () => {
      try {
        const q = query(
          collection(db, "patients"),
          where("ownerId", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const list: Patient[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Patient);
        });
        setSavedPatients(list);
      } catch (err) {
        console.error("Erro ao carregar pacientes cadastrados:", err);
      }
    };
    fetchSavedPatients();
  }, []);

  useEffect(() => {
    const fetchDbGuidelines = async () => {
      try {
        const q = query(collection(db, 'guidelines'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.title || "Diretriz Customizada",
            title: data.title || "Diretriz Customizada",
            source: data.source || "Banco Customizado",
            type: "database"
          };
        });
        setDbGuidelines(list);
      } catch (err) {
        console.error("Erro ao carregar diretrizes do DB no workspace:", err);
      }
    };

    const fetchPdfGuidelines = async () => {
      try {
        const response = await fetch('/api/admin/guidelines-pdfs');
        if (response.ok) {
          const data = await response.json();
          const list = (data.files || []).map((f: any) => ({
            id: f.name,
            title: f.name,
            source: `PDF • ${f.size}`,
            type: "pdf"
          }));
          setPdfGuidelines(list);
        }
      } catch (err) {
        console.error("Erro ao carregar PDFs de referência no workspace:", err);
      }
    };

    fetchDbGuidelines();
    fetchPdfGuidelines();
  }, []);

  const [showPresets, setShowPresets] = useState(false);
  const [patient, setPatient] = useState<Partial<Patient>>(() => {
    if (initialPatient) {
      return {
        name: initialPatient.name || "",
        species: initialPatient.species || "",
        breed: initialPatient.breed || "",
        age: initialPatient.age || "",
        sex: initialPatient.sex || "",
        weight: initialPatient.weight || "",
        tutorName: initialPatient.tutorName || "",
        tutorPhone: initialPatient.tutorPhone || "",
      };
    }
    return {
      name: initialReport?.patientId || "",
      species: initialReport?.patientSpecies || "",
      breed: initialReport?.patientBreed || "",
      age: initialReport?.patientAge || "",
      sex: initialReport?.patientSex || "",
      weight: initialReport?.patientWeight || "",
      tutorName: (initialReport as any)?.tutorName || "",
      tutorPhone: (initialReport as any)?.tutorPhone || "",
    };
  });
  const [anamnesis, setAnamnesis] = useState(initialReport?.anamnesis || "");
  const [examData, setExamData] = useState(initialReport?.examData || "");

  useEffect(() => {
    if (initialPatient) {
      setPatient({
        name: initialPatient.name || "",
        species: initialPatient.species || "",
        breed: initialPatient.breed || "",
        age: initialPatient.age || "",
        sex: initialPatient.sex || "",
        weight: initialPatient.weight || "",
        tutorName: initialPatient.tutorName || "",
        tutorPhone: initialPatient.tutorPhone || "",
      });
      setAnamnesis("");
      setExamData("");
      setStep("input");
    }
  }, [initialPatient]);
  const [uploadedExamFiles, setUploadedExamFiles] = useState<
    { name: string; size: string; data?: string; mimeType?: string }[]
  >([]);
  const [uploadedLiteratureFiles, setUploadedLiteratureFiles] = useState<
    { name: string; size: string; data?: string; mimeType?: string }[]
  >([]);
  const uploadedFiles = [...uploadedExamFiles, ...uploadedLiteratureFiles];

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const [generatedReport, setGeneratedReport] = useState<string | null>(initialReport?.soapContent || null);
  const [sources, setSources] = useState<any[]>(initialReport?.sources || []);
  const [error, setError] = useState<string | null>(null);

  // Active sub-tab in the results column
  const [activeSubTab, setActiveSubTab] = useState<"soap" | "rag" | "prescriptions" | "whatsapp">("soap");

  // Legal/Clinical responsibility sign-off states
  const [isSigned, setIsSigned] = useState(() => {
    const val = localStorage.getItem("vetmind_signature_signed");
    return val === null ? true : val === "true";
  });
  const [signerName, setSignerName] = useState(() => localStorage.getItem("vetmind_signature_name") || "Dr. Roberto Silva");
  const [signerCrmv, setSignerCrmv] = useState(() => localStorage.getItem("vetmind_signature_crmv") || "SP-14892");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Prescription and calculator
  const [prescription, setPrescription] = useState<string | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [prescriptionEditVal, setPrescriptionEditVal] = useState("");
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);
  const [routeOfAdmin, setRouteOfAdmin] = useState<string>("auto");
  const [calcWeight, setCalcWeight] = useState<string>("");

  // AI-generated Tutor Message states
  const [aiTutorMessage, setAiTutorMessage] = useState<string | null>(null);
  const [isGeneratingTutorMessage, setIsGeneratingTutorMessage] = useState(false);
  const [tutorMessageError, setTutorMessageError] = useState<string | null>(null);

  useEffect(() => {
    if (patient?.weight) {
      setCalcWeight(patient.weight.toString());
    }
  }, [patient?.weight]);

  // Feedback states
  const [savedReportId, setSavedReportId] = useState<string | null>(initialReport?.id || null);
  const [rating, setRating] = useState<number>(initialReport?.rating || 0);
  const [feedbackComment, setFeedbackComment] = useState<string>(initialReport?.feedbackComment || "");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(!!initialReport?.rating);
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Audio recording simulation & live
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'real' | 'simulated'>('simulated');

  // File states
  const examInputRef = useRef<HTMLInputElement>(null);

  // Chat and Mobile Optimization States
  const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'result'>('chat');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [currentMessageText, setCurrentMessageText] = useState("");
  const [isFollowupGenerating, setIsFollowupGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome",
        sender: "ai",
        text: "Olá! Sou seu Assistente Clínico Inteligente Vetmind 🧠. Me conte as queixas e observações clínicas do seu paciente da forma que preferir (fale por áudio, digite ou anexe exames). \n\nIrei correlacionar todas as informações para estruturar o Prontuário SOAP e gerar as melhores hipóteses diagnósticas com embasamento literário!",
        timestamp: new Date()
      }
    ];
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Synchronize on load or when initialReport changes
  useEffect(() => {
    if (initialReport) {
      setPatient({
        name: initialReport.patientId,
        species: initialReport.patientSpecies || "",
        breed: initialReport.patientBreed || "",
        age: initialReport.patientAge || "",
        sex: initialReport.patientSex || "",
        weight: initialReport.patientWeight || "",
      });
      setCalcWeight(initialReport.patientWeight || "");
      setAnamnesis(initialReport.anamnesis || "");
      setExamData(initialReport.examData || "");
      setUploadedExamFiles(initialReport.uploadedExamFiles || []);
      setUploadedLiteratureFiles(initialReport.uploadedLiteratureFiles || []);
      setGeneratedReport(initialReport.soapContent || null);
      setSources(initialReport.sources || []);
      setSavedReportId(initialReport.id || null);
      setStep("result");
    } else {
      setSavedReportId(null);
    }
  }, [initialReport]);

  // Simulated & Real Voice recording countdown
  useEffect(() => {
    let timerInterval: any;
    if (isRecording) {
      timerInterval = setInterval(() => {
        setRecordTimer((prev) => {
          if (prev >= 15 && recordingMode === 'simulated') {
            setIsRecording(false);
            const baseTxt = patient.species === "Felino" 
              ? "Felino macho de 3 anos, apático, com bexiga pétrea dolorosa ao toque. Não consegue urinar."
              : "Canino fêmea idosa com poliúria, polidipsia severa e corrimento vaginal fétido há 5 dias.";
            setAnamnesis(baseTxt);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(timerInterval);
  }, [isRecording, recordingMode, patient.species]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (recordingMode === 'real' && mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      } else {
        setIsRecording(false);
        const baseTxt = patient.species === "Felino" 
          ? "Felino macho de 3 anos, apático, com bexiga pétrea dolorosa ao toque. Não consegue urinar."
          : "Canino fêmea idosa com poliúria, polidipsia severa e corrimento vaginal fétido há 5 dias.";
        
        const newMsg: ChatMessage = {
          id: "stt-sim-" + Date.now(),
          sender: "user",
          text: baseTxt,
          timestamp: new Date()
        };
        setChatMessages(prev => {
          const updated = [...prev, newMsg];
          const cons = updated.filter(m => m.sender === "user").map(m => m.text).join("\n\n");
          setAnamnesis(cons);
          return updated;
        });

        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            id: "stt-sim-ack-" + Date.now(),
            sender: "ai",
            text: "🎙️ Áudio simulado recebido e adicionado com sucesso ao prontuário! Deseja complementar com mais algum sintoma ou examinar?",
            timestamp: new Date()
          }]);
        }, 800);
      }
    } else {
      setRecordTimer(0);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
          setIsTranscribing(true);
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(",")[1];
            try {
              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioData: base64Audio,
                  mimeType: "audio/webm",
                }),
              });
              if (response.ok) {
                const data = await response.json();
                if (data.transcription) {
                  const newMsg: ChatMessage = {
                    id: "stt-" + Date.now(),
                    sender: "user",
                    text: data.transcription,
                    timestamp: new Date()
                  };
                  setChatMessages(prev => {
                    const updated = [...prev, newMsg];
                    const cons = updated.filter(m => m.sender === "user").map(m => m.text).join("\n\n");
                    setAnamnesis(cons);
                    return updated;
                  });

                  setTimeout(() => {
                    setChatMessages(prev => [...prev, {
                      id: "stt-ack-" + Date.now(),
                      sender: "ai",
                      text: "🎙️ Transcrição realizada com absoluto sucesso! Sinais clínicos consolidados. Pronto para prosseguir com a análise.",
                      timestamp: new Date()
                    }]);
                  }, 800);
                }
              }
            } catch (err) {
              console.error("Transcription error:", err);
            } finally {
              setIsTranscribing(false);
            }
          };
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setRecordingMode('real');
        setIsRecording(true);
      } catch (err) {
        console.warn("Microphone access denied or unavailable, falling back to clinical simulation:", err);
        setRecordingMode('simulated');
        setIsRecording(true);
      }
    }
  };

  // Handle preset clicks inside Chat dynamic context
  const handleSelectPreset = (p: typeof clinicalPresets[0]) => {
    setPatient({
      name: p.title.split(" ")[0] + "da",
      species: p.species,
      breed: p.breed,
      age: p.age,
      sex: p.sex,
      weight: p.weight.replace(" kg", ""),
    });
    setCalcWeight(p.weight.replace(" kg", ""));
    
    const welcome: ChatMessage = {
      id: "welcome",
      sender: "ai",
      text: "Olá! Sou seu Assistente Clínico Inteligente Vetmind 🧠. Me conte as queixas e observações clínicas do seu paciente da forma que preferir.",
      timestamp: new Date()
    };
    const userMsg: ChatMessage = {
      id: "preset-" + Date.now(),
      sender: "user",
      text: `📥 Carregado Caso Clínico de Teste: *${p.title}*\n\n${p.anamnesis}`,
      timestamp: new Date()
    };
    const aiAck: ChatMessage = {
      id: "preset-ack-" + Date.now(),
      sender: "ai",
      text: `Entendido! Paciente **${p.title.split(" ")[0] + "da"}** de espécie **${p.species}** (${p.breed || "SRD"}) carregado. Os dados informados já foram devidamente vinculados ao prontuário.\n\nDeseja adicionar mais informações ou quer que eu elabore o laudo agora? Se estiver pronto, clique em **Analisar Caso**!`,
      timestamp: new Date()
    };

    setChatMessages([welcome, userMsg, aiAck]);
    setAnamnesis(p.anamnesis);
    setShowPresets(false);
  };

  const handleSendMessage = async () => {
    if (!currentMessageText.trim() || isFollowupGenerating) return;

    const textToSend = currentMessageText.trim();
    setCurrentMessageText(""); // Clear input immediately for instant UX feedback

    // Generate unique ID with random suffix to avoid duplicate React keys when typing fast
    const userMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000000),
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    // Add message to chat list
    setChatMessages((prev) => [...prev, userMsg]);

    // Keep anamnesis synced ONLY during input mode. In result mode, chat is for followup clinical discussions.
    if (step === "input") {
      setAnamnesis((prev) => {
        return prev ? `${prev}\n\n${textToSend}` : textToSend;
      });
    }

    setIsFollowupGenerating(true);

    try {
      const response = await fetch("/api/chat-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          chatMessages: [...chatMessages, userMsg],
          soapContent: generatedReport,
          message: textToSend,
          disabledReferences
        }),
      });

      if (!response.ok) {
        let errMsg = "Falha na comunicação com a API.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      setChatMessages((prev) => [
        ...prev,
        {
          id: "reply-" + Date.now() + "-" + Math.floor(Math.random() * 1000000),
          sender: "ai",
          text: data.replyText,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error("Error in followup chat:", err);
      const isConfigError = err.message && (
        err.message.includes("GEMINI_API_KEY") || 
        err.message.includes("chave") || 
        err.message.includes("Key") ||
        err.message.includes("API key")
      );

      const errorText = isConfigError
        ? `⚠️ **Erro de Configuração no Netlify:**\n\n${err.message}\n\nOs sintomas clínicos foram salvos temporariamente no navegador. Por favor, acesse o painel de configurações do Netlify e certifique-se de definir a variável de ambiente \`GEMINI_API_KEY\` com uma chave de API do Gemini válida.`
        : `📝 Sinais clínicos salvos no prontuário! Quando estiver pronto para a análise completa com geração de diagnósticos diferenciais sistemáticos e revisão RAG profunda, clique em **Analisar Caso**.`;

      setChatMessages((prev) => [
        ...prev,
        {
          id: "reply-err-" + Date.now() + "-" + Math.floor(Math.random() * 1000000),
          sender: "ai",
          text: errorText,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsFollowupGenerating(false);
    }
  };

  // Clear all fields & reset chat
  const handleClear = () => {
    setPatient({
      name: "",
      species: "Canino",
      breed: "",
      age: "",
      sex: "Fêmea inteira",
      weight: "",
    });
    setAnamnesis("");
    setExamData("");
    setUploadedExamFiles([]);
    setUploadedLiteratureFiles([]);
    setGeneratedReport(null);
    setPrescription(null);
    setSavedReportId(null);
    setRating(0);
    setFeedbackComment("");
    setFeedbackSubmitted(false);
    setMobileActiveTab('chat');
    setChatMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Olá! Sou seu Assistente Clínico Inteligente Vetmind 🧠. Me conte as queixas e observações clínicas do seu paciente da forma que preferir (fale por áudio, digite ou anexe exames). \n\nIrei correlacionar todas as informações para estruturar o Prontuário SOAP e gerar as melhores hipóteses diagnósticas com embasamento literário!",
        timestamp: new Date()
      }
    ]);
    setStep("input");
  };

  // Run RAG analysis
  const handleGenerate = async () => {
    let activeAnamnesis = anamnesis;

    // Se o usuário digitou algo mas não apertou Enviar, envia e anexa automaticamente
    if (currentMessageText.trim()) {
      const textToSend = currentMessageText.trim();
      setCurrentMessageText(""); // Limpa o campo para feedback visual imediato

      // Cria a mensagem do usuário no chat
      const userMsg: ChatMessage = {
        id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000000),
        sender: "user",
        text: textToSend,
        timestamp: new Date()
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // Atualiza e vincula a anamnese
      activeAnamnesis = activeAnamnesis ? `${activeAnamnesis}\n\n${textToSend}` : textToSend;
      setAnamnesis(activeAnamnesis);
    }

    if (!activeAnamnesis.trim() && uploadedFiles.length === 0) {
      alert("Por favor, digite a anamnese ou selecione um caso de teste para analisar.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedReport(null);
    setPrescription(null);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          anamnesis: activeAnamnesis,
          examData: examData || "Exame físico geral com queixas informadas pelo tutor.",
          files: uploadedFiles.map((f) => ({
            name: f.name,
            data: f.data,
            mimeType: f.mimeType,
          })),
          disabledReferences,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errJson = await response.json();
          throw new Error(errJson.error || "Falha ao gerar o laudo integrado.");
        }
        throw new Error("Falha ao gerar o laudo integrado.");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta do servidor inválida (HTML recebido em vez de JSON). Por favor, tente novamente.");
      }
      const data = await response.json();
      setGeneratedReport(data.soapContent);
      setSources(data.sources || []);
      setStep("result");
      setMobileActiveTab("result"); // Ativa a visualização de laudo no mobile de forma automática
      setActiveSubTab("rag"); // UX Lego/Disney: Inicia diretamente no painel de Diagnósticos Diferenciais RAG
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de rede ao conectar-se ao Vetmind.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePrescription = async (diagTitle?: string) => {
    if (!generatedReport) return;
    setIsGeneratingPrescription(true);
    setError(null);
    const diagToSend = typeof diagTitle === "string" ? diagTitle : selectedDiagnosis;
    if (typeof diagTitle === "string") {
      setSelectedDiagnosis(diagTitle);
    }
    try {
      const response = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          soapContent: generatedReport, 
          patient, 
          disabledReferences,
          selectedDiagnosis: diagToSend,
          routeOfAdmin
        }),
      });
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setPrescription(data.prescription);
          setActiveSubTab("prescriptions"); // UX Lego/Disney: Redireciona com feedback visual de sucesso imediato!
        } else {
          throw new Error("A resposta da prescrição não está no formato JSON esperado.");
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || "Ocorreu um erro ao gerar a prescrição baseada na literatura.");
        } else {
          throw new Error("Erro inesperado no servidor ao processar a prescrição.");
        }
      }
    } catch (err: any) {
      console.error("Prescription error:", err);
      setError(err.message || "Não foi possível conectar ao servidor para gerar a prescrição.");
    } finally {
      setIsGeneratingPrescription(false);
    }
  };

  const handlePrintPrescription = () => {
    const printContent = document.getElementById("printable-prescription-area");
    if (!printContent) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receituário Veterinário - ${patient.name || "Paciente"}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Nunito:wght@700;800;900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body {
                  padding: 1.5cm;
                }
                .no-print {
                  display: none;
                }
              }
              body {
                font-family: 'Inter', sans-serif;
                color: #1e293b;
              }
              h1, h2, h3, h4 {
                font-family: 'Nunito', sans-serif;
              }
            </style>
          </head>
          <body class="bg-white">
            ${printContent.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleGenerateTutorMessage = async () => {
    if (!generatedReport) return;
    setIsGeneratingTutorMessage(true);
    setTutorMessageError(null);
    try {
      const response = await fetch("/api/generate-tutor-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soapContent: generatedReport, patient, prescription }),
      });
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setAiTutorMessage(data.tutorMessage);
        } else {
          throw new Error("A resposta da mensagem não está no formato JSON esperado.");
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || "Ocorreu um erro ao gerar a mensagem estruturada.");
        } else {
          throw new Error("Erro inesperado no servidor ao gerar a mensagem.");
        }
      }
    } catch (err: any) {
      console.error("Tutor message error:", err);
      setTutorMessageError(err.message || "Não foi possível gerar a mensagem humanizada neste momento.");
    } finally {
      setIsGeneratingTutorMessage(false);
    }
  };

  const handleSaveReport = async () => {
    if (!generatedReport || !auth.currentUser) return;

    try {
      const reportData: any = {
        patientId: patient.name || "Paciente Anon",
        patientSpecies: patient.species || "Canino",
        patientBreed: patient.breed || "SRD",
        patientAge: patient.age || "Não informada",
        patientSex: patient.sex || "Fêmea inteira",
        patientWeight: patient.weight || "10",
        anamnesis,
        examData: examData || "Exame clínico físico geral.",
        soapContent: generatedReport,
        prescription,
        sources: sources.map((s: any) => (typeof s === "object" ? s.topic : String(s))),
        uploadedExamFiles: uploadedExamFiles.map((f) => ({ name: f.name, size: f.size })),
        ownerId: auth.currentUser.uid,
        status: "finalized",
        createdAt: serverTimestamp(),
      };

      if (savedReportId) {
        // Update existing document
        const reportDocRef = doc(db, "reports", savedReportId);
        const updateData = {
          ...reportData,
          updatedAt: serverTimestamp(),
        };
        delete updateData.createdAt; // Prevent overwriting original creation time
        await updateDoc(reportDocRef, updateData);

        // Show elegant success dialog
        const successModal = document.createElement("div");
        successModal.className = "fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-300";
        successModal.innerHTML = `
          <div class="bg-[#1c1c1e] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center space-y-6 border border-white/5 shadow-xl">
             <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
             </div>
             <div class="space-y-1">
              <h3 class="text-xl font-extrabold text-white font-display">Laudo Atualizado!</h3>
              <p class="text-xs text-gray-500 font-medium leading-relaxed">O atendimento de <b>${patient.name || "Paciente"}</b> foi atualizado no seu histórico clínico com sucesso.</p>
             </div>
             <button id="closeModal" class="w-full bg-gradient-to-r from-indigo-600 to-emerald-500 hover:brightness-105 active:scale-[0.98] text-white font-extrabold py-3.5 rounded-xl shadow-lg cursor-pointer transition-all text-xs uppercase tracking-wider">Ok, continuar</button>
          </div>
        `;
        document.body.appendChild(successModal);
        document.getElementById("closeModal")?.addEventListener("click", () => {
          document.body.removeChild(successModal);
        });
      } else {
        // Create new document
        const docRef = await addDoc(collection(db, "reports"), reportData);
        if (docRef?.id) {
          setSavedReportId(docRef.id);
          
          // Show elegant success dialog
          const successModal = document.createElement("div");
          successModal.className = "fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-300";
          successModal.innerHTML = `
            <div class="bg-[#1c1c1e] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center space-y-6 border border-white/5 shadow-xl">
               <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
               </div>
               <div class="space-y-1">
                <h3 class="text-xl font-extrabold text-white font-display">Laudo Salvo!</h3>
                <p class="text-xs text-gray-500 font-medium leading-relaxed">O atendimento de <b>${patient.name || "Paciente"}</b> foi sincronizado no seu histórico clínico com sucesso.</p>
               </div>
               <button id="closeModal" class="w-full bg-gradient-to-r from-indigo-600 to-emerald-500 hover:brightness-105 active:scale-[0.98] text-white font-extrabold py-3.5 rounded-xl shadow-lg cursor-pointer transition-all text-xs uppercase tracking-wider">Ok, continuar</button>
            </div>
          `;
          document.body.appendChild(successModal);
          document.getElementById("closeModal")?.addEventListener("click", () => {
            document.body.removeChild(successModal);
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar prontuário.");
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    const feedbackTip = document.createElement("div");
    feedbackTip.className = "fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-2";
    feedbackTip.innerHTML = `<span>✓ Copiado com sucesso!</span>`;
    document.body.appendChild(feedbackTip);
    setTimeout(() => {
      feedbackTip.classList.add("animate-out", "fade-out");
      setTimeout(() => document.body.removeChild(feedbackTip), 200);
    }, 1500);
  };

  const handleExamFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileSizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedExamFiles((prev) => [
            ...prev,
            {
              name: file.name,
              size: fileSizeStr,
              data: (reader.result as string).split(",")[1],
              mimeType: file.type,
            },
          ]);

          // Enviar aviso de anexo para o Chat Clínico
          const fileMsg: ChatMessage = {
            id: "file-" + Date.now() + "-" + i,
            sender: "user",
            text: `📎 [Arquivo Clínico Enviado] *${file.name}* (${fileSizeStr})`,
            timestamp: new Date(),
            type: "file",
            fileName: file.name
          };

          setChatMessages((prev) => [...prev, fileMsg]);

          // Confirmação de recebimento automática do Vetmind
          setTimeout(() => {
            setChatMessages((prev) => [
              ...prev,
              {
                id: "file-ack-" + Date.now() + "-" + i,
                sender: "ai",
                text: `📎 Recebi o arquivo **${file.name}**! Iremos extrair seus dados e correlacioná-los assim que você clicar em **Analisar Caso** para gerar o diagnóstico.`,
                timestamp: new Date()
              }
            ]);
          }, 800);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Parsing outputs
  const sections = generatedReport ? generatedReport.split("##") : [];
  let s_val = "", o_val = "", a_val = "", p_val = "", d_val = "", metricsJsonStr = "";
  let fc_val = "120 bpm", temp_val = "38.5ºC", fr_val = "24 mpm", trc_val = "1.5s";

  sections.forEach((sec) => {
    const trimmed = sec.trim();
    if (trimmed.startsWith("S (")) s_val = trimmed.replace(/^S \([^)]+\):?/, "").trim();
    else if (trimmed.startsWith("O (")) o_val = trimmed.replace(/^O \([^)]+\):?/, "").trim();
    else if (trimmed.startsWith("A (")) a_val = trimmed.replace(/^A \([^)]+\):?/, "").trim();
    else if (trimmed.startsWith("P (")) p_val = trimmed.replace(/^P \([^)]+\):?/, "").trim();
    else if (trimmed.startsWith("D (")) d_val = trimmed; // Keep entire differentials block for cards parsing
    else if (trimmed.startsWith("M (")) metricsJsonStr = trimmed.replace(/^M \([^)]+\):?/, "").trim();
  });

  // Fallbacks if formatting deviates slightly
  if (!s_val && generatedReport) s_val = generatedReport.split("##")[1] || generatedReport;

  // Extract metric JSON fields
  if (metricsJsonStr) {
    try {
      const match = metricsJsonStr.match(/\{[\s\S]*\}/);
      const rawJson = match ? match[0] : metricsJsonStr;
      const parsed = JSON.parse(rawJson);
      if (parsed.fc) fc_val = parsed.fc;
      if (parsed.temp) temp_val = parsed.temp;
      if (parsed.fr) fr_val = parsed.fr;
      if (parsed.trc) trc_val = parsed.trc;
    } catch (err) {
      // Ignored
    }
  }

  const getCompletenessScore = () => {
    let score = 30; // base score
    if (patient.name) score += 10;
    if (patient.species && (patient.species !== "Canino" || patient.breed)) score += 10;
    if (patient.age) score += 10;
    if (patient.weight) score += 10;
    if (anamnesis && anamnesis.trim().length > 10) {
      score += Math.min(30, Math.floor(anamnesis.trim().length / 5));
    }
    if (uploadedExamFiles && uploadedExamFiles.length > 0) score += 10;
    return Math.min(100, score);
  };

  // Generate responsive WhatsApp message
  const whatsappMsg = `Olá! Passando para atualizar sobre a consulta do pet *${patient.name || "seu pet"}*. \n\nConcluímos a avaliação clínica estruturada (Ficha SOAP). Baseado nos sintomas apresentados e em consensos científicos internacionais, identificamos suspeita principal direcionada e definimos as condutas ideais imediatas.\n\n*Condutas Recomendadas:*\n${prescription || "Fluidoterapia de suporte e acompanhamento clínico contínuo."}\n\nQualquer dúvida, permaneço à total disposição!`;

  return (
    <div className="flex-1 h-full w-full flex flex-col overflow-hidden animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {styleBlock}

      {/* Vetmind Health Aesthetic Container - Fluid & Clean style like Samsung Health */}
      <div className="flex-1 h-full w-full min-h-0 flex flex-col bg-[#fbfcfd] rounded-none xl:rounded-[2.5rem] shadow-none xl:shadow-[0_16px_40px_rgba(94,114,228,0.06)] overflow-hidden font-sans relative">
        
        {/* Beautiful, minimal header */}
        <div className="hidden xl:flex bg-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50/50 flex items-center justify-center">
              <VetmindLogo showText={false} size={28} />
            </div>
            <div className="text-left">
              <span className="font-sans font-black text-slate-900 text-lg tracking-tight">Vetmind Health</span>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mt-0.5">Assistente Clínico & Copiloto</p>
            </div>
          </div>
          
          {/* Minimal status indicator */}
          <div className="flex items-center gap-2 bg-emerald-50/60 px-3 py-1 rounded-full border border-emerald-100/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-extrabold text-emerald-700 tracking-wider uppercase">
              Copiloto Ativo
            </span>
          </div>
        </div>

        {/* Mobile Responsive Segmented Tab Selector - Samsung Health Style (Minimal, thin icons) */}
        <div className="flex xl:hidden bg-white border-b border-slate-100 px-4 py-2 shrink-0 items-center justify-between gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
              title="Voltar ao início"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.2} />
            </button>
          )}

          <div className="flex-1 flex justify-center gap-6">
            <button
              type="button"
              onClick={() => setMobileActiveTab('chat')}
              className={`py-2 px-3 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all relative outline-none ${
                mobileActiveTab === 'chat' 
                  ? "text-indigo-600 font-bold" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <MessageSquare className="w-4 h-4" strokeWidth={1.2} />
              <span>Chat</span>
              {mobileActiveTab === 'chat' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-indigo-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!generatedReport) {
                  alert("Por favor, digite as observações e clique em 'Analisar Caso' para habilitar os resultados.");
                  return;
                }
                setMobileActiveTab('result');
              }}
              className={`py-2 px-3 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all relative outline-none ${
                mobileActiveTab === 'result' 
                  ? "text-indigo-600 font-bold" 
                  : "text-slate-400 hover:text-slate-600"
              } ${!generatedReport ? "opacity-45 cursor-not-allowed" : ""}`}
            >
              <FileText className="w-4 h-4" strokeWidth={1.2} />
              <span>SOAP & RAG</span>
              {mobileActiveTab === 'result' ? (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-indigo-600 rounded-full" />
              ) : (
                generatedReport && <span className="absolute top-2 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>

          {onToggleMenu && (
            <button
              type="button"
              onClick={onToggleMenu}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
              title="Menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.2} />
            </button>
          )}
        </div>

        {/* Real Split 2-Column Responsive Dashboard Layout */}
        <div className="flex-1 h-full min-h-0 grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 divide-slate-100 overflow-hidden">
          
          {/* RIGHT PANEL (Desktop): Interactive WhatsApp-Style Clinical Chat */}
          <div className={`xl:col-span-5 flex flex-col h-full min-h-0 xl:order-2 bg-[#f8fafc]/80 relative overflow-hidden xl:border-l xl:border-slate-100 ${mobileActiveTab === 'chat' ? 'flex' : 'hidden xl:flex'}`}>
            
            {/* 2. ACTIVE PATIENT BADGE / HERO BAR */}
            <div className="bg-white/60 backdrop-blur-md px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-100/50">
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-full bg-indigo-50/80 flex items-center justify-center">
                  <PawPrint className="w-5 h-5 text-indigo-500 shrink-0" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block leading-tight">
                    {patient.name || "Sem Nome"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    {patient.species || "Canino"} • {patient.breed || "SRD"} • {patient.age || "N/I"} • {patient.weight ? `${patient.weight} kg` : "Sem peso"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {anamnesis && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-550 rounded-full transition-all cursor-pointer flex items-center justify-center border border-slate-100/50"
                    title="Limpar prontuário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPatientModal(true)}
                  className="px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/60 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Identificação</span>
                </button>
              </div>
            </div>

            {/* 3. SCROLLABLE CHAT MESSAGES PANEL */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none scroll-smooth relative">
              
              {/* Mobile Only: Inline utility bar for References and Clear */}
              <div className="flex lg:hidden items-center gap-1.5 pb-2 border-b border-white/5/60 mb-2 shrink-0 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowReferencesSettings(!showReferencesSettings);
                  }}
                  className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-3xs cursor-pointer active:scale-95 duration-100 shrink-0 ${
                    showReferencesSettings 
                      ? "bg-indigo-600 text-white border border-indigo-600" 
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100"
                  }`}
                >
                  <BookOpen className="w-2.5 h-2.5 text-indigo-500" />
                  <span>Referências</span>
                  {disabledReferences.length > 0 && (
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse ml-0.5" />
                  )}
                </button>

                {anamnesis && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-3xs cursor-pointer active:scale-95 duration-100 shrink-0 ml-auto"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-red-500" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              {chatMessages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1.5`}>
                    <div className="flex items-start gap-2.5 max-w-[85%] text-left">
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center text-sm shrink-0 border border-indigo-100/10 shadow-3xs">
                          🐾
                        </div>
                      )}
                      <div
                        className={`relative rounded-2xl px-4 py-3 shadow-3xs leading-relaxed text-xs font-medium animate-in slide-in-from-bottom-2 duration-250 text-left ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-white border border-slate-100/40 text-slate-800 rounded-tl-none"
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-sans break-words text-[11px] sm:text-xs leading-relaxed">
                          {msg.text}
                        </div>

                        <span className={`text-[8.5px] font-semibold mt-1.5 block text-right ${isUser ? "text-indigo-200" : "text-slate-400"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isFollowupGenerating && (
                <div className="flex justify-start mb-1.5">
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center text-sm shrink-0 border border-indigo-100/10 shadow-3xs animate-pulse">
                      🐾
                    </div>
                    <div className="relative rounded-2xl px-4 py-3 bg-white border border-slate-100/40 text-slate-500 rounded-tl-none text-xs flex items-center gap-1.5 animate-pulse text-left shadow-3xs">
                      <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider mr-1 leading-none">
                        Vetmind
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />

              {/* Recording and Transcribing UI Overlays within Chat */}
              {isRecording && (
                <div 
                  onClick={handleToggleRecording}
                  className="absolute inset-0 bg-red-50/90 backdrop-blur-[1px] rounded-b-2xl flex flex-col items-center justify-center space-y-3 z-20 animate-in fade-in cursor-pointer select-none"
                >
                  <div className="w-12 h-12 bg-red-200 text-red-500 rounded-full flex items-center justify-center animate-ping absolute opacity-40" />
                  <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center relative shadow-sm">
                    <Mic className="w-5 h-5 text-red-600 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest animate-pulse">Ouvindo atendimento ({recordTimer}s)...</p>
                    <span className="text-[9px] font-bold text-red-400 uppercase mt-1 block">Clique em qualquer lugar para enviar e transcrever</span>
                  </div>
                </div>
              )}

              {isTranscribing && (
                <div className="absolute inset-0 bg-indigo-50/90 backdrop-blur-[1px] rounded-b-2xl flex flex-col items-center justify-center space-y-3.5 z-20 animate-in fade-in select-none">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">Sintetizando gravação com IA...</p>
                </div>
              )}
            </div>

            {/* 4. ACTIVE EXAM FILES PREVIEW PANEL */}
            {uploadedExamFiles.length > 0 && (
              <div className="flex gap-2 p-2.5 bg-slate-50 border-t border-slate-100 overflow-x-auto scrollbar-none shrink-0 z-10">
                {uploadedExamFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-150 rounded-full text-[10px] font-bold text-slate-705 shrink-0 shadow-3xs">
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setUploadedExamFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 5. INPUT CONTROLS BAR (Samsung Health style) */}
            <div className="bg-white border-t border-slate-100 p-4 flex flex-col gap-3 shrink-0 z-10">
              
              {/* PRIMARY ANALYSIS CTA BAR */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || (!anamnesis.trim() && !currentMessageText.trim() && uploadedFiles.length === 0)}
                className={`w-full py-3.5 text-xs font-bold uppercase tracking-wider text-white rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 shadow-md ${
                  (!anamnesis.trim() && !currentMessageText.trim() && uploadedFiles.length === 0) 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none" 
                    : "bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-indigo-600/15"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando sintomas com IA...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-white animate-pulse" />
                    <span>Gerar Diagnóstico SOAP</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {/* File Upload Hidden Trigger */}
                <input
                  type="file"
                  hidden
                  ref={examInputRef}
                  onChange={handleExamFileChange}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                />

                <button
                  type="button"
                  onClick={() => examInputRef.current?.click()}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors shrink-0 border border-slate-100"
                  title="Anexar exames (PDF/Imagem)"
                >
                  <Upload className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`p-3 rounded-full transition-colors shrink-0 border ${
                    isRecording 
                      ? "bg-red-500 text-white border-red-500 animate-pulse" 
                      : "bg-slate-50 hover:bg-red-50 text-red-600 border-slate-100"
                  }`}
                  title="Falar por voz"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Main Text Input Area */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    className="w-full text-xs font-semibold py-3 pl-4 pr-11 border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-200 rounded-full outline-none text-slate-800 placeholder:text-slate-400 transition-all"
                    placeholder="Sintomas, queixas, exames..."
                    value={currentMessageText}
                    onChange={(e) => setCurrentMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="absolute right-1.5 top-1.5 p-1.5 rounded-full transition-all cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 shadow-3xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 6. PATIENT FORM EDITING FLOATING MODAL OVERLAY */}
            <AnimatePresence>
              {showPatientModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-4"
                  onClick={() => setShowPatientModal(false)}
                >
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-extrabold font-display text-slate-800 text-sm uppercase tracking-wider">Identificação do Paciente & Tutor</h3>
                      </div>
                      <button
                        onClick={() => setShowPatientModal(false)}
                        className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* LOAD PREVIOUSLY SAVED PATIENT (UX LEGO) */}
                    {savedPatients.length > 0 && (
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Carregar Ficha Cadastrada</label>
                        <select
                          onChange={(e) => {
                            const selected = savedPatients.find(p => p.id === e.target.value);
                            if (selected) {
                              setPatient({
                                name: selected.name,
                                species: selected.species,
                                breed: selected.breed,
                                age: selected.age,
                                weight: selected.weight,
                                sex: selected.sex,
                                tutorName: selected.tutorName || "",
                                tutorPhone: selected.tutorPhone || "",
                              });
                              if (selected.weight) {
                                setCalcWeight(selected.weight);
                              }
                            }
                          }}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 bg-slate-50 rounded-xl outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Selecione um pet já cadastrado --</option>
                          {savedPatients.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.species}) - Tutor: {p.tutorName || "Não informado"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Pet</label>
                        <input
                          className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-800 outline-none"
                          placeholder="Ex: Brisa"
                          value={patient.name}
                          onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Espécie</label>
                        <select
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-700 outline-none cursor-pointer"
                          value={patient.species || ""}
                          onChange={(e) => setPatient({ ...patient, species: e.target.value })}
                        >
                          <option value="">❓ Não especificado</option>
                          <option value="Canino">🐕 Canino</option>
                          <option value="Felino">🐈 Felino</option>
                          <option value="Ave">🦜 Exótico</option>
                          <option value="Equino">🐎 Equino</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Raça</label>
                        <input
                          className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-800 outline-none"
                          placeholder="Ex: Golden"
                          value={patient.breed}
                          onChange={(e) => setPatient({ ...patient, breed: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Peso (kg)</label>
                        <input
                          className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-800 outline-none"
                          placeholder="Ex: 12"
                          type="number"
                          value={patient.weight}
                          onChange={(e) => {
                            setPatient({ ...patient, weight: e.target.value });
                            setCalcWeight(e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Idade</label>
                        <input
                          className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-800 outline-none"
                          placeholder="Ex: 9 anos"
                          value={patient.age}
                          onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sexo / Castração</label>
                        <select
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 bg-[#f8fafc] rounded-xl focus:border-indigo-300 focus:bg-white text-slate-700 outline-none cursor-pointer"
                          value={patient.sex || ""}
                          onChange={(e) => setPatient({ ...patient, sex: e.target.value })}
                        >
                          <option value="">❓ Não especificado</option>
                          <option value="Fêmea inteira">Fêmea Inteira</option>
                          <option value="Fêmea castrada">Fêmea Castrada</option>
                          <option value="Macho inteiro">Macho Inteiro</option>
                          <option value="Macho castrado">Macho Castrado</option>
                        </select>
                      </div>

                      {/* TUTOR INFORMATION FIELDS */}
                      <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Tutor</label>
                        <input
                          className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-800 outline-none"
                          placeholder="Ex: João da Silva"
                          value={patient.tutorName || ""}
                          onChange={(e) => setPatient({ ...patient, tutorName: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Telefone do Tutor</label>
                        <input
                          className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:border-indigo-300 focus:bg-white text-slate-800 outline-none"
                          placeholder="Ex: (11) 98765-4321"
                          value={patient.tutorPhone || ""}
                          onChange={(e) => setPatient({ ...patient, tutorPhone: e.target.value })}
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        setShowPatientModal(false);
                        if (patient.name && auth.currentUser) {
                          try {
                            const patientId = patient.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-") + "-" + auth.currentUser.uid;
                            const pRef = doc(db, "patients", patientId);
                            const patientPayload = {
                              name: patient.name,
                              species: patient.species || "",
                              breed: patient.breed || "",
                              age: patient.age || "",
                              weight: patient.weight || "",
                              sex: patient.sex || "",
                              tutorName: patient.tutorName || "",
                              tutorPhone: patient.tutorPhone || "",
                              ownerId: auth.currentUser.uid
                            };
                            await setDoc(pRef, patientPayload, { merge: true });
                            
                            // Refresh local list
                            setSavedPatients(prev => {
                              const exists = prev.some(p => p.id === patientId);
                              if (exists) {
                                return prev.map(p => p.id === patientId ? { ...p, ...patientPayload } : p);
                              } else {
                                return [...prev, { id: patientId, ...patientPayload }];
                              }
                            });
                          } catch (err) {
                            console.error("Erro ao salvar paciente no Firestore:", err);
                          }
                        }
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Confirmar Identificação
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* LEFT PANEL (Desktop): Live Interactive Multi-Tab Results Output */}
          <div className={`xl:col-span-7 p-4 sm:p-5 flex flex-col h-full min-h-0 justify-between overflow-hidden bg-white relative xl:order-1 ${mobileActiveTab === 'result' ? 'flex' : 'hidden xl:flex'}`}>
            
            {/* References Overlay Box (Absolute within Left Panel) */}
            <AnimatePresence>
              {showReferencesSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 p-5 space-y-3 shadow-md z-30 overflow-hidden text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Referências Clínicas RAG</span>
                      <span className="text-[8.5px] text-gray-500 font-semibold mt-0.5 block leading-none">
                        Ative/desative referências específicas para análise personalizada.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDisabledReferences([])}
                        className="text-[9px] font-extrabold text-indigo-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        Ativar Todas
                      </button>
                      <span className="text-slate-300 text-[9px]">|</span>
                      <button
                        type="button"
                        onClick={() => setDisabledReferences(uniqueReferences.map(r => r.id))}
                        className="text-[9px] font-extrabold text-indigo-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        Desativar Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReferencesSettings(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center justify-center ml-2 active:scale-90 duration-100"
                        title="Fechar referências"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-1">
                    {uniqueReferences.map((ref) => {
                      const isActive = !disabledReferences.includes(ref.id);
                      return (
                        <button
                          key={ref.id}
                          type="button"
                          onClick={() => {
                            setDisabledReferences(prev => 
                              prev.includes(ref.id) 
                                ? prev.filter(item => item !== ref.id) 
                                : [...prev, ref.id]
                            );
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isActive 
                              ? "border-indigo-100 bg-indigo-50/20 text-slate-700 font-extrabold" 
                              : "border-slate-150 bg-slate-50 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-sm shrink-0">
                              {ref.type === "static" ? "📚" : ref.type === "database" ? "🗄️" : "📄"}
                            </span>
                            <div className="truncate">
                              <span className="text-[10px] font-bold block truncate">{ref.title}</span>
                              <span className="text-[8.5px] font-semibold text-slate-400 block truncate">{ref.source}</span>
                            </div>
                          </div>
                          
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isActive ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                          }`}>
                            {isActive && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* IDLE STATE: Display Adaptive AI Chat Dashboard */}
            {step === "input" && !isGenerating && (
              <div className="flex-1 flex flex-col overflow-y-auto p-1 sm:p-2 space-y-6 text-left animate-in fade-in duration-350 scrollbar-none">
                
                {/* Vetmind Clinical Completeness Dashboard Card */}
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-50/40 via-slate-50 to-white border border-slate-100 relative overflow-hidden shadow-3xs">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 text-left">
                    <div className="space-y-2.5 max-w-md w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-extrabold uppercase tracking-widest rounded-full inline-block">
                            Status do Prontuário
                          </span>
                          {getCompletenessScore() === 100 ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold uppercase tracking-widest rounded-full inline-flex items-center gap-1">
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" /> Completo
                            </span>
                          ) : null}
                        </div>

                        {/* Discreet References Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowReferencesSettings(!showReferencesSettings);
                          }}
                          className={`px-2.5 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border ${
                            showReferencesSettings 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                          title="Configurar fontes de literatura"
                        >
                          <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>Referências</span>
                          {disabledReferences.length > 0 && (
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0 ml-0.5" />
                          )}
                        </button>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
                        Ficha do Paciente
                      </h3>
                      <p className="text-xs text-slate-650 font-medium leading-relaxed">
                        Escreva livremente, grave áudios ou envie exames do pet. Preencha os detalhes para otimizar o diagnóstico diferencial e as diretrizes clínicas.
                      </p>
                      
                      {/* Requirements indicator list */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${patient.name ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                          {patient.name ? "✓ Nome" : "✗ Sem Nome"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${patient.species ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                          {patient.species ? `✓ ${patient.species}` : "✗ Sem Espécie"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${patient.weight ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                          {patient.weight ? "✓ Peso" : "✗ Sem Peso"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${anamnesis && anamnesis.trim().length > 10 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                          {anamnesis && anamnesis.trim().length > 10 ? "✓ Sintomas" : "✗ Sem Sintomas"}
                        </span>
                      </div>
                    </div>

                    {/* Samsung Health Circle Score Gauge */}
                    <div className="flex flex-col items-center gap-2 bg-white p-4.5 rounded-[1.5rem] border border-slate-100/80 shadow-3xs shrink-0 self-center md:self-auto">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Circular Progress Bar (SVG) */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            className="stroke-slate-100"
                            strokeWidth="6"
                            fill="transparent"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            className={`transition-all duration-500 ease-out ${
                              getCompletenessScore() < 50 
                                ? "stroke-orange-500" 
                                : getCompletenessScore() < 80 
                                ? "stroke-indigo-500" 
                                : "stroke-emerald-500"
                            }`}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * getCompletenessScore()) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-slate-800 tracking-tight leading-none">
                            {getCompletenessScore()}%
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            SCORE
                          </span>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">
                        Qualidade Clínica
                      </span>
                    </div>
                  </div>
                </div>



              </div>
            )}

            {/* GENERATING STATE: Calming step-by-step progress loading spinner & skeletons */}
            {isGenerating && (
              <div className="flex-1 space-y-10 py-10 animate-in fade-in duration-300">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 shadow-inner relative animate-bounce">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <h3 className="text-base font-extrabold text-slate-850 font-display">
                      {loadingStep === 0 && "Analisando sinais clínicos..."}
                      {loadingStep === 1 && "Cruzando com literatura veterinária..."}
                      {loadingStep === 2 && "Montando protocolo de tratamento..."}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400 max-w-xs mx-auto">
                      Formatando a avaliação SOAP estruturada e buscando conselhos no acervo.
                    </p>
                  </div>
                </div>

                {/* Skeletons Shimmer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 px-2">
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center gap-3 border-b border-slate-200/55 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                      <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-[80%] bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center gap-3 border-b border-slate-200/55 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                      <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-[70%] bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS STATE: 4-Tab interactive panel */}
            {step === "result" && generatedReport && (
              <div className="flex-1 min-h-0 flex flex-col justify-between space-y-6 animate-in fade-in duration-300">
                
                {/* Tab Selector & Discreet References Button */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-white py-1 gap-2 shrink-0">
                  <div className="flex flex-1 overflow-x-auto shrink-0 scrollbar-none gap-1">
                    {[
                      { id: "soap", label: "Ficha SOAP", icon: FileText },
                      { id: "rag", label: "Diagnósticos RAG", icon: BookOpen },
                      { id: "prescriptions", label: "Prescrições", icon: Pill },
                      { id: "whatsapp", label: "Mensagem Tutor", icon: MessageSquare },
                    ].map((tab) => {
                      const isActive = activeSubTab === tab.id;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSubTab(tab.id as any)}
                          title={tab.label}
                          className={`flex-1 py-3 px-2 text-xs flex flex-col md:flex-row items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-all duration-200 relative outline-none ${
                            isActive 
                              ? "text-indigo-600 font-bold" 
                              : "text-slate-400 hover:text-slate-600 font-medium"
                          }`}
                        >
                          <Icon className="w-4.5 h-4.5 shrink-0 text-slate-450" strokeWidth={1.2} />
                          <span className="hidden md:inline text-[11px] tracking-wide">{tab.label}</span>
                          {isActive && (
                            <motion.span 
                              layoutId="activeSubTabLine"
                              className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-full" 
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Discreet References Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowReferencesSettings(!showReferencesSettings);
                    }}
                    className={`px-2.5 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
                      showReferencesSettings 
                        ? "bg-indigo-600 text-white border-indigo-600" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                    title="Configurar fontes de literatura"
                  >
                    <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="hidden sm:inline">Referências</span>
                    {disabledReferences.length > 0 && (
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0 ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Tab content scrollable container */}
                <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-4">
                  
                  {/* TAB 1: FICHA SOAP */}
                  {activeSubTab === "soap" && (
                    <div className="space-y-4.5 animate-in fade-in duration-200">
                      
                      {/* S - Subjetivo Card */}
                      <AccordionCard 
                        letter="S" 
                        title="Subjetivo (Histórico)" 
                        rationale="Anotações do tutor e queixas"
                        initiallyOpen={true}
                      >
                        <div className="text-xs text-slate-750 font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {s_val}
                        </div>
                      </AccordionCard>

                      {/* O - Objetivo Card */}
                      <AccordionCard 
                        letter="O" 
                        title="Objetivo (Sinais Clínicos)" 
                        rationale="Valores aferidos e exames físicos"
                      >
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricBox icon={Activity} label="FC" value={fc_val} color="text-red-500 bg-red-50" />
                            <MetricBox icon={Wind} label="FR" value={fr_val} color="text-blue-500 bg-blue-50" />
                            <MetricBox icon={Thermometer} label="Temp" value={temp_val} color="text-orange-500 bg-orange-50" />
                            <MetricBox icon={Droplets} label="TRC" value={trc_val} color="text-teal-500 bg-teal-50" />
                          </div>
                          <div className="text-xs text-slate-750 font-medium leading-relaxed whitespace-pre-wrap break-words border-t border-slate-100 pt-3">
                            {o_val || "Paciente ativo, hidratado e normotenso. Ausência de lesões externas severas."}
                          </div>
                        </div>
                      </AccordionCard>

                      {/* A - Avaliação Card */}
                      <AccordionCard 
                        letter="A" 
                        title="Avaliação Clínica" 
                        rationale="Diagnósticos diferenciais sugeridos"
                      >
                        <div className="text-xs text-slate-750 font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {a_val}
                        </div>
                      </AccordionCard>

                      {/* P - Plano Card */}
                      <AccordionCard 
                        letter="P" 
                        title="Plano Terapêutico" 
                        rationale="Condutas e monitoramentos indicados"
                      >
                        <div className="space-y-4">
                          <div className="text-xs text-slate-750 font-medium leading-relaxed whitespace-pre-wrap break-words">
                            {p_val}
                          </div>
                          {!prescription ? (
                            <div className="space-y-4 pt-3 border-t border-slate-100">
                              {(() => {
                                const diagsForSelector = parseClinicsDiferenciais(d_val || "");
                                if (diagsForSelector.length > 0) {
                                  return (
                                    <div className="space-y-2 text-left">
                                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                        Diagnóstico para Prescrever:
                                      </label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {diagsForSelector.map((d, index) => {
                                          const isSelected = selectedDiagnosis === d.title || (!selectedDiagnosis && index === 0);
                                          return (
                                            <button
                                              key={`soap-select-diag-${index}`}
                                              type="button"
                                              onClick={() => setSelectedDiagnosis(d.title)}
                                              className={`p-2.5 rounded-xl border text-[11px] font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                                                isSelected
                                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                                  : "bg-slate-50 border-slate-150 text-slate-650 hover:bg-slate-100/50"
                                              }`}
                                            >
                                              <span className="truncate pr-1">{d.title}</span>
                                              <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                {d.probability}%
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              <button
                                onClick={() => {
                                  const diagsForSelector = parseClinicsDiferenciais(d_val || "");
                                  const currentDiag = selectedDiagnosis || diagsForSelector[0]?.title || "";
                                  handleGeneratePrescription(currentDiag);
                                }}
                                disabled={isGeneratingPrescription}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/10"
                              >
                                {isGeneratingPrescription ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-white" />
                                )}
                                <span>Gerar Prescrição Inteligente</span>
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Prescrição Baseada em Literatura Ativa
                                </span>
                                <button
                                  onClick={() => setActiveSubTab("prescriptions")}
                                  className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                >
                                  Ver Completa →
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-600 font-mono line-clamp-3 leading-relaxed whitespace-pre-wrap break-words bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                                {prescription}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionCard>

                    </div>
                  )}

                  {/* TAB 2: LITERATURA RASTREÁVEL */}
                  {activeSubTab === "rag" && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <DifferentialCards 
                        text={d_val || `## Diferenciais\n1. ${patient.species === "Felino" ? "Obstrução Uretral Felina" : "Piometra Aberta"} - 85% de Probabilidade\n- **Por que esta causa**: Os sintomas de distensão abdominal e comportamento de dor são condizentes.\n- **Embasamento**: [Nelson - Medicina Interna de Pequenos Animais](https://scholar.google.com/scholar?q=Nelson+Internal+Medicine)`} 
                        onSuggestProtocol={(title, protocol) => {
                          if (!prescription) {
                            setPrescription(protocol);
                          }
                        }}
                        onGeneratePrescriptionForDiag={handleGeneratePrescription}
                      />
                      <InteractiveSources sources={sources} />
                    </div>
                  )}

                  {/* TAB 3: PRESCRIÇÕES */}
                  {activeSubTab === "prescriptions" && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      {prescription ? (
                        <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Prescrição Farmacológica</span>
                            <div className="flex gap-1.5">
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[9px] font-bold text-indigo-600 rounded-full uppercase">Ativa</span>
                              {isEditingPrescription && (
                                <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-[9px] font-bold text-amber-600 rounded-full uppercase">Editando</span>
                              )}
                            </div>
                          </div>

                          {isEditingPrescription ? (
                            <div className="space-y-3">
                              <textarea
                                className="w-full h-64 text-xs font-mono p-4 border border-slate-300 rounded-xl focus:border-indigo-500 bg-white text-slate-800 outline-none leading-relaxed"
                                value={prescriptionEditVal}
                                onChange={(e) => setPrescriptionEditVal(e.target.value)}
                                placeholder="Escreva a receita aqui..."
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setIsEditingPrescription(false)}
                                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => {
                                    setPrescription(prescriptionEditVal);
                                    setIsEditingPrescription(false);
                                  }}
                                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Salvar Alterações</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-xs text-slate-800 font-medium leading-relaxed font-mono whitespace-pre-wrap break-words bg-white p-4 rounded-xl border border-slate-200 shadow-inner text-left">
                                {prescription}
                              </p>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setPrescriptionEditVal(prescription);
                                    setIsEditingPrescription(true);
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Editar Texto</span>
                                </button>

                                <button
                                  onClick={handlePrintPrescription}
                                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 hover:scale-[1.01] cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Imprimir Receituário</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 border border-slate-150 rounded-2xl space-y-5">
                          <Pill className="w-10 h-10 text-slate-300 mx-auto animate-pulse" />
                          <div className="space-y-1 max-w-xs mx-auto">
                            <h5 className="font-extrabold text-slate-850 text-xs uppercase tracking-wide">Sem Prescrição Ativa</h5>
                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">Selecione um diagnóstico abaixo e gere um receituário estruturado pela IA com dosagens calculadas.</p>
                          </div>

                          {/* Interactive Differential Selector */}
                          {(() => {
                            const diagsForSelector = parseClinicsDiferenciais(d_val || "");
                            if (diagsForSelector.length > 0) {
                              return (
                                <div className="max-w-md mx-auto p-4 bg-white border border-slate-150 rounded-2xl space-y-3 text-left shadow-3xs">
                                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                    Diagnóstico Alvo para Prescrever:
                                  </label>
                                  <div className="flex flex-col gap-1.5">
                                    {diagsForSelector.map((d, index) => {
                                      const isSelected = selectedDiagnosis === d.title || (!selectedDiagnosis && index === 0);
                                      return (
                                        <button
                                          key={`select-diag-${index}`}
                                          type="button"
                                          onClick={() => setSelectedDiagnosis(d.title)}
                                          className={`p-3 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                              : "bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100/50"
                                          }`}
                                        >
                                          <span>{d.title}</span>
                                          <span className={`text-[10px] font-mono font-black ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                                            {d.probability}% afinidade
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Route of Administration Selector */}
                          <div className="max-w-md mx-auto p-4 bg-white border border-slate-150 rounded-2xl space-y-3 text-left shadow-3xs">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                              Via de Administração Preferencial:
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { id: "auto", label: "Automático (IA)", icon: "✨" },
                                { id: "oral", label: "Oral", icon: "💊" },
                                { id: "topical", label: "Tópico", icon: "🧴" },
                                { id: "ophthalmic", label: "Oftálmico", icon: "👁️" },
                                { id: "otic", label: "Otológico", icon: "👂" },
                                { id: "injectable", label: "Injetável", icon: "💉" }
                              ].map((route) => {
                                const isSelected = routeOfAdmin === route.id;
                                return (
                                  <button
                                    key={`route-${route.id}`}
                                    type="button"
                                    onClick={() => setRouteOfAdmin(route.id)}
                                    className={`p-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-wider text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer duration-200 ${
                                      isSelected
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-3xs scale-[1.01]"
                                        : "bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100/50"
                                    }`}
                                  >
                                    <span className="text-base">{route.icon}</span>
                                    <span>{route.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-center gap-2 pt-2">
                            <button
                              onClick={() => {
                                const diagsForSelector = parseClinicsDiferenciais(d_val || "");
                                const currentDiag = selectedDiagnosis || diagsForSelector[0]?.title || "";
                                handleGeneratePrescription(currentDiag);
                              }}
                              disabled={isGeneratingPrescription}
                              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                            >
                              {isGeneratingPrescription ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                              )}
                              <span>Gerar Prescrição Inteligente</span>
                            </button>

                            <button
                              onClick={() => {
                                setPrescriptionEditVal("");
                                setPrescription("1. ");
                                setIsEditingPrescription(true);
                              }}
                              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Escrever Manualmente
                            </button>
                          </div>
                        </div>
                      )}

                      {/* PRINTABLE HIDDEN AREA */}
                      <div id="printable-prescription-area" className="hidden">
                        <div className="max-w-2xl mx-auto p-12 space-y-10 bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {/* Header */}
                          <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-6" style={{ contentVisibility: "auto" }}>
                            <div className="text-left">
                              <h2 className="text-2xl font-black text-indigo-700 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>VETMIND</h2>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mt-0.5">Laudos & Prescrições Inteligentes</p>
                            </div>
                            <div className="text-right text-xs">
                              <p className="font-extrabold text-slate-900 text-sm">{signerName || "Dr. Roberto Silva"}</p>
                              <p className="text-indigo-600 font-bold uppercase tracking-widest text-[9px] mt-0.5">CRMV {signerCrmv || "SP-14892"}</p>
                              <p className="text-slate-400 font-medium text-[9px]">Atendimento Clínico de Pequenos Animais</p>
                            </div>
                          </div>

                          {/* Patient and Tutor details */}
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-2 gap-6 text-xs text-left">
                            <div className="space-y-1">
                              <p className="text-slate-400 font-black uppercase text-[8px] tracking-wider">DADOS DO PACIENTE</p>
                              <p className="font-extrabold text-slate-800 text-sm">{patient.name || "Não identificado"}</p>
                              <p className="font-medium text-slate-500">
                                Espécie: {patient.species || "Não informado"} | Raça: {patient.breed || "Não informado"}
                              </p>
                              <p className="font-medium text-slate-500">
                                Idade: {patient.age || "Não informado"} | Peso: {patient.weight ? `${patient.weight} kg` : "Não informado"}
                              </p>
                            </div>
                            <div className="space-y-1 border-l border-slate-200 pl-5">
                              <p className="text-slate-400 font-black uppercase text-[8px] tracking-wider">DADOS DO TUTOR</p>
                              <p className="font-extrabold text-slate-800 text-sm">{patient.tutorName || "Não informado"}</p>
                              {patient.tutorPhone && (
                                <p className="font-medium text-slate-500">Telefone: {patient.tutorPhone}</p>
                              )}
                            </div>
                          </div>

                          {/* Body / Prescription Content */}
                          <div className="space-y-3 min-h-[350px] text-left">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">RECOMENDAÇÕES E PRESCRIÇÃO</h3>
                            <div className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed font-mono bg-white p-1">
                              {prescription || "Nenhuma prescrição cadastrada."}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-slate-100 pt-8 flex flex-col items-center space-y-6">
                            <p className="text-slate-400 font-semibold text-[9px]">
                              Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                            <div className="w-64 border-b border-slate-300 text-center pb-1">
                              <p className="font-bold text-slate-850 text-xs">{signerName || "Dr. Roberto Silva"}</p>
                              <p className="text-slate-400 text-[9px] mt-0.5">Assinatura do Médico Veterinário</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* WEIGHT DOSAGE SIMULATOR: Lightweight modal calculator (Lego/Disney requirement) */}
                      <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🧮</span>
                          <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider font-display">Simular Dose por Peso</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Peso do Paciente (kg)</label>
                            <input
                              type="number"
                              value={calcWeight}
                              onChange={(e) => setCalcWeight(e.target.value)}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                              placeholder="Ex: 10"
                              min="1"
                              max="100"
                            />
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center shadow-2xs">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Cálculo de Suporte</span>
                            <div className="space-y-1.5 mt-2">
                              {[
                                { name: "Cefalotina (IV)", dose: 30, unit: "mg/kg" },
                                { name: "Metronidazol (IV)", dose: 15, unit: "mg/kg" },
                                { name: "Dipirona (SC)", dose: 25, unit: "mg/kg" },
                              ].map((med, idx) => {
                                const w = parseFloat(calcWeight) || 0;
                                const tot = (w * med.dose).toFixed(0);
                                return (
                                  <p key={idx} className="text-[10.5px] font-bold text-slate-800 flex justify-between gap-4">
                                    <span className="truncate">{med.name}:</span>
                                    <span className="text-[#5E39FF] font-black shrink-0">{tot} mg total</span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 4: WHATSAPP TUTOR */}
                  {activeSubTab === "whatsapp" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      {isGeneratingTutorMessage ? (
                        <div className="p-8 text-center bg-slate-50 border border-slate-150 rounded-2xl space-y-4 animate-pulse">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner relative animate-bounce mx-auto">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                          </div>
                          <div className="space-y-1.5">
                            <h5 className="font-extrabold text-slate-850 text-xs uppercase tracking-wide">Traduzindo jargão clínico...</h5>
                            <p className="text-[11px] font-semibold text-slate-400 max-w-xs mx-auto">Sintetizando recomendações, alertas de saúde e cuidados carinhosos para o tutor.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {tutorMessageError && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold text-center">
                              ⚠️ {tutorMessageError}
                            </div>
                          )}

                          <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Mensagem para Tutor</span>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded-full uppercase">
                                {aiTutorMessage ? "IA Humanizada" : "Mensagem Padrão"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-750 font-medium leading-relaxed font-sans whitespace-pre-wrap break-words bg-white p-4 rounded-xl border border-slate-200 shadow-inner text-left">
                              {aiTutorMessage || whatsappMsg}
                            </p>
                          </div>

                          {!aiTutorMessage ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                onClick={() => handleCopyText(whatsappMsg)}
                                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all"
                              >
                                <Copy className="w-4 h-4" />
                                Copiar Padrão
                              </button>
                              <button
                                onClick={handleGenerateTutorMessage}
                                className="py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:from-indigo-700 hover:to-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-500/10 hover:scale-[1.02]"
                              >
                                <Sparkles className="w-4 h-4 text-white" />
                                Gerar via IA Humanizada
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCopyText(aiTutorMessage)}
                              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
                            >
                              <Copy className="w-4 h-4" />
                              Copiar Mensagem Humanizada
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                </div>

                {/* Footer action buttons: Save, Export, Print, Share */}
                <div className="border-t border-slate-150 pt-5 shrink-0 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  
                  <div className="flex items-center gap-1.5">
                    <span className="bg-indigo-50 text-indigo-650 border border-indigo-100 text-[9px] font-black px-2.5 py-1 rounded-full uppercase font-mono">
                      Laudo Finalizado
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveReport}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Sincronizar histórico
                    </button>

                    <button
                      onClick={handleClear}
                      className="px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer"
                    >
                      Redigitar Caso
                    </button>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

// Subcomponents definitions

function AccordionCard({
  letter,
  title,
  rationale,
  initiallyOpen = false,
  children,
}: {
  letter: string;
  title: string;
  rationale: string;
  initiallyOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4.5 flex items-center justify-between gap-3 cursor-pointer outline-none select-none hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-xs font-black text-indigo-600">
            {letter}
          </div>
          <div>
            <h4 className="font-extrabold font-display text-slate-850 text-xs uppercase tracking-wider leading-none">
              {title}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{rationale}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-250 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4 bg-slate-50/40">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#1c1c1e] border border-slate-150 rounded-xl p-3 flex items-center gap-2.5 shadow-2xs">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="overflow-hidden">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-xs font-black text-slate-850 mt-1 truncate">{value}</p>
      </div>
    </div>
  );
}

const styleBlock = (
  <style>{`
    @keyframes container-pulse {
      0%, 100% {
        border-color: rgba(94, 57, 255, 0.25);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(94, 57, 255, 0.04);
      }
      50% {
        border-color: rgba(0, 205, 152, 0.45);
        box-shadow: 0 20px 25px -5px rgba(94, 57, 255, 0.08), 0 10px 10px -5px rgba(0, 205, 152, 0.08), 0 0 0 4px rgba(0, 205, 152, 0.08);
      }
    }
    .animate-container-pulse {
      animation: container-pulse 4s infinite ease-in-out;
    }
    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-none {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);
