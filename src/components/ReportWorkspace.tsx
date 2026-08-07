import React, { useState, useEffect, useRef, useMemo } from "react";
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
  RotateCcw,
  Sparkles,
  ChevronDown,
  Trash2,
  Edit3,
  Mic,
  Square,
  Pill,
  Calendar,
  X,
  MessageSquare,
  Stethoscope,
  Check,
  Copy,
  Zap,
  ArrowLeft,
  Menu,
  ExternalLink,
  ListChecks,
  Share2,
  Info,
  FileDown,
  Activity,
  HeartPulse,
  ShieldCheck,
  Thermometer,
  Weight,
  Library,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, getCurrentUser, collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, orderBy, setDoc, where } from "../lib/firebase";
import { Patient, Report } from "../types";
import VetmindLogo from "./VetmindLogo";
import ClinicalNextStepsChecklist from "./ClinicalNextStepsChecklist";
import LivingThinkingCore, { OrbState } from "./LivingThinkingCore";
import AnamnesisDashboard from "./AnamnesisDashboard";
import ClinicalReasoningEngine from "./ClinicalReasoningEngine";
import DifferentialDiagnosisWorkspace from "./DifferentialDiagnosisWorkspace";
import EvidenceWorkspace from "./EvidenceWorkspace";
import ClinicalDecisionWorkspace from "./ClinicalDecisionWorkspace";
import ClinicalDocumentationStudio from "./ClinicalDocumentationStudio";
import ClinicalKnowledgeHub from "./ClinicalKnowledgeHub";
import { useClinicalSession } from "../hooks/useClinicalSession";
import {
  PAGE_TRANSITION_VARIANTS,
  BUTTON_MOTION_PROPS,
  MOTION_TIMING,
  MOTION_EASINGS
} from "../lib/motionBible";

// Style block for beautiful clinical markdown lists and spacing
const styleBlock = (
  <style dangerouslySetInnerHTML={{ __html: `
    .markdown-body h1, .markdown-body h2, .markdown-body h3 {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    .markdown-body h2 { font-size: 1.1rem; }
    .markdown-body h3 { font-size: 0.95rem; }
    .markdown-body p {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      line-height: 1.6;
      color: #334155;
      margin-bottom: 0.75rem;
    }
    .markdown-body ul, .markdown-body ol {
      margin-left: 1.25rem;
      margin-bottom: 0.75rem;
      font-size: 0.8rem;
      color: #334155;
      list-style-type: disc;
    }
    .markdown-body li {
      margin-bottom: 0.25rem;
    }
    .markdown-body strong {
      font-weight: 700;
      color: #0f172a;
    }
  `}} />
);

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
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold underline transition-colors group/link cursor-pointer decoration-dotted decoration-2 underline-offset-2 break-all"
            >
              {props.children}
              <ExternalLink className="w-3.5 h-3.5 inline text-slate-400 group-hover/link:text-indigo-600 transition-colors shrink-0" />
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
  soap?: {
    s: string;
    o: string;
    a: string;
    p: string;
    raw: string;
  };
  differentials?: string;
  metrics?: {
    fc?: string;
    temp?: string;
    fr?: string;
    trc?: string;
    origem?: string;
  };
  sources?: any[];
}

