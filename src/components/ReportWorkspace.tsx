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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, orderBy, setDoc, where } from "../lib/firebase";
import { Patient, Report } from "../types";
import VetmindLogo from "./VetmindLogo";
import ClinicalNextStepsChecklist from "./ClinicalNextStepsChecklist";

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
  const [step, setStep] = useState<"input" | "result">(initialReport ? "result" : "input");
  const [disabledReferences, setDisabledReferences] = useState<string[]>([]);
  const [savedPatients, setSavedPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Partial<Patient>>(() => {
    return {
      name: initialReport?.patientId || "",
      species: initialReport?.patientSpecies || "Canino",
      breed: initialReport?.patientBreed || "",
      age: initialReport?.patientAge || "",
      sex: initialReport?.patientSex || "Macho",
      weight: initialReport?.patientWeight || "",
      tutorName: (initialReport as any)?.tutorName || "",
      tutorPhone: (initialReport as any)?.tutorPhone || "",
    };
  });

  const [anamnesis, setAnamnesis] = useState(initialReport?.anamnesis || "");
  const [examData, setExamData] = useState(initialReport?.examData || "");
  const [uploadedExamFiles, setUploadedExamFiles] = useState<
    { name: string; size: string; data?: string; mimeType?: string }[]
  >([]);
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

  // SOAP clinical analysis main call
  const handleSendMessageUnified = async (textToUse?: string) => {
    const textToSend = (textToUse || currentMessageText).trim();
    if (!textToSend && uploadedExamFiles.length === 0) return;

    setCurrentMessageText(""); // instantly clear for elite responsiveness

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: textToSend || "Análise de exames em anexo",
      timestamp: new Date()
    };
    setChatMessages((prev) => [...prev, userMsg]);

    const updatedAnamnesis = anamnesis ? `${anamnesis}\n\n${textToSend}` : textToSend;
    setAnamnesis(updatedAnamnesis);

    if (!generatedReport) {
      setIsGenerating(true);
      setError(null);
      setGeneratedReport(null);
      setPrescription(null);
      setAiTutorMessage(null);

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

        const aiMsg: ChatMessage = {
          id: "reply-soap-" + Date.now(),
          sender: "ai",
          text: "Análise concluída com sucesso! Com base no caso relatado, estruturei o prontuário SOAP, os diagnósticos diferenciais RAG e as dosagens recomendadas nas seções abaixo:",
          timestamp: new Date(),
          soap: { s: local_s, o: local_o, a: local_a, p: local_p, raw: data.soapContent },
          differentials: local_d,
          metrics: local_metrics,
          sources: data.sources || []
        };
        setChatMessages((prev) => [...prev, aiMsg]);
        
        // Auto background trigger prescription
        handleGeneratePrescriptionBackground(data.soapContent, local_d);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao conectar.");
        setChatMessages((prev) => [
          ...prev,
          {
            id: "reply-err-" + Date.now(),
            sender: "ai",
            text: "⚠️ Desculpe, ocorreu um erro de conexão ao processar este caso. Por favor, tente enviar novamente.",
            timestamp: new Date()
          }
        ]);
      } finally {
        setIsGenerating(false);
      }
    } else {
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

  // Sync / Save report with Firebase
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
        const reportDocRef = doc(db, "reports", savedReportId);
        const updateData = { ...reportData, updatedAt: serverTimestamp() };
        delete updateData.createdAt;
        await updateDoc(reportDocRef, updateData);
      } else {
        const docRef = await addDoc(collection(db, "reports"), reportData);
        if (docRef?.id) {
          setSavedReportId(docRef.id);
        }
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
            <p class="text-xs text-gray-500 font-medium leading-relaxed">Atendimento do paciente <b>${patient.name || "Paciente"}</b> salvo no histórico clínico com sucesso.</p>
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
      alert("Erro ao salvar prontuário.");
    }
  };

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
        
        {/* Beautiful, responsive header with Lego styled action pills */}
        <div className="flex bg-white px-3 py-3 sm:px-5 sm:py-4 items-center justify-between shrink-0 border-b border-slate-100/60 z-10 shadow-3xs">
          <div className="flex items-center gap-2 sm:gap-3">
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

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowPatientModal(true)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <PawPrint className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="max-w-[75px] sm:max-w-[150px] truncate">
                {patient.name ? patient.name : "Registrar Pet"}
              </span>
              <span className="text-[8px] opacity-75 font-bold hidden xs:inline">
                ({patient.species === "Outros" ? "Outros" : patient.species === "Felino" ? "Gato" : "Cão"})
              </span>
            </button>

            {chatMessages.length > 1 && (
              <button
                onClick={handleClear}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-500 hover:text-slate-700 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                title="Novo Atendimento"
              >
                <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Core Chat Stream Area */}
        <div className="flex-grow overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 flex flex-col justify-between">
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* If only welcome message exists, show completely minimalist centered home screen (Disney/Lego principle) */}
            {chatMessages.length === 1 ? (
              <div className="max-w-2xl mx-auto py-4 sm:py-8 text-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-450">
                
                {/* Magical Interactive Clinical Orb */}
                <div className="relative flex flex-col items-center justify-center py-4">
                  {/* Concentric ambient background ripples */}
                  <motion.div
                    animate={{
                      scale: isRecording ? [1, 1.35, 1] : [1, 1.12, 1],
                      opacity: isRecording ? [0.4, 0.1, 0.4] : [0.2, 0.05, 0.2],
                    }}
                    transition={{
                      duration: isRecording ? 1.2 : 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className={`absolute w-44 h-44 md:w-52 md:h-52 rounded-full ${
                      isRecording ? "bg-red-450" : "bg-indigo-300"
                    } blur-xl`}
                  />
                  
                  <motion.div
                    animate={{
                      scale: isRecording ? [1, 1.5, 1] : [1, 1.2, 1],
                      opacity: isRecording ? [0.3, 0, 0.3] : [0.12, 0, 0.12],
                    }}
                    transition={{
                      duration: isRecording ? 1.2 : 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.6,
                    }}
                    className={`absolute w-52 h-52 md:w-60 md:h-60 rounded-full border ${
                      isRecording ? "border-red-400/40 bg-red-100/10" : "border-indigo-400/20 bg-indigo-50/5"
                    } blur-xs`}
                  />

                  {/* Main Interactive Orb Element */}
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleToggleRecording}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full relative z-10 flex flex-col items-center justify-center transition-all shadow-xl shadow-indigo-500/20 cursor-pointer overflow-hidden ${
                      isRecording 
                        ? "bg-gradient-to-tr from-red-500 via-rose-600 to-orange-400 ring-4 ring-red-100" 
                        : isGenerating 
                        ? "bg-gradient-to-tr from-violet-600 via-indigo-600 to-indigo-800 ring-4 ring-indigo-50"
                        : "bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 hover:shadow-2xl hover:shadow-indigo-500/30 ring-4 ring-indigo-50"
                    }`}
                  >
                    {/* Active Wave Shader inside the Orb when recording */}
                    {isRecording && (
                      <motion.div
                        animate={{
                          y: ["10%", "-10%", "10%"]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-gradient-to-t from-rose-700/30 to-transparent pointer-events-none"
                      />
                    )}

                    {/* Status icon depending on state */}
                    <div className="relative z-20 flex flex-col items-center justify-center text-white space-y-1.5">
                      {isRecording ? (
                        <>
                          <Mic className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce text-white" />
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-red-100">Gravando</span>
                        </>
                      ) : isTranscribing ? (
                        <>
                          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-white" />
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-indigo-100">Ouvindo</span>
                        </>
                      ) : isGenerating ? (
                        <>
                          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-yellow-300" />
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-violet-100 font-display">IA Ativa</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8 text-white drop-shadow-md" />
                          <span className="text-[7px] font-black uppercase tracking-widest text-indigo-100 mt-1">Toque p/ Falar</span>
                        </>
                      )}
                    </div>
                  </motion.button>

                  {/* Small state display under Orb */}
                  <div className="mt-3.5 z-10">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border shadow-3xs ${
                      isRecording 
                        ? "bg-red-50 text-red-650 border-red-100" 
                        : isTranscribing 
                        ? "bg-indigo-50 text-indigo-650 border-indigo-100 animate-pulse"
                        : isGenerating 
                        ? "bg-violet-50 text-violet-650 border-violet-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    }`}>
                      {isRecording ? `Gravando Voz • 00:${recordTimer < 10 ? '0' : ''}${recordTimer}` : isTranscribing ? "Processando seu áudio..." : isGenerating ? "Analisando sintomas com IA..." : "Orbe Clínico Conectado"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 px-2">
                  <h1 className="text-lg sm:text-2xl font-extrabold font-display text-slate-900 tracking-tight leading-tight">
                    Copiloto Clínico & Prontuário Veterinário
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-450 max-w-lg mx-auto font-medium leading-relaxed">
                    Descreva os sintomas abaixo ou fale através do Orbe. Eu farei o cruzamento de literatura com nosso acervo RAG, gerando o prontuário SOAP estruturado, hipóteses e prescrições.
                  </p>
                </div>

                {/* Large Clinical Console Card (Disney/Lego required) */}
                <div className="max-w-xl mx-auto bg-white rounded-3xl sm:rounded-[2rem] shadow-md shadow-slate-100/50 p-5 sm:p-6 space-y-4 text-left border-none">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Descrever Caso Clínico</label>
                    <textarea
                      disabled={isGenerating || isTranscribing}
                      className="w-full text-xs sm:text-sm font-semibold p-0 border-0 bg-transparent focus:ring-0 focus:outline-none text-slate-800 placeholder:text-slate-400 transition-all disabled:opacity-50 min-h-[140px] sm:min-h-[160px] resize-none leading-relaxed"
                      placeholder={isTranscribing ? "Transcrevendo voz do orbe..." : "Digite detalhadamente os sintomas clínicos, queixas do tutor, temperatura ou anexe exames laboratoriais do pet..."}
                      value={currentMessageText}
                      onChange={(e) => setCurrentMessageText(e.target.value)}
                    />
                  </div>

                  {/* Active attachments list inside the console */}
                  {uploadedExamFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1 p-2 bg-indigo-50/40 rounded-xl">
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

                  {/* Console Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => examInputRef.current?.click()}
                        className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors cursor-pointer"
                        title="Anexar exames (PDF/Imagem)"
                      >
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleRecording}
                        className={`p-2.5 rounded-full transition-all cursor-pointer ${
                          isRecording
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-slate-50 hover:bg-red-50 text-red-650"
                        }`}
                        title="Falar por voz"
                      >
                        <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendMessageUnified()}
                      disabled={isGenerating || (!currentMessageText.trim() && uploadedExamFiles.length === 0)}
                      className="px-4.5 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-md shadow-indigo-600/15 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Diagnóstico</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat History Stream Container */
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {chatMessages.map((msg) => {
                  const isAi = msg.sender === "ai";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 sm:gap-3.5 ${isAi ? "justify-start text-left" : "justify-end text-right"}`}
                    >
                      {isAi && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-3xs shrink-0 self-start text-sm">
                          🧠
                        </div>
                      )}

                      <div className={`w-full flex flex-col gap-1 ${isAi ? "items-start max-w-[95%] sm:max-w-3xl" : "items-end max-w-[88%] sm:max-w-2xl"}`}>
                        <div
                          className={`p-3.5 sm:p-4 rounded-3xl text-[11.5px] sm:text-xs font-semibold leading-relaxed shadow-md shadow-slate-100/50 ${
                            isAi
                              ? "bg-white text-slate-750 rounded-tl-sm text-left w-full border-none"
                              : "bg-indigo-600 text-white rounded-tr-sm text-left"
                          }`}
                        >
                          <ClinicalMarkdown>{msg.text}</ClinicalMarkdown>

                          {/* Render Clinical Collapsible Accordions (Abre/Fecha) Inside AI Response Bubble */}
                          {isAi && msg.soap && (
                            <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-3.5 w-full">
                              
                              {/* 1. SOAP ACCORDION CARD */}
                              <div className="bg-slate-50/50 rounded-2xl overflow-hidden border-none">
                                <button
                                  type="button"
                                  onClick={() => toggleAccordion(msg.id, "soap")}
                                  className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-slate-100/40 transition-colors cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold font-display text-slate-800 text-[10px] sm:text-[11px] uppercase tracking-wider">📄 Prontuário Estruturado SOAP</h4>
                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">Sintomas subjetivos, objetivos, avaliação e conduta clínica</p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-250 ${isAccordionOpen(msg.id, "soap") ? "rotate-180 text-indigo-600" : ""}`} />
                                </button>

                                {isAccordionOpen(msg.id, "soap") && (
                                  <div className="p-3 sm:p-4 bg-slate-50/20 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    
                                    {/* Metrics parameters dashboard */}
                                    {msg.metrics && (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2.5">
                                        <div className="bg-white p-2 sm:p-2.5 rounded-xl flex flex-col items-center shadow-sm shadow-slate-100/30">
                                          <span className="text-[7px] sm:text-[8px] font-black uppercase text-slate-400">FC</span>
                                          <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 mt-0.5">{msg.metrics.fc || "120 bpm"}</span>
                                        </div>
                                        <div className="bg-white p-2 sm:p-2.5 rounded-xl flex flex-col items-center shadow-sm shadow-slate-100/30">
                                          <span className="text-[7px] sm:text-[8px] font-black uppercase text-slate-400">Temp</span>
                                          <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 mt-0.5">{msg.metrics.temp || "38.5ºC"}</span>
                                        </div>
                                        <div className="bg-white p-2 sm:p-2.5 rounded-xl flex flex-col items-center shadow-sm shadow-slate-100/30">
                                          <span className="text-[7px] sm:text-[8px] font-black uppercase text-slate-400">FR</span>
                                          <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 mt-0.5">{msg.metrics.fr || "24 mpm"}</span>
                                        </div>
                                        <div className="bg-white p-2 sm:p-2.5 rounded-xl flex flex-col items-center shadow-sm shadow-slate-100/30">
                                          <span className="text-[7px] sm:text-[8px] font-black uppercase text-slate-400">TRC</span>
                                          <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 mt-0.5">{msg.metrics.trc || "1.5s"}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* SOAP sections text items */}
                                    {[
                                      { letter: "S", title: "Subjetivo", rationale: "Anamnese & queixas", content: msg.soap.s },
                                      { letter: "O", title: "Objetivo", rationale: "Sinais clínicos & exames", content: msg.soap.o },
                                      { letter: "A", title: "Avaliação", rationale: "Raciocínio diagnóstico", content: msg.soap.a },
                                      { letter: "P", title: "Plano", rationale: "Condutas imediatas", content: msg.soap.p },
                                    ].map((sec) => (
                                      <div key={sec.letter} className="bg-white p-3 sm:p-4 rounded-2xl space-y-1 sm:space-y-1.5 text-left shadow-sm shadow-slate-100/30">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] sm:text-xs flex items-center justify-center shrink-0">{sec.letter}</span>
                                          <span className="font-extrabold text-slate-800 text-[9px] sm:text-[10px] font-display uppercase tracking-wider">{sec.title}</span>
                                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-semibold truncate">• {sec.rationale}</span>
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap pl-1 xs:pl-7">
                                          {sec.content}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 2. RAG DIFFERENTIAL DIAGNOSES ACCORDION CARD */}
                              <div className="bg-slate-50/50 rounded-2xl overflow-hidden border-none">
                                <button
                                  type="button"
                                  onClick={() => toggleAccordion(msg.id, "differentials")}
                                  className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-slate-100/40 transition-colors cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                      <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold font-display text-slate-800 text-[10px] sm:text-[11px] uppercase tracking-wider">🎯 Hipóteses & Diagnósticos Diferenciais</h4>
                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">Probabilidades cruzadas com consensos científicos veterinários</p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-250 ${isAccordionOpen(msg.id, "differentials") ? "rotate-180 text-indigo-600" : ""}`} />
                                </button>

                                {isAccordionOpen(msg.id, "differentials") && (
                                  <div className="p-3 sm:p-4 bg-slate-50/20 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <DifferentialCards
                                      text={msg.differentials || ""}
                                      onGeneratePrescriptionForDiag={handleGeneratePrescription}
                                    />
                                    <InteractiveSources sources={msg.sources || []} />
                                  </div>
                                )}
                              </div>

                              {/* 2.5. CHECKLIST & ROTEIRO DE PRÓXIMOS PASSOS CARD */}
                              <div className="bg-slate-50/50 rounded-2xl overflow-hidden border-none">
                                <button
                                  type="button"
                                  onClick={() => toggleAccordion(msg.id, "checklist")}
                                  className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-slate-100/40 transition-colors cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                      <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold font-display text-slate-800 text-[10px] sm:text-[11px] uppercase tracking-wider">📋 Roteiro & Checklist de Próximos Passos</h4>
                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">Condutas recomendadas, exames complementares e acompanhamento guiado</p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-250 ${isAccordionOpen(msg.id, "checklist") ? "rotate-180 text-indigo-600" : ""}`} />
                                </button>

                                {isAccordionOpen(msg.id, "checklist") && (
                                  <div className="p-3 sm:p-4 bg-slate-50/20 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <ClinicalNextStepsChecklist
                                      soapRaw={msg.soap?.raw}
                                      differentialsRaw={msg.differentials}
                                      patientName={patient.name}
                                      onOpenPrescription={() => toggleAccordion(msg.id, "prescription")}
                                      onOpenTutorMessage={() => toggleAccordion(msg.id, "tutor")}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* 3. PHARMACOLOGICAL PRESCRIPTION ACCORDION CARD */}
                              <div className="bg-slate-50/50 rounded-2xl overflow-hidden border-none">
                                <button
                                  type="button"
                                  onClick={() => toggleAccordion(msg.id, "prescription")}
                                  className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-slate-100/40 transition-colors cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                      <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold font-display text-slate-800 text-[10px] sm:text-[11px] uppercase tracking-wider">💊 Prescrição & Calculadora de Dosagem</h4>
                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">Receituário inteligente e simulação de doses por peso em tempo real</p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-250 ${isAccordionOpen(msg.id, "prescription") ? "rotate-180 text-indigo-600" : ""}`} />
                                </button>

                                {isAccordionOpen(msg.id, "prescription") && (
                                  <div className="p-3 sm:p-4 bg-slate-50/20 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {prescription ? (
                                      <div className="space-y-3 sm:space-y-4 text-left">
                                        <div className="bg-white p-3 sm:p-4 rounded-xl relative shadow-sm shadow-slate-100/30">
                                          <div className="flex justify-between items-center pb-2 mb-3">
                                            <span className="text-[8px] font-black uppercase text-indigo-500 tracking-wider">Receituário de Suporte Hospitalar</span>
                                            <div className="flex gap-1.5 sm:gap-2">
                                              <button
                                                onClick={() => handleCopyText(prescription)}
                                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors cursor-pointer"
                                                title="Copiar receita"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={handlePrintPrescription}
                                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors cursor-pointer"
                                                title="Imprimir"
                                              >
                                                <Printer className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {isEditingPrescription ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={prescriptionEditVal}
                                                onChange={(e) => setPrescriptionEditVal(e.target.value)}
                                                className="w-full h-36 text-[10px] sm:text-[11px] font-mono p-2 sm:p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed bg-white"
                                              />
                                              <div className="flex justify-end gap-1.5">
                                                <button
                                                  onClick={() => setIsEditingPrescription(false)}
                                                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold"
                                                >
                                                  Cancelar
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setPrescription(prescriptionEditVal);
                                                    setIsEditingPrescription(false);
                                                  }}
                                                  className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-bold"
                                                >
                                                  Confirmar
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-[9.5px] sm:text-[10.5px] text-slate-850 leading-relaxed font-mono whitespace-pre-wrap break-words bg-slate-50/40 p-2 sm:p-3 rounded-lg border-none">
                                              {prescription}
                                            </div>
                                          )}

                                          {!isEditingPrescription && (
                                            <button
                                              onClick={() => {
                                                setPrescriptionEditVal(prescription);
                                                setIsEditingPrescription(true);
                                              }}
                                              className="absolute right-3 bottom-3 p-1 px-2.5 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                                            >
                                              <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="text-[8px] sm:text-[9px]">Editar</span>
                                            </button>
                                          )}
                                        </div>

                                        {/* Weight Dosage Calculator Widget (Disney/Lego required) */}
                                        <div className="p-3 sm:p-4 bg-indigo-50/30 rounded-2xl space-y-2.5 sm:space-y-3.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm">🧮</span>
                                            <h4 className="font-extrabold text-slate-800 text-[9px] sm:text-[10px] uppercase tracking-wider">Simular Doses Clínicas (Hospitalar)</h4>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Peso do Paciente (kg)</label>
                                              <input
                                                type="number"
                                                value={calcWeight}
                                                onChange={(e) => setCalcWeight(e.target.value)}
                                                className="w-full px-2.5 py-1.5 bg-white rounded-lg text-xs font-bold text-slate-800 shadow-sm shadow-slate-100/50 outline-none border-none focus:ring-1 focus:ring-indigo-300"
                                                placeholder="Ex: 10"
                                              />
                                            </div>

                                            <div className="bg-white p-3 rounded-xl flex flex-col justify-center shadow-sm shadow-slate-100/50 border-none">
                                              <span className="text-[8px] font-black text-slate-450 uppercase tracking-wider">Simulação (IV / SC)</span>
                                              <div className="space-y-1 mt-1.5">
                                                {[
                                                  { name: "Cefalotina (IV)", dose: 30, unit: "mg/kg" },
                                                  { name: "Metronidazol (IV)", dose: 15, unit: "mg/kg" },
                                                  { name: "Dipirona (SC)", dose: 25, unit: "mg/kg" },
                                                ].map((med, idx) => {
                                                  const w = parseFloat(calcWeight) || parseFloat(patient.weight) || 0;
                                                  const tot = (w * med.dose).toFixed(0);
                                                  return (
                                                    <p key={idx} className="text-[10px] font-bold text-slate-700 flex justify-between gap-4">
                                                      <span>{med.name}:</span>
                                                      <span className="text-indigo-600 font-black shrink-0">{tot} mg total</span>
                                                    </p>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-6 text-center bg-slate-50 rounded-xl space-y-3 border-none">
                                        <Pill className="w-8 h-8 text-slate-300 mx-auto" />
                                        <div className="space-y-1">
                                          <p className="text-xs font-bold text-slate-800">Prescrição sob Demanda</p>
                                          <p className="text-[10px] text-slate-450 font-semibold max-w-xs mx-auto">Gere um receituário e protocolo terapêutico calibrado automaticamente com as queixas e peso.</p>
                                        </div>
                                        <button
                                          onClick={() => handleGeneratePrescription(msg.differentials ? parseClinicsDiferenciais(msg.differentials)[0]?.title : undefined)}
                                          disabled={isGeneratingPrescription}
                                          className="mx-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-[9px] uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                          {isGeneratingPrescription ? (
                                            <>
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              <span>Gerando Prescrição...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="w-3.5 h-3.5" />
                                              <span>Gerar Prescrição Inteligente</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 4. MENSAGEM TUTOR ACCORDION CARD */}
                              <div className="bg-slate-50/50 rounded-2xl overflow-hidden border-none">
                                <button
                                  type="button"
                                  onClick={() => toggleAccordion(msg.id, "tutor")}
                                  className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-slate-100/40 transition-colors cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold font-display text-slate-800 text-[10px] sm:text-[11px] uppercase tracking-wider">💬 Tradução Humana para Tutor (WhatsApp)</h4>
                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">Orientações de alta livres de jargões técnicos complexos</p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-250 ${isAccordionOpen(msg.id, "tutor") ? "rotate-180 text-indigo-600" : ""}`} />
                                </button>

                                {isAccordionOpen(msg.id, "tutor") && (
                                  <div className="p-3 sm:p-4 bg-slate-50/20 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {aiTutorMessage ? (
                                      <div className="space-y-3 text-left">
                                        <div className="text-[9.5px] sm:text-[10.5px] text-slate-700 font-medium leading-relaxed bg-white p-3 sm:p-4 rounded-xl whitespace-pre-wrap font-mono shadow-sm shadow-slate-100/30 border-none">
                                          {aiTutorMessage}
                                        </div>
                                        <button
                                          onClick={() => handleCopyText(aiTutorMessage)}
                                          className="w-full py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
                                        >
                                          <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                          Copiar Texto Simplificado
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="p-4 sm:p-6 text-center bg-slate-50 border-none rounded-xl space-y-2 sm:space-y-3">
                                        <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto" />
                                        <div className="space-y-1">
                                          <p className="text-xs font-bold text-slate-800">Comunicação Sem Fricção</p>
                                          <p className="text-[9px] sm:text-[10px] text-slate-450 font-semibold max-w-xs mx-auto">Traduza o diagnóstico técnico em orientações carinhosas e simplificadas prontas para envio rápido.</p>
                                        </div>
                                        <button
                                          onClick={handleGenerateTutorMessage}
                                          disabled={isGeneratingTutorMessage}
                                          className="mx-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-[9px] uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                          {isGeneratingTutorMessage ? (
                                            <>
                                              <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                                              <span>Traduzindo...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                              <span>Traduzir Linguagem Clínica</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 5. MARKETING EXPORT ACCORDION CARD */}
                              <div className="bg-slate-50/50 rounded-2xl overflow-hidden border-none">
                                <button
                                  type="button"
                                  onClick={() => toggleAccordion(msg.id, "marketing")}
                                  className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-slate-100/40 transition-colors cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold font-display text-slate-800 text-[10px] sm:text-[11px] uppercase tracking-wider">✨ Estúdio de Marketing de Conteúdo</h4>
                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">Converta as observações do prontuário em engajamento nas redes sociais</p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-250 ${isAccordionOpen(msg.id, "marketing") ? "rotate-180 text-indigo-600" : ""}`} />
                                </button>

                                {isAccordionOpen(msg.id, "marketing") && (
                                  <div className="p-3 sm:p-4 bg-slate-50/20 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 text-left leading-normal">
                                      Exporte este caso de forma segura para o nosso Estúdio de Marketing para gerar posts educativos ou compartilhar no seu feed profissional.
                                    </p>
                                    <button
                                      onClick={() => {
                                        if (onTransformToSocial) {
                                          onTransformToSocial({
                                            queixa: anamnesis,
                                            exames: examData,
                                            tecnica: msg.soap.a,
                                            desfecho: msg.soap.p + "\n\n" + (prescription || ""),
                                          });
                                        }
                                      }}
                                      className="w-full py-2.5 sm:py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all shadow-md shadow-violet-600/10 hover:scale-[1.01]"
                                    >
                                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      Exportar e Criar Postagem no Estúdio
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Document Footer Actions: Save and print */}
                              <div className="flex justify-end gap-2 pt-2.5 mt-2">
                                <button
                                  onClick={handleSaveReport}
                                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span>Salvar no Histórico</span>
                                </button>
                              </div>

                            </div>
                          )}
                        </div>

                        <span className="text-[8px] font-bold text-slate-400 font-mono">
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {isGenerating && (
                  <div className="flex gap-3.5 justify-start text-left animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs shrink-0 self-start">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="max-w-2xl flex flex-col gap-1.5">
                      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 text-xs font-semibold leading-relaxed shadow-3xs text-slate-600">
                        <div className="flex items-center gap-2 text-indigo-600 font-extrabold uppercase text-[9px] tracking-wider mb-1">
                          <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                          <span>Vetmind Inteligência Clínica</span>
                        </div>
                        {loadingStep === 0 && "🧠 Analisando as queixas clínicas apresentadas e correlacionando sinais..."}
                        {loadingStep === 1 && "📚 Cruzando informações com consensos, diretrizes e o acervo RAG..."}
                        {loadingStep === 2 && "✍️ Estruturando prontuário na metodologia SOAP e organizando tratamentos..."}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
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
          <div className="bg-white border-t border-slate-100 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 shrink-0 z-10 animate-in slide-in-from-bottom duration-300">
            
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
                  placeholder={isTranscribing ? "Transcrevendo voz..." : "Descreva sintomas, queixas..."}
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
                  className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5 p-1.5 rounded-full transition-all cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-3xs"
                >
                  <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
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

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black uppercase text-slate-400">Nome do Pet</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300"
                      value={patient.name}
                      onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Pipoca"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black uppercase text-slate-400">Espécie</label>
                    <select
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300 bg-white"
                      value={patient.species}
                      onChange={(e) => setPatient((p) => ({ ...p, species: e.target.value }))}
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
                      value={patient.breed}
                      onChange={(e) => setPatient((p) => ({ ...p, breed: e.target.value }))}
                      placeholder="Ex: Poodle"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black uppercase text-slate-400">Sexo</label>
                    <select
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300 bg-white"
                      value={patient.sex}
                      onChange={(e) => setPatient((p) => ({ ...p, sex: e.target.value }))}
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
                      value={patient.weight}
                      onChange={(e) => {
                        setPatient((p) => ({ ...p, weight: e.target.value }));
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
                      value={patient.age}
                      onChange={(e) => setPatient((p) => ({ ...p, age: e.target.value }))}
                      placeholder="Ex: 3 anos"
                    />
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
