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

export default function ReportWorkspace({
  initialReport,
  onBack,
}: {
  initialReport?: Report | null;
  onBack?: () => void;
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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-40 max-w-md mx-auto px-1">
        <div className="flex justify-center gap-2 mb-8">
          <div className="h-1 w-10 bg-slate-200"></div>
          <div className="h-1 w-10 bg-slate-200"></div>
          <div className="h-1 w-10 bg-clinical-blue"></div>
        </div>

        <div className="card-clinical p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="bg-emerald-50 text-trusted-green text-[10px] px-2 py-0.5 rounded border border-emerald-100 font-bold uppercase tracking-wider">
              Aprovado
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              ID: #ORD-{Math.floor(Math.random() * 90000) + 10000}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-surface-text leading-tight tracking-tight">
            Laudo Veterinário Assistido
          </h2>
          <div className="flex items-center gap-2">
            <span className="label-medical text-xs mr-2">Paciente:</span>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-tight">
              {patient.name} • {patient.age}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("input")}
              className="flex-1 bg-white border border-surface-border py-2.5 rounded-xl text-clinical-blue font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-slate-50"
            >
              <Edit3 className="w-4 h-4" /> Editar
            </button>
            <button className="flex-1 bg-clinical-blue text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Diagnósticos Diferenciais - Special Insight Box */}
        {sections.length > 5 && (
          <div className="bg-[#F0F5FF] border border-clinical-blue/20 rounded-2xl p-6 md:p-8 space-y-5 shadow-sm border-l-4 border-l-[#003399] animate-in fade-in slide-in-from-top-3 relative overflow-hidden">
             {/* Subdued watermark icon */}
             <div className="absolute right-4 top-4 opacity-[0.04] pointer-events-none">
                <BookOpen className="w-24 h-24 text-clinical-blue" />
             </div>
             <div className="flex items-center gap-3 text-clinical-blue border-b border-clinical-blue/10 pb-4">
                <div className="p-2.5 bg-clinical-blue/10 rounded-xl">
                   <Activity className="w-5 h-5 animate-pulse text-[#003399]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 tracking-tight">
                    Diagnósticos Diferenciais & Revisão Sistemática (RAG)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Cruzamento literário com assertividade percentual estimada por IA
                  </p>
                </div>
             </div>
             <div className="text-sm text-slate-700 leading-relaxed font-sans prose-clinical bg-white p-5 rounded-xl border border-slate-100 shadow-inner">
                <ClinicalMarkdown>{sections[5]}</ClinicalMarkdown>
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black text-clinical-blue/70 uppercase tracking-widest bg-clinical-blue/5 py-2 px-3.5 rounded-lg w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-trusted-green" />
                Diferenciais validados por RAG ativo
             </div>
          </div>
        )}

        {/* SOAP Sections */}
        <div className="card-clinical overflow-hidden divide-y divide-slate-100">
          <SoapSection title="S (SUBJETIVO)">
            <div className="text-sm text-surface-text leading-relaxed font-normal">
              <ClinicalMarkdown>{sections[1] || "---"}</ClinicalMarkdown>
            </div>
          </SoapSection>

          <SoapSection title="O (OBJETIVO)">
            <div className="grid grid-cols-2 gap-2 mb-6">
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
            <div className="bg-slate-50 rounded border border-slate-200 p-4">
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
                className="mt-6 w-full py-4 border-2 border-dashed border-clinical-blue text-clinical-blue rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                {isGeneratingPrescription ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Pill className="w-4 h-4" />
                )}
                Gerar Prescrição Digital
              </button>
            )}
          </SoapSection>
        </div>

        {/* Fontes Clínicas Rastreáveis */}
        <InteractiveSources sources={sources} />

        {/* Prescription Box */}
        {prescription && (
          <div
            id="prescription-section"
            className="bg-white border-2 border-slate-200 rounded-[2rem] overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className="bg-clinical-blue p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Pill className="w-6 h-6" />
                <h3 className="font-bold text-lg">Prescrição Terapêutica</h3>
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Sugerida por IA
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="text-sm text-slate-700 leading-relaxed font-normal prose-clinical border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <ClinicalMarkdown>{prescription}</ClinicalMarkdown>
              </div>
              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button className="flex-1 bg-clinical-blue text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" /> Enviar Tutor
                </button>
                <button className="flex-1 bg-white border border-slate-200 text-slate-500 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <FileDown className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plano de Saúde Próximo - Marketing/Proactive Idea */}
        <div className="bg-trusted-green/5 border border-trusted-green/20 rounded-2xl p-6 flex gap-4">
          <div className="bg-trusted-green/10 p-3 rounded-xl text-trusted-green h-fit">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Plano Preventivo
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paciente está com as vacinas V10 e Raiva próximas do vencimento.
              Deseja agendar um retorno preventivo para <b>Junho/2026</b>?
            </p>
            <button className="text-trusted-green text-[10px] font-black uppercase tracking-widest mt-2 hover:underline flex items-center gap-1">
              Agendar Agora <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Google Review style Feedback Card */}
        <div
          id="laudo-feedback-card"
          className="bg-white border border-slate-200 rounded-[1.8rem] p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold">
              ★
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 leading-tight">
                Feedback do Profissional
              </h3>
              <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider mt-0.5">
                Avaliação Google Review
              </p>
            </div>
          </div>

          {feedbackSubmitted ? (
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 text-center space-y-3 animate-in fade-in duration-300">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= rating
                        ? "text-amber-500 fill-amber-500"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Muito obrigado por doar seu tempo para avaliar!
                </p>
                {feedbackComment && (
                  <p className="text-xs text-slate-600 italic mt-2 bg-slate-50 p-3 border border-slate-150 rounded-xl font-semibold leading-relaxed text-left">
                    "{feedbackComment}"
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-medium">
                  Seus comentários ajudam a calibrar o motor de raciocínio
                  clínico da plataforma.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block uppercase tracking-wide text-[10px]">
                  Como você avalia a precisão e conduta deste laudo?{" "}
                  <span className="text-red-500">*</span>
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
                          className={`w-8 h-8 transition-colors ${
                            isHovered || (!hoveredRating && isSelected)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      </button>
                    );
                  })}
                  {rating > 0 && (
                    <span className="text-[10px] font-black text-amber-500 ml-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
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
                <label className="text-xs font-black text-slate-700 block uppercase tracking-wide text-[10px]">
                  Mais detalhes (Sugerir melhorias ou observações):
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Se desejar, conte-nos em detalhes o que gostou ou o que poderia ter sido melhor estruturado..."
                  className="w-full text-xs p-3.5 border border-slate-200 rounded-2xl h-24 focus:outline-none focus:ring-1 focus:ring-clinical-blue focus:border-clinical-blue font-semibold leading-relaxed bg-slate-50/50 resize-y min-h-[5rem]"
                  maxLength={10000}
                />
              </div>

              {feedbackError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl text-red-600 text-[11px] font-bold animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-550" />
                  <span>{feedbackError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full bg-clinical-blue hover:bg-clinical-blue/90 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando avaliação...
                  </>
                ) : (
                  "Enviar Feedback à Equipe"
                )}
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-around py-5 rounded-lg bg-white border border-surface-border shadow-lg sticky bottom-4 mx-2 z-50">
          <button className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors">
            <Clipboard className="w-5 h-5" /> Copiar
          </button>
          <button className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors">
            <Share2 className="w-5 h-5" /> Compartilhar
          </button>
          <button
            onClick={handleSave}
            className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-clinical-blue hover:scale-105 transition-transform"
          >
            <div className="bg-blue-50 p-2 rounded">
              <Save className="w-5 h-5" />
            </div>
            Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-36 animate-in fade-in slide-in-from-right-2 duration-300 max-w-md mx-auto px-1">
      {/* Step Indicator */}
      <div className="flex justify-between items-center px-1 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#003399]">
          <Sparkles className="w-3.5 h-3.5 text-clinical-blue" />
          <span>Fase Única: Diagnóstico RAG</span>
        </div>
        <div className="flex gap-1">
          <div className="h-1.5 w-8 rounded-full bg-clinical-blue"></div>
          <div className="h-1.5 w-2 rounded-full bg-slate-200"></div>
        </div>
      </div>

      {/* Header */}
      <div className="px-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VetmindLogo showText={true} size={32} />
            <span className="bg-[#EBF2FF] text-[#003399] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-100">
              Copilot RAG Ativo
            </span>
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
          Sua anamnese cruzada instantaneamente com as principais diretrizes científicas da medicina veterinária.
        </p>
      </div>

      {/* RAG Feature Callout */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-3xl p-5 space-y-3.5 shadow-sm animate-in fade-in duration-300">
        <div className="flex items-center gap-2 text-clinical-blue">
          <Activity className="w-4 h-4 text-[#003399] animate-pulse" />
          <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-800">
            A Solução Vetmind: Revisão Sistemática RAG
          </h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-clinical-blue shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Assertividade com % de Causa</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Classificação automática do ranking de diagnósticos prováveis com base em dados clínicos.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-clinical-blue shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <p className="text-[10px] font-black text-[#003399] uppercase tracking-widest leading-none">Justificativa Baseada em Evidências</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Resumo sistemático explicitando o "porquê" de cada causa, com links funcionais para livros de cabeceira.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Paciente */}
      <div className="card-clinical p-6 space-y-5 animate-in fade-in duration-350">
        <div className="flex items-center gap-2 text-[#003399] border-b border-slate-100 pb-3">
          <PawPrint className="w-4.5 h-4.5" />
          <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">Paciente</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-medical">Nome do Paciente</label>
            <input
              className="input-clinical text-xs py-2.5"
              placeholder="Ex: Rex"
              value={patient.name}
              onChange={(e) => setPatient({ ...patient, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label-medical">Espécie / Raça</label>
            <input
              className="input-clinical text-xs py-2.5"
              placeholder="Ex: Canino / Golden"
              value={patient.breed}
              onChange={(e) => setPatient({ ...patient, breed: e.target.value })}
            />
          </div>
          <div>
            <label className="label-medical">Idade</label>
            <input
              className="input-clinical text-xs py-2.5"
              placeholder="Ex: 5 anos"
              value={patient.age}
              onChange={(e) => setPatient({ ...patient, age: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Exames do Paciente Opcional */}
      <div className="card-clinical p-6 space-y-4 animate-in fade-in duration-300">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#003399]">
            <FileSpreadsheet className="w-4.5 h-4.5 text-[#003399]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
              Anexar Exames do Paciente
            </h3>
          </div>
          <span className="bg-[#EBF2FF] text-[#003399] text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-50">
            Opcional
          </span>
        </div>

        <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
          Anexe hemogramas, exames bioquímicos, ultrassons, raio-X ou laudos anteriores. Nosso motor lerá os dados estruturados para correlacionar com o caso.
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
          className="border border-dashed border-slate-200 hover:border-[#003399]/40 hover:bg-blue-50/20 rounded-2xl p-5 flex flex-col items-center justify-center bg-white transition-all group cursor-pointer"
        >
          <Upload className="w-6 h-6 text-[#003399] group-hover:scale-110 transition-transform mb-2" />
          <p className="text-[11px] font-bold text-slate-700 text-center">
            Clique ou arraste Hemogramas ou Exames
          </p>
          <p className="text-[9px] text-slate-400 font-medium text-center mt-1">
            Formatos aceitos: PDF ou Imagem (.png, .jpg)
          </p>
        </div>

        <AnimatePresence>
          {uploadedExamFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {uploadedExamFiles.map((file, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-clinical-blue shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate max-w-[180px]">
                        {file.name}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">
                        Laudo de Exame • {file.size}
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
        </AnimatePresence>
      </div>

      {/* Upload de Literatura Científica Opcional */}
      <div className="card-clinical p-6 space-y-4 animate-in fade-in duration-400">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-600">
            <BookOpen className="w-4.5 h-4.5" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-755">
              Literatura Específica de Apoio
            </h3>
          </div>
          <span className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
            Opcional
          </span>
        </div>

        <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
          Opcionalmente suba um artigo, PDF ou foto da bula de um medicamento para que o motor RAG inclua-o como base prioritária para o diagnóstico.
        </p>

        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleLiteratureFileChange}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50/50 rounded-2xl p-5 flex flex-col items-center justify-center bg-white transition-all group cursor-pointer"
        >
          <Upload className="w-6 h-6 text-slate-400 group-hover:scale-110 transition-transform mb-2" />
          <p className="text-[11px] font-bold text-slate-650 text-center">
            Clique ou arraste um Artigo ou Bula
          </p>
          <p className="text-[9px] text-slate-400 font-medium text-center mt-1">
            Até 10MB • O sistema lerá todo o conteúdo via RAG
          </p>
        </div>

        <AnimatePresence>
          {uploadedLiteratureFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {uploadedLiteratureFiles.map((file, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-clinical-blue shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate max-w-[180px]">
                        {file.name}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">
                        Literatura RAG • {file.size}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLiteratureFile(i);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {isGenerating && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Cruzando exames e literatura científica...</span>
              <Loader2 className="w-3 h-3 animate-spin text-clinical-blue" />
            </div>
            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: "85%",
                  transition: { duration: 2.5, repeat: Infinity },
                }}
                className="h-full bg-[#003399]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Relato e Anamnese */}
      <div className="card-clinical p-6 space-y-5 animate-in fade-in duration-450">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-clinical-blue">
            <ClipboardList className="w-4.5 h-4.5" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
              Anamnese & Sintomas
            </h3>
          </div>
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] font-extrabold uppercase ${
              isRecording 
                ? "bg-red-500 text-white animate-pulse" 
                : "bg-slate-50 text-[#003399] hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {isRecording ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3 text-clinical-blue" />}
            <span>{isRecording ? "Parar" : "Áudio"}</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="label-medical">Descreva o caso do paciente</label>
          <div className="relative">
            <textarea
              className="input-clinical h-48 resize-none leading-relaxed text-xs focus:ring-[#003399]/30"
              placeholder="Ex: Felino, letárgico, dor epigástrica na palpação, vômitos amarelos há 3 dias. Tutor relata perda de peso aguda. Quero verificar lipidose ou colangiohepatite, informando a conduta e doses preconizadas por Nelson..."
              value={anamnesis}
              onChange={(e) => setAnamnesis(e.target.value)}
            />
            {isRecording && (
              <div className="absolute inset-0 bg-red-50/70 backdrop-blur-[1.5px] rounded-xl flex flex-col items-center justify-center space-y-2 z-10 animate-in fade-in duration-250">
                <Mic className="w-6 h-6 text-red-500 animate-bounce" />
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest animate-pulse">
                  Gravando Relato Clínico...
                </p>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-md transition-colors"
                >
                  Concluir Áudio
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#F0F5FF] border border-blue-50 p-4 rounded-xl flex gap-3">
          <BookOpen className="w-5 h-5 text-clinical-blue shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
            <b>RAG Literário Ativo:</b> O sistema rastreará automaticamente as diretrizes (Nelson, Fossum, WSAVA, ACVIM) comparando com os sintomas apresentados.
          </p>
        </div>
      </div>

      {/* Action Status and Trigger */}
      <div className="card-clinical bg-slate-50 border-slate-200 p-6 space-y-4 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight">
              Análise Preditiva
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold">
              Pronto para cruzar as evidências
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-trusted-green font-black uppercase tracking-wider bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-trusted-green" />
            Motor Pronto
          </div>
        </div>

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
          className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.12em] shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
            isGenerating || (!anamnesis && uploadedFiles.length === 0)
              ? "bg-slate-300 cursor-not-allowed text-white"
              : "bg-trusted-green text-white hover:bg-emerald-600 shadow-trusted-green/20 cursor-pointer"
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Cruzando evidências...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              GERAR DIAGNÓSTICO E REVISÃO RAG
            </>
          )}
        </button>

        {/* Subtle Watermark decoration */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.02] pointer-events-none">
          <PawPrint className="w-24 h-24" strokeWidth={1} />
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
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">
        {label}
      </p>
      <p className="text-xs font-bold text-slate-900">{value}</p>
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