function parseClinicsDiferenciais(text: string): DifferentialDiagnosis[] {
  if (!text) return [];
  const lines = text.split("\n");
  const diagnoses: DifferentialDiagnosis[] = [];
  let currentDiag: Partial<DifferentialDiagnosis> | null = null;
  let currentSection: "justification" | "literature" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const matchNumber = cleanLine.match(/^\d+\.\s*(.*?)(?:\s*-\s*(\d+)%)?$/);
    const matchBullet = cleanLine.match(/^[-*]\s*(.*?)(?:\s*-\s*(\d+)%)?$/);
    const isNewDiagnosis = matchNumber && !cleanLine.toLowerCase().includes("por que esta causa") && !cleanLine.toLowerCase().includes("embasamento");

    if (isNewDiagnosis) {
      if (currentDiag && currentDiag.title) {
        diagnoses.push(currentDiag as DifferentialDiagnosis);
      }
      const title = matchNumber[1].trim();
      const prob = matchNumber[2] ? parseInt(matchNumber[2]) : 50;
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

  if (diags.length === 0) {
    return (
      <div className="text-xs text-slate-700 leading-relaxed max-w-prose space-y-3 font-medium bg-white p-4.5 rounded-2xl shadow-sm text-left border-none">
        <ClinicalMarkdown>{text}</ClinicalMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full text-left">
      {diags.map((diag, idx) => {
        const isExpanded = expandedIndex === idx;
        const colorClass = diag.probability >= 70 ? "bg-red-50 text-red-700 border-none" : diag.probability >= 50 ? "bg-amber-50 text-amber-700 border-none" : "bg-indigo-50 text-indigo-700 border-none";
        return (
          <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm shadow-slate-100/40 hover:shadow-md hover:shadow-slate-100/60 transition-all flex flex-col border-none">
            <button
              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer outline-none hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider shrink-0 ${colorClass}`}>
                  {diag.probabilityText}
                </span>
                <span className="font-extrabold text-xs text-slate-800 font-display uppercase tracking-wide">{diag.title}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180 text-indigo-600" : ""}`} />
            </button>

            {isExpanded && (
              <div className="p-4 bg-slate-50/20 text-xs text-slate-700 space-y-3.5">
                {diag.justification && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Por que esta causa?</span>
                    <p className="font-medium text-slate-650 leading-relaxed whitespace-pre-wrap">{diag.justification}</p>
                  </div>
                )}
                {diag.literature && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Diretrizes & Literatura RAG</span>
                    <p className="font-semibold text-indigo-600 leading-relaxed whitespace-pre-wrap">{diag.literature}</p>
                  </div>
                )}
                {onGeneratePrescriptionForDiag && (
                  <button
                    onClick={() => onGeneratePrescriptionForDiag(diag.title)}
                    className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pill className="w-3.5 h-3.5" />
                    Preescrever para {diag.title}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InteractiveSources({ sources }: { sources: any[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="bg-slate-100/40 rounded-2xl p-4 space-y-3 text-left">
      <div className="flex items-center gap-2 pb-1">
        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
        <h3 className="font-black text-[10px] uppercase tracking-wider text-slate-800">Referências RAG e Fontes</h3>
      </div>
      <div className="space-y-1.5">
        {sources.map((item, idx) => {
          const isObj = typeof item === "object" && item !== null;
          const label = isObj ? item.topic || item.title : String(item);
          return (
            <div key={idx} className="text-[10px] font-semibold text-slate-600 flex items-start gap-1.5 leading-relaxed">
              <span className="text-indigo-500">•</span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATIC_REFERENCES = [
  { id: "ref-1", title: "Nelson - Medicina Interna de Pequenos Animais", source: "Consenso 2023", type: "static" },
  { id: "ref-2", title: "Ettinger - Tratado de Medicina Interna Veterinária", source: "Ettinger 2022", type: "static" },
  { id: "ref-3", title: "Plumb - Manual de Farmacologia Veterinária", source: "Plumb 9a Ed.", type: "static" }
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
  const { session, updatePatient: savePatientToSession, updateAnamnesis: saveAnamnesisToSession, addAttachment } = useClinicalSession();

  const [step, setStep] = useState<"input" | "result">(initialReport ? "result" : "input");
  const [disabledReferences, setDisabledReferences] = useState<string[]>([]);
  const [savedPatients, setSavedPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Partial<Patient>>(() => {
    if (initialPatient) {
      return {
        name: initialPatient.name || "",
        species: initialPatient.species || "Canino",
        breed: initialPatient.breed || "",
        age: initialPatient.age || "",
        sex: initialPatient.sex || "Macho",
        weight: initialPatient.weight || "",
        tutorName: initialPatient.tutorName || "",
        tutorPhone: initialPatient.tutorPhone || "",
      };
    }
    if (initialReport) {
      return {
        name: initialReport.patientId || "",
        species: initialReport.patientSpecies || "Canino",
        breed: initialReport.patientBreed || "",
        age: initialReport.patientAge || "",
        sex: initialReport.patientSex || "Macho",
        weight: initialReport.patientWeight || "",
        tutorName: (initialReport as any)?.tutorName || "",
        tutorPhone: (initialReport as any)?.tutorPhone || "",
      };
    }
    return {
      name: "",
      species: "Canino",
      breed: "",
      age: "",
      sex: "Macho",
      weight: "",
      tutorName: "",
      tutorPhone: "",
    };
  });

  const [anamnesis, setAnamnesis] = useState(initialReport?.anamnesis || "");

  // Sync session updates back to patient state only if session has explicit user data and local patient is empty
  useEffect(() => {
    if (initialReport) {
      setPatient({
        name: initialReport.patientId || "",
        species: initialReport.patientSpecies || "Canino",
        breed: initialReport.patientBreed || "",
        age: initialReport.patientAge || "",
        sex: initialReport.patientSex || "Macho",
        weight: initialReport.patientWeight || "",
        tutorName: (initialReport as any)?.tutorName || "",
        tutorPhone: (initialReport as any)?.tutorPhone || "",
      });
      setAnamnesis(initialReport.anamnesis || "");
    } else if (initialPatient) {
      setPatient({
        name: initialPatient.name || "",
        species: initialPatient.species || "Canino",
        breed: initialPatient.breed || "",
        age: initialPatient.age || "",
        sex: initialPatient.sex || "Macho",
        weight: initialPatient.weight || "",
        tutorName: initialPatient.tutorName || "",
        tutorPhone: initialPatient.tutorPhone || "",
      });
      setAnamnesis("");
    }
  }, [initialReport, initialPatient]);

  // Handler for updating patient reactively
  const handleUpdatePatient = (data: Partial<Patient>) => {
    setPatient(prev => {
      const next = { ...prev, ...data };
      savePatientToSession(next);
      return next;
    });
  };

  // Helper to extract patient details dynamically from anamnesis text
  const parsePatientDetailsFromText = (text: string) => {
    if (!text) return;
    setPatient((prev) => {
      const next = { ...prev };
      let changed = false;

      // Extract weight (e.g. 28kg, 28 kg, 28,5 kg, peso: 28kg)
      if (!next.weight) {
        const weightMatch = text.match(/(?:peso[:\s]*)?(\d+(?:[\.,]\d+)?)\s*kg\b/i);
        if (weightMatch) {
          next.weight = weightMatch[1].replace(',', '.');
          changed = true;
        }
      }

      // Extract species
      if (!next.species || next.species === 'Canino') {
        if (/\b(felino|felina|gato|gata|cat)\b/i.test(text)) {
          next.species = 'Felino';
          changed = true;
        } else if (/\b(canino|canina|cão|cao|cadela|cachorro|dog)\b/i.test(text)) {
          next.species = 'Canino';
          changed = true;
        }
      }

      // Extract name (e.g. Paciente: Thor, Nome: Mel, cadela Luna, cão Thor, gato Bob, paciente Mel)
      if (!next.name || next.name === 'Paciente sem nome' || next.name === 'Paciente Anon' || next.name === 'Luna') {
        const nameMatch = text.match(/(?:paciente|nome)[:\s]+([A-ZÀ-Ú][a-zà-ú0-9]+)/i) ||
                          text.match(/(?:cão|cao|cadela|gato|gata|pet|felino|canino)\s+([A-ZÀ-Ú][a-zà-ú0-9]+)/i);
        if (nameMatch && nameMatch[1]) {
          const candidate = nameMatch[1];
          const ignoredWords = ['com', 'sem', 'que', 'para', 'anos', 'meses', 'dias', 'com', 'kg', 'apresenta'];
          if (!ignoredWords.includes(candidate.toLowerCase())) {
            next.name = candidate;
            changed = true;
          }
        }
      }

      if (changed) {
        savePatientToSession(next);
      }
      return changed ? next : prev;
    });
  };

  // Handler for updating anamnesis reactively
  const handleUpdateAnamnesis = (text: string) => {
    setAnamnesis(text);
    saveAnamnesisToSession(text);
  };
  const [examData, setExamData] = useState(initialReport?.examData || "");
  const [uploadedExamFiles, setUploadedExamFiles] = useState<
    { name: string; size: string; data?: string; mimeType?: string }[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReasoningEngine, setShowReasoningEngine] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'anamnesis' | 'pipeline' | 'workspace' | 'evidence' | 'decision' | 'documentation' | 'knowledge'>('anamnesis');
  const tabsNavRef = useRef<HTMLDivElement>(null);

  // Smoothly center active tab in horizontal scroll container on mobile/desktop
  useEffect(() => {
    if (tabsNavRef.current) {
      const activeTabEl = tabsNavRef.current.querySelector<HTMLElement>(`[data-tab-mode="${activeViewMode}"]`);
      if (activeTabEl) {
        activeTabEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeViewMode]);
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

  // Sub-navigation tab system matching Vetmind Design Specs
  const [subTab, setSubTab] = useState<'resumo' | 'diferenciais' | 'exames' | 'condutas' | 'prescricao' | 'literatura'>('diferenciais');
  const [showShareModal, setShowShareModal] = useState(false);

  // Prescription, weight calculator and message tutor
  const [prescription, setPrescription] = useState<string | null>(initialReport?.prescription || null);
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [prescriptionEditVal, setPrescriptionEditVal] = useState("");
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);
  const [calcWeight, setCalcWeight] = useState<string>("");
  const [aiTutorMessage, setAiTutorMessage] = useState<string | null>(null);
  const [isGeneratingTutorMessage, setIsGeneratingTutorMessage] = useState(false);
  const [tutorMessageError, setTutorMessageError] = useState<string | null>(null);

  useEffect(() => {
    if (patient?.weight) {
      setCalcWeight(patient.weight.toString());
    }
  }, [patient?.weight]);

  const [savedReportId, setSavedReportId] = useState<string | null>(initialReport?.id || null);

  // Voice States
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Layout text input
  const [currentMessageText, setCurrentMessageText] = useState("");
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [accordionStates, setAccordionStates] = useState<Record<string, Record<string, boolean>>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome",
        sender: "ai",
        text: "Olá! Sou o seu Assistente Clínico Inteligente Vetmind 🧠. Me envie o seu caso clínico para que eu faça o cruzamento literário por IA, elabore o prontuário SOAP estruturado, filtre diagnósticos diferenciais RAG e calcule dosagens ideais do tratamento de suporte!",
        timestamp: new Date()
      }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const examInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  useEffect(() => {
    if (initialPatient) {
      setPatient(initialPatient);
      setAnamnesis("");
      setGeneratedReport(null);
      setPrescription(null);
      setStep("input");
    }
  }, [initialPatient]);

  // Load Saved Patients list
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    const fetchSavedPatients = async () => {
      try {
        const q = query(
          collection(db, "patients"),
          where("ownerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const list: Patient[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Patient);
        });
        setSavedPatients(list);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSavedPatients();
  }, []);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    const feedbackTip = document.createElement("div");
    feedbackTip.className = "fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-2";
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
          const newFile = {
            name: file.name,
            size: fileSizeStr,
            data: (reader.result as string).split(",")[1],
            mimeType: file.type,
          };
          setUploadedExamFiles((prev) => [...prev, newFile]);

          // Sync attachment to global clinical session store
          addAttachment({
            attachment_id: `att-${Date.now()}-${i}`,
            name: file.name,
            size: fileSizeStr,
            mimeType: file.type || 'application/octet-stream',
            type: file.type?.includes('image') ? 'image' : file.type?.includes('pdf') ? 'pdf' : 'ocr',
            data: newFile.data,
            uploadedAt: new Date().toISOString()
          });

          // Post file message to chat
          setChatMessages((prev) => [
            ...prev,
            {
              id: "file-" + Date.now() + "-" + i,
              sender: "user",
              text: `📎 [Anexo Clínico Adicionado] **${file.name}** (${fileSizeStr})`,
              timestamp: new Date(),
              type: "file",
              fileName: file.name
            },
            {
              id: "file-ack-" + Date.now() + "-" + i,
              sender: "ai",
              text: `📎 Recebi o arquivo **${file.name}**! Iremos extrair seus dados e correlacioná-los assim que você clicar em enviar ou digitar o caso.`,
              timestamp: new Date()
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Voice recording handlers
  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/mp3" });
          setIsTranscribing(true);
          
          // Simulation for fast and responsive preview UI
          setTimeout(() => {
            const simulatedText = "Cão macho com diarreia escura e sangramento inicial há 5 dias, temperatura corporal 38.9ºC e desidratação leve.";
            setCurrentMessageText((prev) => (prev ? prev + " " + simulatedText : simulatedText));
            setIsTranscribing(false);
          }, 1500);
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordTimer(0);
      } catch (err) {
        console.error("Audio access error:", err);
        // Fallback simulation
        setIsRecording(true);
        setRecordTimer(0);
        setTimeout(() => {
          setIsRecording(false);
          const simulatedText = "Paciente canino de 10kg apresentando êmese frequente e apatia acentuada há 48h.";
          setCurrentMessageText((prev) => (prev ? prev + " " + simulatedText : simulatedText));
        }, 3000);
      }
    }
  };

  // Timer simulation for voice recording
  useEffect(() => {
    let t: any;
    if (isRecording) {
      t = setInterval(() => {
        setRecordTimer((p) => p + 1);
      }, 1000);
    }
    return () => clearInterval(t);
  }, [isRecording]);

  // Dynamic automatic background prescription pre-generation to save users' clicks
  const handleGeneratePrescriptionBackground = async (soap: string, differentialsText: string) => {
    const diags = parseClinicsDiferenciais(differentialsText);
    const defaultDiag = diags.length > 0 ? diags[0].title : "";
    try {
      const response = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          soapContent: soap, 
          patient, 
          disabledReferences,
          selectedDiagnosis: defaultDiag,
          routeOfAdmin: "auto"
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPrescription(data.prescription);
        setPrescriptionEditVal(data.prescription);
      }
    } catch (e) {
      console.error("Prescription background generation error:", e);
    }
  };

  // Full SOAP clinical analysis re-evaluation
  const handleTriggerReportGeneration = async (textToUse?: string) => {
    const textToSend = (textToUse || currentMessageText).trim();
    setCurrentMessageText(""); // instantly clear for elite responsiveness

    let updatedAnamnesis = anamnesis;
    if (textToSend) {
      parsePatientDetailsFromText(textToSend);
      if (anamnesis && textToSend !== anamnesis && !anamnesis.includes(textToSend)) {
        updatedAnamnesis = `${anamnesis}\n\n[Atualização do Tutor/Clínica]: ${textToSend}`;
      } else {
        updatedAnamnesis = textToSend;
      }
      setAnamnesis(updatedAnamnesis);

      const userMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        sender: "user",
        text: textToSend,
        timestamp: new Date()
      };
      setChatMessages((prev) => [...prev, userMsg]);
    } else if (uploadedExamFiles.length > 0) {
      const userMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        sender: "user",
        text: "📎 Solicitada reavaliação clínica com os exames em anexo",
        timestamp: new Date()
      };
      setChatMessages((prev) => [...prev, userMsg]);
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          anamnesis: updatedAnamnesis,
          examData: examData || "Exame físico geral veterinário",
          files: uploadedExamFiles.map((f) => ({
            name: f.name,
            data: f.data,
            mimeType: f.mimeType,
          })),
          disabledReferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na comunicação com a API de geração.");
      }

      const data = await response.json();
      setGeneratedReport(data.soapContent);
      setSources(data.sources || []);
      setStep("result");

      // Split SOAP sections
      const sections = data.soapContent.split("##");
      let local_s = "", local_o = "", local_a = "", local_p = "", local_d = "";
      sections.forEach((sec: string) => {
        const trimmed = sec.trim();
        if (trimmed.startsWith("S (")) local_s = trimmed.replace(/^S \([^)]+\):?/, "").trim();
        else if (trimmed.startsWith("O (")) local_o = trimmed.replace(/^O \([^)]+\):?/, "").trim();
        else if (trimmed.startsWith("A (")) local_a = trimmed.replace(/^A \([^)]+\):?/, "").trim();
        else if (trimmed.startsWith("P (")) local_p = trimmed.replace(/^P \([^)]+\):?/, "").trim();
        else if (trimmed.startsWith("D (")) local_d = trimmed;
      });
      if (!local_s && data.soapContent) local_s = data.soapContent.split("##")[1] || data.soapContent;

      // Parse health metrics
      let local_metrics = { fc: "125 bpm", temp: "38.7ºC", fr: "26 mpm", trc: "1.5s" };
      const match = data.soapContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          local_metrics = { ...local_metrics, ...parsed };
        } catch (e) {}
      }

      const isReevaluation = chatMessages.length > 1;

      const aiMsg: ChatMessage = {
        id: "reply-soap-" + Date.now(),
        sender: "ai",
        text: isReevaluation 
          ? "🔄 **Reavaliação Clínica Concluída!** Atualizei o prontuário SOAP, os diagnósticos diferenciais RAG e a conduta terapêutica considerando as novas informações do tutor/clínica:"
          : "Análise concluída com sucesso! Com base no caso relatado, estruturei o prontuário SOAP, os diagnósticos diferenciais RAG e as dosagens recomendadas nas seções abaixo:",
        timestamp: new Date(),
        soap: { s: local_s, o: local_o, a: local_a, p: local_p, raw: data.soapContent },
        differentials: local_d,
        metrics: local_metrics,
        sources: data.sources || []
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      
      // Auto background trigger prescription update
      handleGeneratePrescriptionBackground(data.soapContent, local_d);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao conectar.");
      setChatMessages((prev) => [
        ...prev,
        {
          id: "reply-err-" + Date.now(),
          sender: "ai",
          text: "⚠️ Desculpe, ocorreu um erro de conexão ao processar este caso. Por favor, tente reavaliar novamente.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // SOAP clinical analysis main call or follow-up chat
  const handleSendMessageUnified = async (textToUse?: string) => {
    if (!generatedReport) {
      return handleTriggerReportGeneration(textToUse);
    }

    const textToSend = (textToUse || currentMessageText).trim();
    if (!textToSend && uploadedExamFiles.length === 0) return;

    if (textToSend) {
      parsePatientDetailsFromText(textToSend);
    }

    setCurrentMessageText(""); // instantly clear for elite responsiveness

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: textToSend || "Análise de exames em anexo",
      timestamp: new Date()
    };
    setChatMessages((prev) => [...prev, userMsg]);

    const updatedAnamnesis = anamnesis ? `${anamnesis}\n\n[Atualização]: ${textToSend}` : textToSend;
    setAnamnesis(updatedAnamnesis);

    // Chat Follow-up flow for persistent case discussion
    setIsGenerating(true);
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
        throw new Error("Erro na conexão de follow-up.");
      }

      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: "reply-followup-" + Date.now(),
          sender: "ai",
          text: data.replyText,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: "reply-err-" + Date.now(),
          sender: "ai",
          text: "⚠️ Ocorreu um problema de conexão ao consultar o seguimento do caso.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual generation of pharmacological prescription
  const handleGeneratePrescription = async (diagTitle?: string) => {
    if (!generatedReport) return;
    setIsGeneratingPrescription(true);
    try {
      const response = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          soapContent: generatedReport, 
          patient, 
          disabledReferences,
          selectedDiagnosis: diagTitle || "",
          routeOfAdmin: "auto"
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPrescription(data.prescription);
        setPrescriptionEditVal(data.prescription);
        
        // Dynamic feedback scroll
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPrescription(false);
    }
  };

  // Manual WhatsApp translation generation
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
        const data = await response.json();
        setAiTutorMessage(data.tutorMessage);
      } else {
        throw new Error("Erro ao traduzir os dados clínicos.");
      }
    } catch (err: any) {
      console.error(err);
      setTutorMessageError(err.message || "Erro de rede.");
    } finally {
      setIsGeneratingTutorMessage(false);
    }
  };

  // Printing prescription
  const handlePrintPrescription = () => {
    if (!prescription) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receituário Veterinário - Vetmind</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #5e39ff; pb: 20px; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; color: #000; }
              .pet-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
              .prescription-content { white-space: pre-wrap; font-family: monospace; font-size: 14px; background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">RECEITUÁRIO MÉDICO VETERINÁRIO</div>
              <p>Clínica Integrada Vetmind Health</p>
            </div>
            <div class="pet-info">
              <b>Paciente:</b> ${patient.name || "Paciente sem nome"}<br/>
              <b>Espécie:</b> ${patient.species || "Canino"} • <b>Peso:</b> ${patient.weight || "--"} kg<br/>
              <b>Data:</b> ${new Date().toLocaleDateString('pt-BR')}
            </div>
            <div class="prescription-content">${prescription}</div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Sync / Save report with Firebase & LocalStorage
  const handleSaveReport = async () => {
    const user = getCurrentUser() || { uid: "guest_vet", email: "vet@vetmind.ai" };
    const currentAnamnesis = (anamnesis || currentMessageText || "").trim();

    if (!currentAnamnesis && !patient.name) {
      alert("Por favor, preencha as informações do paciente ou descreva a anamnese para salvar o caso.");
      return;
    }

    try {
      const activeSoap = generatedReport || {
        s: `Subjetivo: ${currentAnamnesis || 'Anamnese informada em consulta.'}`,
        o: `Objetivo: Exame físico de ${patient.species || 'Canino'}, ${patient.breed || 'SRD'}, ${patient.age || 'idade N/I'}. ${examData || ''}`,
        a: `Avaliação: Suspeita clínica sob investigação (${patient.name || 'Paciente'}).`,
        p: `Plano: Monitoramento e exames complementares.`
      };

      const reportData: any = {
        patientId: patient.name || "Paciente sem nome",
        patientSpecies: patient.species || "Canino",
        patientBreed: patient.breed || "SRD",
        patientAge: patient.age || "Não informada",
        patientSex: patient.sex || "Fêmea inteira",
        patientWeight: patient.weight || "10",
        anamnesis: currentAnamnesis,
        examData: examData || "Exame clínico físico geral.",
        soapContent: activeSoap,
        prescription,
        sources: sources.map((s: any) => (typeof s === "object" ? s.topic : String(s))),
        uploadedExamFiles: uploadedExamFiles.map((f) => ({ name: f.name, size: f.size })),
        ownerId: user.uid,
        status: "finalized",
        createdAt: serverTimestamp(),
      };

      let finalDocId = savedReportId;
      try {
        if (savedReportId) {
          const reportDocRef = doc(db, "reports", savedReportId);
          const updateData = { ...reportData, updatedAt: serverTimestamp() };
          delete updateData.createdAt;
          await updateDoc(reportDocRef, updateData);
        } else {
          const docRef = await addDoc(collection(db, "reports"), reportData);
          if (docRef?.id) {
            finalDocId = docRef.id;
            setSavedReportId(docRef.id);
          }
        }
      } catch (fErr) {
        console.warn("Firestore sync offline or pending auth, saving to local storage:", fErr);
      }

      // Sync to local storage backup for immediate UI reactivity
      try {
        const localRaw = localStorage.getItem('vetmind_saved_reports');
        const localCases: any[] = localRaw ? JSON.parse(localRaw) : [];
        const newCaseObj = {
          ...reportData,
          id: finalDocId || savedReportId || `local_${Date.now()}`,
          createdAt: Date.now()
        };
        const targetId = newCaseObj.id;
        const idx = localCases.findIndex(c => c.id === targetId);
        if (idx >= 0) {
          localCases[idx] = newCaseObj;
        } else {
          localCases.unshift(newCaseObj);
        }
        localStorage.setItem('vetmind_saved_reports', JSON.stringify(localCases));
      } catch (e) {
        console.error("Erro ao salvar backup em localStorage:", e);
      }

      // Elegant modular visual notification overlay
      const successModal = document.createElement("div");
      successModal.className = "fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-300";
      successModal.innerHTML = `
        <div class="bg-[#1c1c1e] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center space-y-6 border border-white/5 shadow-xl">
           <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
           </div>
           <div class="space-y-1">
            <h3 class="text-xl font-extrabold text-white font-display">Prontuário Sincronizado!</h3>
            <p class="text-xs text-gray-400 font-medium leading-relaxed">Atendimento do paciente <b>${patient.name || "Paciente"}</b> salvo no histórico clínico com sucesso.</p>
           </div>
           <button id="closeModal" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl shadow-lg cursor-pointer transition-all text-xs uppercase tracking-wider">Continuar</button>
        </div>
      `;
      document.body.appendChild(successModal);
      document.getElementById("closeModal")?.addEventListener("click", () => {
        document.body.removeChild(successModal);
      });

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o caso clínico.");
    }
  };

  // Compute effective combined anamnesis text preserving exact user whitespace and empty state
  const effectiveAnamnesisText = useMemo(() => {
    if (anamnesis && currentMessageText && currentMessageText !== anamnesis) {
      return `${anamnesis}\n\n[Nova Informação / Dúvida]: ${currentMessageText}`;
    }
    return anamnesis || currentMessageText || "";
  }, [anamnesis, currentMessageText]);

  // Full clean reset of active case
  const handleClear = () => {
    setAnamnesis("");
    setExamData("");
    setUploadedExamFiles([]);
    setGeneratedReport(null);
    setPrescription(null);
    setAiTutorMessage(null);
    setSavedReportId(null);
    setStep("input");
    setAccordionStates({});
    setChatMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Olá! Sou o seu Assistente Clínico Inteligente Vetmind 🧠. Me envie o seu caso clínico para que eu faça o cruzamento literário por IA, elabore o prontuário SOAP estruturado, filtre diagnósticos diferenciais RAG e calcule dosagens ideais do tratamento de suporte!",
        timestamp: new Date()
      }
    ]);
  };

  const toggleAccordion = (msgId: string, section: string) => {
    setAccordionStates((prev) => {
      const current = prev[msgId] || { soap: true, differentials: true, checklist: true, prescription: false, tutor: false, marketing: false };
      return {
        ...prev,
        [msgId]: {
          ...current,
          [section]: !current[section]
        }
      };
    });
  };

  const isAccordionOpen = (msgId: string, section: string) => {
    const states = accordionStates[msgId];
    if (!states) {
      return section === "soap" || section === "differentials" || section === "checklist";
    }
    return !!states[section];
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col overflow-hidden animate-in fade-in duration-300 max-w-7xl mx-auto">
      {styleBlock}

      <div className="flex-1 h-full w-full min-h-0 flex flex-col bg-[#fbfcfd] rounded-none xl:rounded-[2.5rem] shadow-none xl:shadow-[0_16px_40px_rgba(94,114,228,0.06)] overflow-hidden font-sans relative">
        
        {/* Beautiful, responsive header with Lego styled action pills & mobile-friendly horizontal module bar */}
        <div className="bg-white z-10 shrink-0 border-b border-slate-100/80 shadow-3xs">
          {/* Top Row: Logo, Patient badge, Reavaliar/Limpar */}
          <div className="flex px-3 py-2.5 sm:px-5 sm:py-3 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={onToggleMenu}
                className="xl:hidden p-1.5 sm:p-2 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50/50 flex items-center justify-center shrink-0">
                <VetmindLogo showText={false} size={18} />
              </div>
              <div>
                <h2 className="font-extrabold font-display text-slate-850 text-[10px] sm:text-xs uppercase tracking-wider leading-none">
                  Prontuário & Assistente Clínico
                </h2>
                <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold mt-0.5 hidden xs:block">Copiloto de Consulta Inteligente</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setShowPatientModal(true)}
                className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-3xs"
              >
                <PawPrint className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="max-w-[75px] sm:max-w-[140px] truncate">
                  {patient.name ? patient.name : "Registrar Pet"}
                </span>
                <span className="text-[8px] opacity-75 font-bold hidden xs:inline">
                  ({patient.species === "Outros" ? "Outros" : patient.species === "Felino" ? "Gato" : "Cão"})
                </span>
              </button>

              {chatMessages.length > 1 && (
                <>
                  <button
                    onClick={handleSaveReport}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-3xs hover:scale-[1.02]"
                    title="Salvar prontuário no histórico de casos"
                  >
                    <Save className="w-3 h-3 text-white shrink-0" />
                    <span className="hidden xs:inline">Salvar</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveViewMode('pipeline');
                      handleTriggerReportGeneration();
                    }}
                    disabled={isGenerating}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-3xs disabled:opacity-50 hover:scale-[1.02]"
                    title="Reavaliar caso e atualizar laudo SOAP com novas informações"
                  >
                    <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                    <span className="hidden xs:inline">Reavaliar</span>
                  </button>

                  <button
                    onClick={handleClear}
                    className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                    title="Novo Atendimento"
                  >
                    <RefreshCw className="w-3 h-3 shrink-0" />
                    <span className="hidden md:inline">Limpar</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Module Navigation Sub-Bar: Horizontally Scrollable on Mobile with Smooth Auto-Centering */}
          <div ref={tabsNavRef} className="bg-slate-50/80 border-t border-slate-100/80 px-2 sm:px-4 py-1.5 overflow-x-auto no-scrollbar touch-pan-x snap-x flex items-center gap-1.5 sm:gap-2 scroll-smooth">
            <button
              data-tab-mode="anamnesis"
              onClick={() => {
                setShowReasoningEngine(false);
                setActiveViewMode('anamnesis');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'anamnesis' 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
            >
              <FileText className="w-3 h-3 shrink-0" />
              <span>Anamnese</span>
            </button>

            <button
              data-tab-mode="pipeline"
              onClick={() => {
                setShowReasoningEngine(true);
                setActiveViewMode('pipeline');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'pipeline'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
              title="Visualizar Pipeline de Raciocínio Clínico"
            >
              <Activity className="w-3 h-3 shrink-0" />
              <span>Pipeline RAG</span>
            </button>

            <button
              data-tab-mode="workspace"
              onClick={() => {
                setShowReasoningEngine(false);
                setActiveViewMode('workspace');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'workspace' 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
              title="Clinical Workspace (Diagnósticos Diferenciais)"
            >
              <Stethoscope className="w-3 h-3 text-[#4F46E5] shrink-0" />
              <span>Workspace Clínico</span>
            </button>

            <button
              data-tab-mode="evidence"
              onClick={() => {
                setShowReasoningEngine(false);
                setActiveViewMode('evidence');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'evidence' 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
              title="Evidence Workspace (Evidências Científicas)"
            >
              <BookOpen className="w-3 h-3 text-[#4F46E5] shrink-0" />
              <span>Evidências</span>
            </button>

            <button
              data-tab-mode="decision"
              onClick={() => {
                setShowReasoningEngine(false);
                setActiveViewMode('decision');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'decision' 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
              title="Clinical Decision Workspace (Decisão Clínica)"
            >
              <ShieldCheck className="w-3 h-3 text-[#10B981] shrink-0" />
              <span>Decisão Clínica</span>
            </button>

            <button
              data-tab-mode="documentation"
              onClick={() => {
                setShowReasoningEngine(false);
                setActiveViewMode('documentation');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'documentation' 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
              title="Clinical Documentation Studio"
            >
              <FileText className="w-3 h-3 text-[#4F46E5] shrink-0" />
              <span>Doc Studio</span>
            </button>

            <button
              data-tab-mode="knowledge"
              onClick={() => {
                setShowReasoningEngine(false);
                setActiveViewMode('knowledge');
              }}
              className={`shrink-0 snap-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                activeViewMode === 'knowledge' 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
              }`}
              title="Clinical Knowledge Hub (Central de Conhecimento)"
            >
              <Library className="w-3 h-3 text-[#4F46E5] shrink-0" />
              <span>Knowledge Hub</span>
            </button>
          </div>
        </div>

        {/* Core Chat / Workspace Stream Area */}
        <div className="flex-grow overflow-y-auto p-1.5 sm:p-3 md:p-4 pt-1 sm:pt-1.5 md:pt-1.5 space-y-2 sm:space-y-3 flex flex-col justify-between">
          <div className="flex-1 space-y-2 sm:space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={isGenerating ? 'pipeline' : activeViewMode}
                variants={PAGE_TRANSITION_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                {/* MÓDULO 03: Clinical Reasoning Engine — Processamento e Transparência */}
                {isGenerating || activeViewMode === 'pipeline' ? (
                  <ClinicalReasoningEngine
                    patient={patient as Patient}
                    anamnesisText={effectiveAnamnesisText}
                    isGenerating={isGenerating}
                    onComplete={() => {
                      setIsGenerating(false);
                      setShowReasoningEngine(false);
                      setActiveViewMode('workspace');
                    }}
                    onGoToAnamnesis={() => {
                      setShowReasoningEngine(false);
                      setActiveViewMode('anamnesis');
                    }}
                  />
                ) : activeViewMode === 'knowledge' ? (
                  /* MÓDULO 08: Clinical Knowledge Hub — Central de Conhecimento */
                  <ClinicalKnowledgeHub
                    patient={patient as Patient}
                    anamnesisText={effectiveAnamnesisText}
                    onGoToDecision={() => setActiveViewMode('decision')}
                    onGoToDocumentation={() => setActiveViewMode('documentation')}
                  />
                ) : activeViewMode === 'documentation' ? (
                  /* MÓDULO 07: Clinical Documentation Studio — Documentação Clínica Unificada */
                  <ClinicalDocumentationStudio
                    patient={patient as Patient}
                    anamnesisText={effectiveAnamnesisText}
                    onGoToAnamnesis={() => setActiveViewMode('anamnesis')}
                    onGoToDecision={() => setActiveViewMode('decision')}
                  />
                ) : activeViewMode === 'decision' ? (
                  /* MÓDULO 06: Clinical Decision Workspace — Decisão Clínica e Plano Estruturado */
                  <ClinicalDecisionWorkspace
                    patient={patient as Patient}
                    anamnesisText={effectiveAnamnesisText}
                    onGoToAnamnesis={() => setActiveViewMode('anamnesis')}
                    onGoToEvidence={() => setActiveViewMode('evidence')}
                    onSaveCase={handleSaveReport}
                    onGoToPrescription={() => {
                      const fallbackDiag = anamnesis ? `Investigação Clínica (${patient.species || 'Canino'})` : `Diagnóstico e Prescrição para ${patient.species || 'Canino'}`;
                      if (chatMessages.length > 1) {
                        const lastAi = chatMessages.find((m) => m.sender === 'ai');
                        if (lastAi && lastAi.soap) {
                          handleGeneratePrescription(lastAi.soap.a || fallbackDiag);
                        } else {
                          handleGeneratePrescription(fallbackDiag);
                        }
                      } else {
                        handleGeneratePrescription(fallbackDiag);
                      }
                    }}
                  />
                ) : activeViewMode === 'evidence' ? (
                  /* MÓDULO 05: Evidence Workspace — Evidências Científicas e Grafo */
                  <EvidenceWorkspace
                    patient={patient as Patient}
                    anamnesisText={effectiveAnamnesisText}
                    onGoToAnamnesis={() => setActiveViewMode('anamnesis')}
                  />
                ) : activeViewMode === 'workspace' || (chatMessages.length > 1 && activeViewMode !== 'anamnesis' && activeViewMode !== 'evidence' && activeViewMode !== 'decision') ? (
                  /* MÓDULO 04: Clinical Workspace — Diagnósticos Diferenciais (3 Colunas) */
                  <DifferentialDiagnosisWorkspace 
                    patient={patient as Patient}
                    anamnesisText={effectiveAnamnesisText}
                    uploadedFiles={uploadedExamFiles as { name: string; size: string; data: string; mimeType: string; }[]}
                    aiReportText={generatedReport || (chatMessages.length > 0 ? (chatMessages[chatMessages.length - 1]?.soap?.raw || chatMessages[chatMessages.length - 1]?.text) : undefined)}
                    sources={sources}
                    onOpenPrescription={() => {
                      const fallbackDiag = anamnesis ? `Investigação Clínica (${patient.species || 'Canino'})` : `Diagnóstico e Prescrição para ${patient.species || 'Canino'}`;
                      if (chatMessages.length > 1) {
                        const lastAi = chatMessages.find((m) => m.sender === 'ai');
                        if (lastAi && lastAi.soap) {
                          handleGeneratePrescription(lastAi.soap.a || fallbackDiag);
                        } else {
                          handleGeneratePrescription(fallbackDiag);
                        }
                      } else {
                        handleGeneratePrescription(fallbackDiag);
                      }
                    }}
                    onGeneratePdf={() => window.print()}
                  />
                ) : (
                  /* MÓDULO 02: Dashboard de Anamnese & Triagem */
                  <AnamnesisDashboard 
                    patient={patient as Patient}
                    onUpdatePatient={(p) => setPatient((prev) => ({ ...prev, ...p }))}
                    anamnesisText={anamnesis}
                    onAnamnesisChange={(text) => {
                      setAnamnesis(text);
                    }}
                    uploadedFiles={uploadedExamFiles as { name: string; size: string; data: string; mimeType: string; }[]}
                    onFileUpload={handleExamFileChange}
                    onRemoveFile={(idx) => setUploadedExamFiles((prev) => prev.filter((_, i) => i !== idx))}
                    onSubmitCase={() => {
                      setShowReasoningEngine(true);
                      setActiveViewMode('pipeline');
                      handleTriggerReportGeneration(currentMessageText || anamnesis);
                    }}
                    isGenerating={isGenerating}
                    isRecording={isRecording}
                    recordTimer={recordTimer}
                    onToggleRecording={handleToggleRecording}
                    isTranscribing={isTranscribing}
                    onOpenEditModal={() => setShowPatientModal(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Unconditional hidden file input reference for both central and bottom panels */}
        <input
          type="file"
          hidden
          ref={examInputRef}
          onChange={handleExamFileChange}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
        />

        {/* Dynamic bottom controls and ultra-clean chat input bar (Shown only on chat follow-up) */}
        {chatMessages.length > 1 && (
          <div className="bg-white border-t border-slate-100 p-2.5 sm:p-4 pb-24 sm:pb-24 flex flex-col gap-2 sm:gap-3 shrink-0 z-10 animate-in slide-in-from-bottom duration-300">
            
            {/* List of uploaded files */}
            {uploadedExamFiles.length > 0 && (
              <div className="flex flex-wrap gap-1 px-2">
                {uploadedExamFiles.map((file, i) => (
                  <div
                    key={i}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-indigo-50 border border-indigo-100 text-[9px] sm:text-[10px] font-bold text-indigo-700 rounded-full flex items-center gap-1 animate-in slide-in-from-bottom-2"
                  >
                    <span className="truncate max-w-[100px] sm:max-w-[120px]">{file.name}</span>
                    <button
                      onClick={() => setUploadedExamFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => examInputRef.current?.click()}
                className="p-2 sm:p-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors shrink-0 border border-slate-100 cursor-pointer"
                title="Anexar exames (PDF/Imagem)"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleRecording}
                className={`p-2 sm:p-3 rounded-full transition-colors shrink-0 border cursor-pointer ${
                  isRecording
                    ? "bg-red-500 text-white border-red-500 animate-pulse"
                    : "bg-slate-50 hover:bg-red-55 text-red-650 border-slate-100"
                }`}
                title="Falar por voz"
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Main Single Chat Input Field */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  disabled={isGenerating || isTranscribing}
                  className="w-full text-[11px] sm:text-xs font-semibold py-2 px-3 sm:py-3 sm:pl-4 sm:pr-11 pr-10 border border-slate-150 bg-slate-50 focus:bg-white focus:border-indigo-300 rounded-full outline-none text-slate-800 placeholder:text-slate-400 transition-all disabled:opacity-50"
                  placeholder={isTranscribing ? "Transcrevendo voz..." : "Digite novas informações do tutor ou dúvidas..."}
                  value={currentMessageText}
                  onChange={(e) => setCurrentMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessageUnified();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleSendMessageUnified()}
                  disabled={isGenerating || (!currentMessageText.trim() && uploadedExamFiles.length === 0)}
                  className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5 p-1.5 rounded-full transition-all cursor-pointer bg-slate-200 text-slate-700 hover:bg-indigo-600 hover:text-white disabled:opacity-50 shadow-3xs"
                  title="Enviar mensagem no chat"
                >
                  <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* Explicit Re-evaluate Case Action Button */}
              <button
                type="button"
                onClick={() => handleTriggerReportGeneration()}
                disabled={isGenerating}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-md shadow-indigo-600/15 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 sm:gap-1.5 shrink-0"
                title="Reavaliar caso e atualizar laudo SOAP e diagnósticos com novas informações"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span className="hidden xs:inline">Reavaliar</span>
                <span>Caso</span>
              </button>
            </div>
          </div>
        )}

        {/* Float Patient Register & Identification Modal */}
        <AnimatePresence>
          {showPatientModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowPatientModal(false)}
            >
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 15, opacity: 0 }}
                className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                  <div className="flex items-center gap-2">
                    <PawPrint className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold font-display text-slate-850 text-xs uppercase tracking-wider">Ficha do Paciente e Tutor</h3>
                  </div>
                  <button
                    onClick={() => setShowPatientModal(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick actions for clearing or testing */}
                <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPatient({
                        name: "",
                        species: "Canino",
                        breed: "",
                        age: "",
                        sex: "Macho",
                        weight: "",
                        tutorName: "",
                        tutorPhone: "",
                      });
                      savePatientToSession({
                        name: "",
                        species: "Canino",
                        breed: "",
                        age: "",
                        sex: "Macho",
                        weight: "",
                        tutorName: "",
                        tutorPhone: "",
                      });
                    }}
                    className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all border border-rose-100 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpar Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const demoData = {
                        name: "Thor",
                        species: "Canino",
                        breed: "Golden Retriever",
                        age: "4 anos",
                        sex: "Macho Inteiro",
                        weight: "28.5",
                        tutorName: "Mariana Souza",
                        tutorPhone: "(11) 98765-4321",
                      };
                      setPatient(demoData);
                      savePatientToSession(demoData);
                    }}
                    className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all border border-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Carregar Exemplo (Thor)
                  </button>
                </div>

                {/* Pre-fill loaded patients list shortcut */}
                {savedPatients.length > 0 && (
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block">Carregar Ficha Existente</label>
                    <select
                      onChange={(e) => {
                        const selected = savedPatients.find((p) => p.id === e.target.value);
                        if (selected) {
                          setPatient({
                            name: selected.name,
                            species: selected.species || "Canino",
                            breed: selected.breed || "",
                            age: selected.age || "",
                            weight: selected.weight || "",
                            sex: selected.sex || "Macho",
                            tutorName: selected.tutorName || "",
                            tutorPhone: selected.tutorPhone || "",
                          });
                          if (selected.weight) setCalcWeight(selected.weight.toString());
                        }
                      }}
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 bg-slate-50 rounded-xl outline-none cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>-- Selecione um pet cadastrado --</option>
                      {savedPatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.species}) - {p.breed || "SRD"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="max-h-[75vh] overflow-y-auto space-y-4 pr-1">
                  {/* Paciente */}
                  <div className="space-y-2 text-left">
                    <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Dados do Paciente</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Nome do Pet</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.name || ""}
                          onChange={(e) => handleUpdatePatient({ name: e.target.value })}
                          placeholder="Ex: Thor"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Espécie</label>
                        <select
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300 bg-white"
                          value={patient.species || "Canino"}
                          onChange={(e) => handleUpdatePatient({ species: e.target.value })}
                        >
                          <option value="Canino">Canino</option>
                          <option value="Felino">Felino</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Raça</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.breed || ""}
                          onChange={(e) => handleUpdatePatient({ breed: e.target.value })}
                          placeholder="Ex: Poodle, SRD..."
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Sexo</label>
                        <select
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300 bg-white"
                          value={patient.sex || "Macho"}
                          onChange={(e) => handleUpdatePatient({ sex: e.target.value })}
                        >
                          <option value="Macho">Macho</option>
                          <option value="Fêmea">Fêmea</option>
                        </select>
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Peso (kg)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.weight || ""}
                          onChange={(e) => {
                            handleUpdatePatient({ weight: e.target.value });
                            setCalcWeight(e.target.value);
                          }}
                          placeholder="Ex: 8.5"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Idade</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.age || ""}
                          onChange={(e) => handleUpdatePatient({ age: e.target.value })}
                          placeholder="Ex: 3 anos"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tutor */}
                  <div className="space-y-2 text-left pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Dados do Tutor</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Nome do Tutor</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.ownerName || patient.tutorName || ""}
                          onChange={(e) => handleUpdatePatient({ ownerName: e.target.value, tutorName: e.target.value })}
                          placeholder="Ex: Maria Santos"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Contato / Telefone</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.ownerPhone || patient.tutorPhone || ""}
                          onChange={(e) => handleUpdatePatient({ ownerPhone: e.target.value, tutorPhone: e.target.value })}
                          placeholder="Ex: (11) 99999-8888"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sinais Vitais */}
                  <div className="space-y-2 text-left pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider block">Sinais Vitais na Triagem</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">FC (bpm)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.fc || ""}
                          onChange={(e) => setPatient((p) => ({ ...p, fc: e.target.value }))}
                          placeholder="Ex: 120"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">FR (mpm)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.fr || ""}
                          onChange={(e) => setPatient((p) => ({ ...p, fr: e.target.value }))}
                          placeholder="Ex: 24"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Temp (°C)</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.temperature || ""}
                          onChange={(e) => setPatient((p) => ({ ...p, temperature: e.target.value }))}
                          placeholder="Ex: 38.5"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">TPC</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.tpc || ""}
                          onChange={(e) => setPatient((p) => ({ ...p, tpc: e.target.value }))}
                          placeholder="Ex: < 2s"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Mucosas</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.mucosas || ""}
                          onChange={(e) => setPatient((p) => ({ ...p, mucosas: e.target.value }))}
                          placeholder="Ex: Normocoradas"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black uppercase text-slate-400">Hidratação</label>
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                          value={patient.hydration || ""}
                          onChange={(e) => setPatient((p) => ({ ...p, hydration: e.target.value }))}
                          placeholder="Ex: Normal"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPatientModal(false)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Confirmar Dados
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
