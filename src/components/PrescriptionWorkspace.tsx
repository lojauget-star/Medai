import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  PlusCircle, 
  Printer, 
  Copy, 
  Save, 
  Edit2, 
  Sparkles, 
  Share2, 
  Trash2, 
  User, 
  ArrowLeft, 
  History, 
  Send, 
  Check, 
  Loader2, 
  Dog, 
  FileText, 
  ChevronRight, 
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, getCurrentUser, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, serverTimestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface PastPrescription {
  id: string;
  patientName: string;
  patientSpecies: string;
  patientBreed: string;
  patientAge: string;
  patientSex: string;
  patientWeight: string;
  tutorName: string;
  tutorPhone: string;
  clinicalNotes: string;
  routeOfAdmin: string;
  content: string;
  tutorMessage?: string;
  createdAt: any;
}

const QUICK_TEMPLATES = [
  { 
    title: "Gastroenterite Aguda", 
    notes: "Vômitos frequentes e diarreia pastosa há 24h. Desidratação leve (5%). Sem febre.",
    species: "Cão",
    breed: "Lhasa Apso",
    weight: "7"
  },
  { 
    title: "Otite Externa Bilateral", 
    notes: "Prurido intenso nas orelhas, eritema, secreção ceruminosa marrom escuro com odor adocicado.",
    species: "Cão",
    breed: "Cocker Spaniel",
    weight: "12"
  },
  { 
    title: "Complexo Respiratório Felino", 
    notes: "Espirros constantes, secreção nasal serosa, conjuntivite bilateral leve, febre discreta.",
    species: "Gato",
    breed: "SDR",
    weight: "4"
  },
  { 
    title: "Dermatite Alérgica (DAPE)", 
    notes: "Prurido intenso na região lombo-sacra e abdômen, hipotricose, eritema e pápulas.",
    species: "Cão",
    breed: "Golden Retriever",
    weight: "32"
  }
];

