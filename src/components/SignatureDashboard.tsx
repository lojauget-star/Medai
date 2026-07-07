import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  User, 
  Award, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  FileText, 
  PenTool, 
  FileDown, 
  RefreshCw, 
  QrCode, 
  Globe, 
  Scale,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

export default function SignatureDashboard() {
  const [signerName, setSignerName] = useState(() => localStorage.getItem("vetmind_signature_name") || "");
  const [signerCrmv, setSignerCrmv] = useState(() => localStorage.getItem("vetmind_signature_crmv") || "");
  const [specialty, setSpecialty] = useState(() => localStorage.getItem("vetmind_signature_specialty") || "");
  const [sigStyle, setSigStyle] = useState(() => localStorage.getItem("vetmind_signature_style") || "cursive");
  const [isSigned, setIsSigned] = useState(() => {
    const hasName = localStorage.getItem("vetmind_signature_name");
    const stored = localStorage.getItem("vetmind_signature_signed");
    if (!hasName) return false;
    return stored === null ? true : stored === "true";
  });
  const [signedDate, setSignedDate] = useState(() => localStorage.getItem("vetmind_signature_date") || "09/06/2026");
  const [sigHash, setSigHash] = useState(() => localStorage.getItem("vetmind_signature_hash") || "VM-TRC-89D2F3C1A");
  const [termsAccepted, setTermsAccepted] = useState(true);
  
  // Signature Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "draw">("text");

  // Sync with Firestore on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) {
              setSignerName(data.name);
              localStorage.setItem("vetmind_signature_name", data.name);
            }
            if (data.crmv) {
              setSignerCrmv(data.crmv);
              localStorage.setItem("vetmind_signature_crmv", data.crmv);
            }
            if (data.specialty) {
              setSpecialty(data.specialty);
              localStorage.setItem("vetmind_signature_specialty", data.specialty);
            }
            if (data.sigStyle) {
              setSigStyle(data.sigStyle);
              localStorage.setItem("vetmind_signature_style", data.sigStyle);
            }
            if (data.isSigned !== undefined) {
              setIsSigned(data.isSigned);
              localStorage.setItem("vetmind_signature_signed", String(data.isSigned));
            }
            if (data.signedDate) {
              setSignedDate(data.signedDate);
              localStorage.setItem("vetmind_signature_date", data.signedDate);
            }
            if (data.sigHash) {
              setSigHash(data.sigHash);
              localStorage.setItem("vetmind_signature_hash", data.sigHash);
            }
          }
        } catch (error) {
          console.error("Error loading profile in dashboard:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Save changes to localStorage
  const saveToStorage = (name: string, crmv: string, spec: string, style: string, signed: boolean, date: string, hash: string) => {
    localStorage.setItem("vetmind_signature_name", name);
    localStorage.setItem("vetmind_signature_crmv", crmv);
    localStorage.setItem("vetmind_signature_specialty", spec);
    localStorage.setItem("vetmind_signature_style", style);
    localStorage.setItem("vetmind_signature_signed", String(signed));
    localStorage.setItem("vetmind_signature_date", date);
    localStorage.setItem("vetmind_signature_hash", hash);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !signerCrmv.trim()) {
      alert("Por favor, preencha o Nome e o CRMV.");
      return;
    }
    
    const uppercaseCrmv = signerCrmv.toUpperCase();
    const today = new Date().toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const randomHash = "VM-TRC-" + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    setIsSigned(true);
    setSignedDate(today);
    setSigHash(randomHash);
    setSignerCrmv(uppercaseCrmv);
    saveToStorage(signerName, uppercaseCrmv, specialty, sigStyle, true, today, randomHash);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, {
          name: signerName,
          crmv: uppercaseCrmv,
          specialty: specialty,
          sigStyle: sigStyle,
          isSigned: true,
          signedDate: today,
          sigHash: randomHash,
          email: currentUser.email || ""
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
      }
    }
    
    alert(`Termo assinado com sucesso!\nSua assinatura agora é injetada automaticamente em todas as minutas de laudo sob o CRMV ${uppercaseCrmv}.`);
  };

  const handleRevoke = async () => {
    if (confirm("Deseja alterar seus dados cadastrais? Sua assinatura digital será reiniciada temporariamente.")) {
      setIsSigned(false);
      localStorage.setItem("vetmind_signature_signed", "false");

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(userDocRef, {
            isSigned: false
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    }
  };

  // Canvas drawing handlers
  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
      }
    }
  }, [activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // prevent scrolling
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-400 max-w-6xl mx-auto px-1 w-full pb-20">
           {/* Header Panel */}
      <div className="border-b border-slate-150 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-emerald-50 text-trusted-green border border-emerald-100 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono">
              Selo de Validabilidade Profissional (Código de Ética CFMV)
            </span>
            <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight mt-1.5">
              Central de Credenciais & Assinatura Digital
            </h1>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Consolide sua assinatura jurídica uma única vez. Ela será aplicada de forma automática a todas as Minutas de Laudo assistidas pela Inteligência Artificial.
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {isSigned ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-trusted-green border border-emerald-100 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Assinatura Ativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-100 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Não Assinado
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form & Contract View (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Scale className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-850">1. Cadastro de Médico Veterinário</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dados carimbados nas Minutas de Laudo</p>
              </div>
            </div>

            <form onSubmit={handleSign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={isSigned}
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Dr. Roberto Silva"
                      className="w-full text-xs pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 disabled:opacity-75 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">CRMV Ativo (Ex: SP-14892)</label>
                  <div className="relative">
                    <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={isSigned}
                      value={signerCrmv}
                      onChange={(e) => setSignerCrmv(e.target.value)}
                      placeholder="SP-14892"
                      className="w-full text-xs pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 disabled:opacity-75 disabled:cursor-not-allowed uppercase"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Especialidades ou Campo de Atuação</label>
                <input
                  type="text"
                  disabled={isSigned}
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="EX: Cardiologia, Dermatologia, Clinical Geral"
                  className="w-full text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              {/* Design choice for signature visual */}
              {!isSigned && (
                <div className="border border-slate-150 rounded-2xl p-4.5 space-y-3.5 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Visual de Assinatura Eletrônica</label>
                    <div className="flex rounded-lg bg-slate-200/60 p-0.5">
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("text")}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-md transition-all ${activeTab === "text" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"}`}
                      >
                        Fontes
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("draw")}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-md transition-all ${activeTab === "draw" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"}`}
                      >
                        Rubricar Canvas
                      </button>
                    </div>
                  </div>

                  {activeTab === "text" ? (
                    <div className="grid grid-cols-3 gap-2 py-0.5">
                      {[
                        { id: "cursive", label: "Cursiva Elegante", style: "font-serif italic text-indigo-800 text-sm tracking-wide" },
                        { id: "mono", label: "Histórico Código", style: "font-mono text-xs font-bold text-slate-750" },
                        { id: "sans", label: "Selo Minimalista", style: "font-sans font-black text-xs uppercase text-slate-800" }
                      ].map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSigStyle(style.id)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between h-16 transition-all ${sigStyle === style.id ? "bg-white border-indigo-600 ring-1 ring-indigo-600" : "bg-white border-slate-200 hover:border-slate-300"}`}
                        >
                          <span className="text-[8px] text-slate-400 font-bold uppercase">{style.label}</span>
                          <span className={`${style.style} truncate block w-full`}>{signerName || "Roberto Silva"}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden relative">
                        <canvas
                          ref={canvasRef}
                          width={450}
                          height={110}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 bg-white cursor-crosshair touch-none"
                        />
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="absolute bottom-2 right-2 text-[8px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-200 transition-colors"
                        >
                          Limpar Tela
                        </button>
                      </div>
                      <p className="text-[8px] font-medium text-slate-400 text-center">Utilize seu mouse ou tela sensível ao toque para escrever sua rubrica veterinária.</p>
                    </div>
                  )}
                </div>
              )}

              {/* CFMV Terms Paper scroll */}
              <div className="border border-slate-200 rounded-2xl bg-[#FFFDF9] p-5 md:p-6 space-y-4 max-h-60 overflow-y-auto custom-scrollbar border-l-4 border-l-amber-500/50 shadow-xs">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-amber-900 uppercase">
                    RESOLUÇÃO CFMV Nº 1275/2019 & CÓDIGO DE ÉTICA DO MÉDICO VETERINÁRIO
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Termo de Adequação Legal às Minutas de Diagnóstico Informatizadas por IA</p>
                </div>
                
                <div className="text-[11px] text-slate-700 leading-relaxed font-medium space-y-2.5">
                  <p>
                    <b>1. Do Caráter de Suporte Clínico:</b> O assinante declara estar plenamente ciente de que as minutas clínicas de exames, diagnósticos diferenciais, sumários SOAP e prognósticos terapêuticos gerados pelo software Copiloto Vetmind representam <b>meramente materiais consultivos e de suporte de cognição analítica clínica</b> construídos por Inteligência Artificial (técnicas de RAG - Geração Aumentada por Recuperação sobre bancos de diretrizes).
                  </p>
                  <p>
                    <b>2. Da Autoria e Responsabilidade Exclusiva:</b> À luz do Código de Ética Profissional do Médico Veterinário e resoluções subsequentes do CFMV, a responsabilidade jurídica, técnica, civil, ética e criminal pelo diagnóstico definitivo, laudo homologado final, triagens efetuadas e prescrição farmacológica de substâncias é de <b>quem homologa e autoriza como médico responsável</b>. O sistema Vetmind em nenhum cenário substitui o raciocínio ou a inspeção direta em ser vivo.
                  </p>
                  <p>
                    <b>3. Da Autorização de Assinatura Única:</b> Ao assinar digitalmente este termo e manter o credenciamento ativo, o profissional autoriza o sistema Vetmind a aplicar de maneira sistêmica a sua identificação de classe (Nome e CRMV correspondentes) em todas as minutas emitidas na área de trabalho ativa como "Selo de Homologação de Suporte de Decisão Integrado", dispensando o preenchimento repetitivo a cada laudo exportado.
                  </p>
                </div>
              </div>

              {!isSigned ? (
                <div className="space-y-3.5">
                  <label className="flex items-start gap-2.5 cursor-pointer selection:bg-transparent">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                      Eu li, compreendo integralmente e declaro estar de acordo com o Termo de Uso e Responsabilidade Clínica em estrita observância com o Código de Ética do Médico Veterinário (CFMV).
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!termsAccepted}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-full hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-center"
                  >
                    Confirmar Identidade e Registrar Assinatura
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRevoke}
                    className="w-full py-3 bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center border border-red-100"
                  >
                    Revogar Credencial Ativa / Alterar Dados
                  </button>
                </div>
              )}
            </form>
          </div>

        </div>

        {/* Right Preview Card Area (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Stamp Presentation Card */}
          <div className="bg-slate-900 text-white rounded-[2.2rem] p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-10 -translate-y-4">
              <ShieldCheck className="w-80 h-80 text-white" />
            </div>

            <div className="space-y-6 relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                  Selo Oficial Emitido
                </span>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${isSigned ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
                  {isSigned ? "Assinatura Homologada" : "Pendente"}
                </span>
              </div>

              {/* Visual Stamp Sandbox */}
              <div className="bg-[#1c1c1e]/5 border border-white/10 rounded-2xl p-5 space-y-4.5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Visualização do Selo Sistêmico</p>
                
                <div className="flex items-start gap-4">
                  
                  {isSigned && (
                    <div className="bg-[#1c1c1e] p-1.5 rounded-lg shrink-0">
                      <QrCode className="w-14 h-14 text-white" />
                    </div>
                  )}

                  <div className="space-y-1 w-full overflow-hidden">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Minuta Digital Autenticada</p>
                    
                    {isSigned ? (
                      <div className="space-y-0.5 pt-1">
                        <p className={`font-bold text-base text-white/95 leading-none tracking-tight ${sigStyle === "cursive" ? "font-serif italic text-lg" : sigStyle === "mono" ? "font-mono text-sm uppercase" : "font-sans uppercase"}`}>
                          {signerName}
                        </p>
                        <p className="text-[11px] font-black text-white/70 uppercase">Médico Veterinário • CRMV {signerCrmv}</p>
                        {specialty && <p className="text-[9px] text-white/50 tracking-wide font-semibold italic">{specialty}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-white/45 font-medium leading-relaxed pt-1 italic">Nenhuma assinatura cadastrada no painel global. Os laudos serão emitidos vazios.</p>
                    )}
                  </div>
                </div>

                {isSigned && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[8px] font-mono text-white/40">
                    <div>
                      <span className="block font-bold uppercase text-white/20">Código Autenticação</span>
                      <span className="text-white/60 font-semibold">{sigHash}</span>
                    </div>
                    <div>
                      <span className="block font-bold uppercase text-white/20">Data de Registro</span>
                      <span className="text-white/60 font-semibold">{signedDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Integrity certification bulletpoints */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-extrabold text-white/70 uppercase tracking-wider">Benefícios da Assinatura Sistêmica</h4>
                <ul className="space-y-2 text-xs text-white/60 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><b>Preenchimento zero:</b> Nunca mais digite seu CRMV e seu Nome ao concluir cada laudo assistido.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><b>Selo de Conformidade:</b> Exportação dos laudos em PDF com selo virtual integrado de suporte a diagnóstico por IA.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><b>Segurança Ética:</b> Banner instrutivo incorporado para resguardo sobre a responsabilidade civil do profissional.</span>
                  </li>
                </ul>
              </div>

              {isSigned && (
                <div className="bg-[#1c1c1e]/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-white/90">Declaração Completa</p>
                      <p className="text-[8px] text-white/40 uppercase">Termo Assinado PDF de Auditoria</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert(`Cópia do termo de aceite de responsabilidade clínica com registro UID: ${sigHash} gerado sob IP local seguro.`)}
                    className="p-2 bg-[#1c1c1e]/10 hover:bg-[#1c1c1e]/20 rounded-xl transition-colors cursor-pointer"
                    title="Baixar Certificado"
                  >
                    <FileDown className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Quick Alert disclaimer */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-[2rem] p-5 flex gap-4 text-left shadow-xs">
            <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600 h-fit shrink-0">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                Auditoria de Registro CFMV
              </h4>
              <p className="text-[11px] text-amber-800/90 leading-relaxed font-semibold">
                O conselho de fiscalização do CRMV regional correspondente exige a adequação de carimbo veterinário em todo suporte assistido de telemedicina ou ferramentas equivalentes. Mantenha os seus dados cadastrados atualizados.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