export default function PrescriptionWorkspace({
  onNavigateToSignature,
  onToggleMenu
}: {
  onNavigateToSignature: () => void;
  onToggleMenu?: () => void;
}) {
  const [step, setStep] = useState<"input" | "result">("input");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Patient State
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Não informada");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("Não informado");
  const [weight, setWeight] = useState("");
  const [tutorName, setTutorName] = useState("");
  const [tutorPhone, setTutorPhone] = useState("");

  // Clinical Details
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [routeOfAdmin, setRouteOfAdmin] = useState("auto");

  // Output States
  const [generatedPrescription, setGeneratedPrescription] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [tutorMessage, setTutorMessage] = useState<string | null>(null);
  const [isGeneratingTutorMessage, setIsGeneratingTutorMessage] = useState(false);
  const [savedPrescriptionId, setSavedPrescriptionId] = useState<string | null>(null);

  // History State
  const [pastPrescriptions, setPastPrescriptions] = useState<PastPrescription[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Clipboard Feedbacks
  const [copiedPrescription, setCopiedPrescription] = useState(false);
  const [copiedTutor, setCopiedTutor] = useState(false);

  // Signature Config Loaded from localStorage
  const [vetName, setVetName] = useState(() => localStorage.getItem("vetmind_signature_name") || "Dr. André Eguchi");
  const [vetCrmv, setVetCrmv] = useState(() => localStorage.getItem("vetmind_signature_crmv") || "CRMV-SP 14892");
  const [vetSpecialty, setVetSpecialty] = useState(() => localStorage.getItem("vetmind_signature_specialty") || "Clínica Geral de Pequenos Animais");

  const stages = [
    "Analisando dados do paciente e queixas clínicas...",
    "Consultando diretrizes clássicas veterinárias...",
    "Calculando dosagens exatas com base no peso...",
    "Formatando plano terapêutico e alertas de segurança..."
  ];

  // Refresh signature metadata
  useEffect(() => {
    const handleStorageChange = () => {
      setVetName(localStorage.getItem("vetmind_signature_name") || "Dr. André Eguchi");
      setVetCrmv(localStorage.getItem("vetmind_signature_crmv") || "CRMV-SP 14892");
      setVetSpecialty(localStorage.getItem("vetmind_signature_specialty") || "Clínica Geral de Pequenos Animais");
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("vetmind_profile_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("vetmind_profile_updated", handleStorageChange);
    };
  }, []);

  // Fetch past prescriptions
  const fetchHistory = async () => {
    const user = getCurrentUser();
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "prescriptions"),
        where("ownerId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PastPrescription));
      list.sort((a, b) => {
        const tA = (a.createdAt as any)?.seconds || 0;
        const tB = (b.createdAt as any)?.seconds || 0;
        return tB - tA;
      });
      setPastPrescriptions(list);
    } catch (err) {
      console.error("Error fetching prescriptions history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [step]);

  // Handle stage timer during AI load
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStage((prev) => (prev + 1) % stages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setClinicalNotes(tpl.notes);
    setSpecies(tpl.species);
    setBreed(tpl.breed);
    setWeight(tpl.weight);
  };

  const handleGenerate = async () => {
    if (!weight) {
      setError("Por favor, preencha o peso do paciente para o cálculo correto das dosagens.");
      return;
    }
    if (!clinicalNotes.trim()) {
      setError("Insira sintomas, queixas ou diagnósticos para guiar as escolhas de medicamentos.");
      return;
    }

    setLoading(true);
    setLoadingStage(0);
    setError(null);
    setTutorMessage(null);
    setSavedPrescriptionId(null);

    try {
      const patientData = {
        name: name || "Paciente sem Nome",
        species,
        breed: breed || "SRD",
        age: age || "Não informada",
        sex,
        weight
      };

      const response = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soapContent: `Queixa e sintomas relatados pelo clínico:\n${clinicalNotes}`,
          patient: patientData,
          routeOfAdmin
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao conectar com o serviço de farmacologia.");
      }

      const data = await response.json();
      setGeneratedPrescription(data.prescription);
      setEditText(data.prescription);
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro na conexão. Verifique o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTutorMessage = async () => {
    if (!generatedPrescription) return;
    setIsGeneratingTutorMessage(true);
    try {
      const response = await fetch("/api/generate-tutor-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soapContent: clinicalNotes || "Consulta Geral",
          patient: { name: name || "Paciente", species, breed, age, sex, weight },
          prescription: generatedPrescription
        })
      });
      if (response.ok) {
        const data = await response.json();
        setTutorMessage(data.tutorMessage);
      } else {
        throw new Error("Erro de comunicação ao gerar orientações do tutor.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Falha ao gerar orientações.");
    } finally {
      setIsGeneratingTutorMessage(false);
    }
  };

  const handleSaveToHistory = async () => {
    const user = getCurrentUser();
    if (!generatedPrescription || !user) return;
    try {
      const pData = {
        patientName: name || "Paciente sem Nome",
        patientSpecies: species,
        patientBreed: breed || "SRD",
        patientAge: age || "Não informada",
        patientSex: sex,
        patientWeight: weight,
        tutorName: tutorName || "",
        tutorPhone: tutorPhone || "",
        clinicalNotes,
        routeOfAdmin,
        content: generatedPrescription,
        tutorMessage: tutorMessage || "",
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "prescriptions"), pData);
      setSavedPrescriptionId(docRef.id);

      // Elegant success modal overlay
      const successModal = document.createElement("div");
      successModal.className = "fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-300";
      successModal.innerHTML = `
        <div class="bg-[#1c1c1e] rounded-[2rem] p-8 max-w-sm w-full mx-4 text-center space-y-6 border border-white/5 shadow-xl">
           <div class="w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
           </div>
           <div class="space-y-1">
            <h3 class="text-xl font-extrabold text-white font-display">Receita Salva!</h3>
            <p class="text-xs text-gray-400 font-medium leading-relaxed">A prescrição de <b>${name || "Paciente"}</b> foi arquivada no histórico com sucesso.</p>
           </div>
           <button id="closeModalPresc" class="w-full bg-gradient-to-r from-indigo-600 to-emerald-500 hover:brightness-105 active:scale-[0.98] text-white font-extrabold py-3.5 rounded-xl shadow-lg cursor-pointer transition-all text-xs uppercase tracking-wider">Ok, continuar</button>
        </div>
      `;
      document.body.appendChild(successModal);
      document.getElementById("closeModalPresc")?.addEventListener("click", () => {
        document.body.removeChild(successModal);
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "prescriptions");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-prescription");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receituário Veterinário - ${name || "Paciente"}</title>
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

  const handleCopyText = (text: string, type: "prescription" | "tutor") => {
    navigator.clipboard.writeText(text);
    if (type === "prescription") {
      setCopiedPrescription(true);
      setTimeout(() => setCopiedPrescription(false), 2000);
    } else {
      setCopiedTutor(true);
      setTimeout(() => setCopiedTutor(false), 2000);
    }
  };

  const handleDeletePast = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta receita do histórico?")) return;
    try {
      await deleteDoc(doc(db, "prescriptions", id));
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadPast = (past: PastPrescription) => {
    setName(past.patientName);
    setSpecies(past.patientSpecies);
    setBreed(past.patientBreed);
    setAge(past.patientAge);
    setSex(past.patientSex);
    setWeight(past.patientWeight);
    setTutorName(past.tutorName || "");
    setTutorPhone(past.tutorPhone || "");
    setClinicalNotes(past.clinicalNotes || "");
    setRouteOfAdmin(past.routeOfAdmin || "auto");
    setGeneratedPrescription(past.content);
    setEditText(past.content);
    setTutorMessage(past.tutorMessage || null);
    setSavedPrescriptionId(past.id);
    setStep("result");
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-[#f4f6fa] relative">
      {/* Dynamic Glass Topbar Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          {onToggleMenu && (
            <button
              onClick={onToggleMenu}
              className="xl:hidden p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-3xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">Receituário Rápido</h1>
            <p className="text-[10px] text-slate-400 font-bold block uppercase mt-1 tracking-widest">Geração Independente de Receitas</p>
          </div>
        </div>

        {step === "result" && (
          <button
            onClick={() => setStep("input")}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all border border-slate-200 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Nova Receita
          </button>
        )}
      </header>

      {/* Primary body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {loading ? (
          /* Loading overlay with LEGO stages */
          <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 relative z-20 overflow-y-auto">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-350">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin" />
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-slate-800 font-sans">Criando Receita Clínica Inteligente</h3>
                <p className="text-xs text-indigo-600 font-extrabold uppercase tracking-widest">{stages[loadingStage]}</p>
              </div>
              
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-2 text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ficha do Atendimento</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold text-slate-600">
                  <span>🐈 <b>Pet:</b> {name || "Sem Nome"} ({species})</span>
                  <span>⚖️ <b>Peso:</b> {weight}kg</span>
                  <span>📍 <b>Via:</b> {routeOfAdmin === 'auto' ? 'Automática' : routeOfAdmin.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {step === "input" ? (
              /* INPUT STEP */
              <motion.div 
                key="input-stage"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 md:grid md:grid-cols-5 md:gap-6 md:space-y-0 h-full text-left"
              >
                {/* Left side: Form Inputs */}
                <div className="md:col-span-3 space-y-6">
                  
                  {/* Template selector pills */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-extrabold text-slate-800 text-sm">Modelos Clínicos Rápidos</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.title}
                          type="button"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="p-3 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-150 border border-slate-150 rounded-xl transition-all group cursor-pointer text-xs"
                        >
                          <span className="font-extrabold text-slate-800 block group-hover:text-indigo-650 truncate">{tpl.title}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 truncate">{tpl.notes}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Patient Info Card */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                      <User className="w-5 h-5 text-indigo-650" />
                      <h3 className="font-extrabold text-slate-800 text-sm">Identificação do Paciente</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nome do Pet</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Mel"
                          className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Espécie</label>
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          {["Canino", "Felino"].map((sp) => (
                            <button
                              key={sp}
                              type="button"
                              onClick={() => setSpecies(sp)}
                              className={`flex-1 py-1.5 text-center text-[11px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                species === sp 
                                  ? "bg-white text-indigo-650 shadow-3xs" 
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {sp === "Canino" ? "🐶 Cão" : "🐱 Gato"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Raça</label>
                        <input
                          type="text"
                          value={breed}
                          onChange={(e) => setBreed(e.target.value)}
                          placeholder="Ex: Shih Tzu / SDR"
                          className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Idade</label>
                        <input
                          type="text"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="Ex: 2 anos"
                          className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sexo</label>
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          {["Macho", "Fêmea"].map((sx) => (
                            <button
                              key={sx}
                              type="button"
                              onClick={() => setSex(sx)}
                              className={`flex-1 py-1.5 text-center text-[11px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                sex === sx 
                                  ? "bg-white text-indigo-650 shadow-3xs" 
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {sx}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Peso (Kg) <span className="text-red-500 font-black">*</span></label>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="Ex: 8.5"
                          className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nome do Tutor (Opcional)</label>
                        <input
                          type="text"
                          value={tutorName}
                          onChange={(e) => setTutorName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Telefone Tutor (Opcional)</label>
                        <input
                          type="text"
                          value={tutorPhone}
                          onChange={(e) => setTutorPhone(e.target.value)}
                          placeholder="Ex: (11) 99999-9999"
                          className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Symptoms & Sospetto Clinical Card */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                      <FileText className="w-5 h-5 text-indigo-650" />
                      <h3 className="font-extrabold text-slate-800 text-sm">Sintomas, Suspeitas ou Indicações de Tratamento <span className="text-red-500 font-black">*</span></h3>
                    </div>

                    <textarea
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Descreva detalhadamente o quadro do animal ou a indicação médica. Ex: Diarreia há 2 dias, letargia leve, suspeita de parvovirose. Sugira medicamentos adequados com proteção gástrica..."
                      className="w-full h-32 text-xs p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:border-indigo-600 resize-none"
                    />

                    {/* Route preference */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Via de Administração Preferencial</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { id: "auto", label: "Automático", icon: "✨" },
                          { id: "oral", label: "Oral", icon: "💊" },
                          { id: "topical", label: "Tópico", icon: "🧴" },
                          { id: "ophthalmic", label: "Oftálmico", icon: "👁️" },
                          { id: "otic", label: "Otológico", icon: "👂" },
                          { id: "injectable", label: "Injetável", icon: "💉" }
                        ].map((route) => (
                          <button
                            key={route.id}
                            type="button"
                            onClick={() => setRouteOfAdmin(route.id)}
                            className={`p-2.5 rounded-xl border text-[9.5px] font-black uppercase tracking-wider text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                              routeOfAdmin === route.id 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-3xs scale-102" 
                                : "bg-slate-50 border-slate-150 text-slate-450 hover:bg-slate-100/50"
                            }`}
                          >
                            <span className="text-sm">{route.icon}</span>
                            <span>{route.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold leading-relaxed">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Primary Generation Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleGenerate}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-full shadow-md shadow-indigo-600/10 cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    Gerar Receituário Inteligente
                  </motion.button>
                </div>

                {/* Right side: Past Saved Prescriptions */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-210px)] min-h-[400px]">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                      <History className="w-4 h-4 text-slate-450" />
                      <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Histórico Recente</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                      {loadingHistory ? (
                        <div className="flex justify-center items-center h-48">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-350" />
                        </div>
                      ) : pastPrescriptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                          <Dog className="w-10 h-10 text-slate-200 mb-2" />
                          <p className="text-[11px] font-semibold leading-relaxed">Nenhuma receita avulsa encontrada no banco de dados.</p>
                        </div>
                      ) : (
                        pastPrescriptions.map((past) => (
                          <div
                            key={past.id}
                            onClick={() => handleLoadPast(past)}
                            className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-left hover:bg-slate-100/50 hover:border-slate-200 transition-all cursor-pointer group relative flex flex-col gap-1.5"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleDeletePast(past.id, e)}
                              className="absolute top-3 right-3 p-1.5 bg-white border border-slate-150 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shadow-3xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex items-center gap-2 max-w-[80%]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <h4 className="font-extrabold text-slate-800 text-sm truncate capitalize">{past.patientName}</h4>
                            </div>

                            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                              {past.patientSpecies} • {past.patientBreed} • {past.patientWeight}kg
                            </p>

                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 pr-4">
                              {past.clinicalNotes}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : (
              /* RESULTS STEP */
              <motion.div
                key="result-stage"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 overflow-y-auto p-6 space-y-6 md:grid md:grid-cols-5 md:gap-6 md:space-y-0 h-full text-left"
              >
                {/* Left col: Action Panel & Whatsapp integration */}
                <div className="md:col-span-2 space-y-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Main actions card */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <FileCheck className="w-5 h-5 text-indigo-650" />
                        <h3 className="font-extrabold text-slate-800 text-sm">Opções de Atendimento</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handlePrint}
                          className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-97 text-center"
                        >
                          <Printer className="w-5 h-5 text-indigo-600" />
                          <span className="text-[10px] uppercase tracking-wider block">Imprimir / PDF</span>
                        </button>

                        <button
                          onClick={handleSaveToHistory}
                          disabled={!!savedPrescriptionId}
                          className={`p-4 border font-extrabold rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-97 text-center ${
                            savedPrescriptionId 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700 cursor-default" 
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          {savedPrescriptionId ? (
                            <>
                              <Check className="w-5 h-5 text-emerald-500 animate-bounce" />
                              <span className="text-[10px] uppercase tracking-wider block">Salvo no Histórico</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5 text-emerald-500" />
                              <span className="text-[10px] uppercase tracking-wider block">Salvar Receita</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => handleCopyText(editText, "prescription")}
                        className="w-full py-3 bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100/50 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                      >
                        {copiedPrescription ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            Copiado com Sucesso!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar Texto da Receita
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 cursor-pointer transition-all active:scale-98"
                      >
                        <Edit2 className="w-4 h-4" />
                        {isEditing ? "Concluir Edição" : "Editar Receita Manualmente"}
                      </button>
                    </div>

                    {/* Tutor communication card (Empathetic AI message for WhatsApp) */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-emerald-500 animate-pulse" />
                          <h3 className="font-extrabold text-slate-800 text-sm">Instruções para o Tutor (WhatsApp)</h3>
                        </div>
                      </div>

                      {!tutorMessage ? (
                        <div className="space-y-4">
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            Crie uma mensagem acolhedora, explicativa e empática sobre as dosagens e cuidados práticos para enviar por WhatsApp ao tutor de <b>{name || "Paciente"}</b>.
                          </p>
                          <button
                            onClick={handleGenerateTutorMessage}
                            disabled={isGeneratingTutorMessage}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-full shadow-md shadow-emerald-500/10 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingTutorMessage ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                Traduzindo prescrição com carinho...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 text-emerald-100" />
                                Gerar Mensagem Humanizada
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 max-h-[160px] overflow-y-auto text-xs font-semibold text-slate-600 space-y-2 whitespace-pre-line leading-relaxed scrollbar-none">
                            {tutorMessage}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopyText(tutorMessage, "tutor")}
                              className="flex-1 py-3 bg-emerald-50 border border-emerald-150 text-emerald-700 hover:bg-emerald-100/50 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                            >
                              {copiedTutor ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-500" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copiar Texto
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                const cleanPhone = tutorPhone ? tutorPhone.replace(/\D/g, "") : "";
                                const waUrl = cleanPhone 
                                  ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(tutorMessage)}`
                                  : `https://api.whatsapp.com/send?text=${encodeURIComponent(tutorMessage)}`;
                                window.open(waUrl, "_blank");
                              }}
                              className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-full shadow-md font-bold text-xs uppercase tracking-wider cursor-pointer transition-all active:scale-95 shrink-0"
                              title="Enviar via WhatsApp"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.167 1.45 4.809 1.453 5.46 0 9.897-4.432 9.9-9.894.002-2.647-1.01-5.133-2.852-6.978C16.602 1.89 14.12 1.878 11.48 1.878c-5.462 0-9.902 4.435-9.907 9.897-.002 1.785.485 3.53 1.411 5.07L1.916 21.85l5.05-1.326z"/></svg>
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setStep("input")}
                    className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs mt-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Formulário
                  </button>
                </div>

                {/* Right col: High-fidelity Prescription Card Document */}
                <div className="md:col-span-3 space-y-4">
                  {isEditing ? (
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex flex-col h-[650px]">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                        <Edit2 className="w-4 h-4 text-indigo-650" />
                        <h4 className="font-extrabold text-slate-800 text-sm">Editor de Prescrição Veterinária</h4>
                      </div>
                      <textarea
                        value={editText}
                        onChange={(e) => {
                          setEditText(e.target.value);
                          setGeneratedPrescription(e.target.value);
                        }}
                        className="flex-grow w-full font-mono text-xs p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  ) : (
                    /* Elegant PDF/Document preview mock */
                    <div className="bg-white rounded-[2.5rem] border border-slate-150 shadow-md overflow-hidden flex flex-col justify-between max-w-2xl mx-auto h-[650px] relative">
                      
                      {/* Document Scroll Container */}
                      <div className="flex-1 overflow-y-auto p-8 space-y-6 text-left custom-scrollbar" id="printable-prescription">
                        {/* Printable Header */}
                        <div className="flex items-center justify-between border-b-[2px] border-slate-900 pb-4">
                          <div className="space-y-1">
                            <h2 className="text-xl font-extrabold text-slate-900 font-display uppercase tracking-wide">{vetName}</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{vetSpecialty}</p>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest leading-none">CRMV {vetCrmv}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="px-3.5 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                              Receita Veterinária
                            </div>
                          </div>
                        </div>

                        {/* Patient Specs Box */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider mb-0.5">Paciente (Pet)</span>
                            <span className="text-sm font-black text-slate-800 capitalize">🐾 {name || "Paciente sem Nome"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider mb-0.5">Espécie & Raça</span>
                            <span className="text-sm font-black text-slate-800 capitalize">{species === "Canino" ? "Cão" : (species === "Felino" ? "Gato" : (species || "Não informada"))} • {breed || "SRD"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider mb-0.5">Peso & Sexo</span>
                            <span className="text-sm font-black text-slate-800 capitalize">⚖️ {weight}kg • {sex}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider mb-0.5">Tutor</span>
                            <span className="text-sm font-black text-slate-800 capitalize">👤 {tutorName || "Não Informado"}</span>
                          </div>
                        </div>

                        {/* Document Content Renders dynamically */}
                        <div className="space-y-5 text-xs text-slate-800 leading-relaxed font-sans prose max-w-none">
                          {generatedPrescription ? (
                            generatedPrescription.split('\n').map((line, idx) => {
                              if (line.startsWith('##')) {
                                return (
                                  <h3 key={idx} className="text-sm font-black text-indigo-700 font-sans border-b border-indigo-100 pb-1 mt-6 first:mt-0 uppercase tracking-wider">
                                    {line.replace('##', '').trim()}
                                  </h3>
                                );
                              }
                              if (line.startsWith('*') || line.startsWith('-')) {
                                return (
                                  <li key={idx} className="list-none pl-3 border-l-[3px] border-emerald-400 font-medium my-1.5">
                                    {line.replace(/^[\s*-]+/, '').trim()}
                                  </li>
                                );
                              }
                              if (line.trim() === '') return <div key={idx} className="h-2" />;
                              return <p key={idx} className="font-medium text-slate-600">{line}</p>;
                            })
                          ) : (
                            <p className="text-slate-400 italic">Preencha os sintomas e gere a receita.</p>
                          )}
                        </div>

                        {/* Print Footer/Signature */}
                        <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col items-center justify-center text-center space-y-3 shrink-0">
                          <div className="relative flex flex-col items-center justify-center">
                            {/* Medical stamp design */}
                            <div className="absolute -top-12 border-2 border-dashed border-indigo-600/20 bg-indigo-50/20 text-indigo-600/30 font-black text-[10px] tracking-widest px-6 py-2.5 rounded-xl uppercase select-none pointer-events-none rotate-3">
                              Assinado Digitalmente
                            </div>
                            <div className="w-48 border-b border-slate-400 my-2" />
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase leading-none">{vetName}</h4>
                            <p className="text-[9px] text-slate-450 font-bold uppercase mt-1">Médico Veterinário • CRMV {vetCrmv}</p>
                          </div>
                        </div>
                      </div>

                      {/* Info overlay inside app */}
                      <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>📄 Pré-visualização do Documento</span>
                        <span>Fundo Branco para Economia de Impressão</span>
                      </div>
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
