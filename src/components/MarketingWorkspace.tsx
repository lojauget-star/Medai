import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ArrowLeft, Send, Check, Copy, Download, RefreshCw, 
  Instagram, Linkedin, FileText, Palette, Sliders, Type, 
  CheckSquare, Image as ImageIcon, History, Trash, Calendar, 
  Users, HelpCircle, ChevronLeft, ChevronRight, Share2, CornerDownRight,
  Mic, Square, ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import { db, auth } from '../lib/firebase';
import { 
  collection, addDoc, getDocs, query, where, orderBy, 
  deleteDoc, doc, serverTimestamp, getDoc, updateDoc 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface BrandProfile {
  brandName: string;
  specialty: string;
  style: 'Executivo' | 'Acolhedor' | 'Moderno' | 'Minimalista';
  font: 'Inter' | 'Outfit' | 'Playfair' | 'Quicksand';
  color: string;
  handle: string;
}

interface ClinicalData {
  queixa: string;
  exames: string;
  tecnica: string;
  desfecho: string;
}

interface Slide {
  title: string;
  content: string;
  imageUrl?: string | null;
  imagePrompt?: string | null;
}

interface GeneratedPost {
  id?: string;
  carousel: Slide[];
  instagramCaption: string;
  linkedinText: string;
  letterText: string;
  brandProfile?: BrandProfile;
  clinicalData?: ClinicalData;
  createdAt?: any;
}

interface MarketingWorkspaceProps {
  initialClinicalData?: {
    queixa?: string;
    exames?: string;
    tecnica?: string;
    desfecho?: string;
  } | null;
  onBack: () => void;
}

export default function MarketingWorkspace({ initialClinicalData, onBack }: MarketingWorkspaceProps) {
  // Brand Profile State
  const [brandProfile, setBrandProfile] = useState<BrandProfile>({
    brandName: 'Clínica Vetmind',
    specialty: 'Cirurgia e Diagnóstico',
    style: 'Moderno',
    font: 'Outfit',
    color: '#0052cc',
    handle: '@vetmind.clinica'
  });

  // Clinical Input State
  const [clinicalData, setClinicalData] = useState<ClinicalData>({
    queixa: initialClinicalData?.queixa || 'Canino Yorkie com claudicação severa de membro pélvico esquerdo há 2 semanas.',
    exames: initialClinicalData?.exames || 'Exame radiográfico evidenciou ruptura de ligamento cruzado cranial (RLCCr) com osteofitose discreta.',
    tecnica: initialClinicalData?.tecnica || 'Realizada osteotomia de nivelamento do platô tibial (TPLO) com placa de titânio de 2.0mm.',
    desfecho: initialClinicalData?.desfecho || 'Excelente estabilização perioperatória. Paciente com apoiar de membro imediato e reabilitação iniciada.'
  });

  // Outputs & History State
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [history, setHistory] = useState<GeneratedPost[]>([]);
  const [leftTab, setLeftTab] = useState<'clinical' | 'brand'>('clinical');
  const [rightTab, setRightTab] = useState<'carousel' | 'caption' | 'linkedin' | 'letter' | 'history'>('carousel');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Quick live overrides
  const [showOverrideSidebar, setShowOverrideSidebar] = useState(false);
  const [overrideColor, setOverrideColor] = useState(brandProfile.color);
  const [overrideFont, setOverrideFont] = useState(brandProfile.font);
  const [textPositionPercent, setTextPositionPercent] = useState(45); // offset top margin
  const [includeBrandId, setIncludeBrandId] = useState(true);

  // Copy controllers
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // System Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Voice & Simulator States
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<'queixa' | 'exames' | 'tecnica' | 'desfecho' | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const slideRef = useRef<HTMLDivElement>(null);
  const dragConstraintRef = useRef<HTMLDivElement>(null);

  // Sync override styling variables with main config changes
  useEffect(() => {
    setOverrideColor(brandProfile.color);
    setOverrideFont(brandProfile.font);
  }, [brandProfile.color, brandProfile.font]);

  // Read prefilled records on mount
  useEffect(() => {
    if (initialClinicalData) {
      setClinicalData({
        queixa: initialClinicalData.queixa || '',
        exames: initialClinicalData.exames || '',
        tecnica: initialClinicalData.tecnica || '',
        desfecho: initialClinicalData.desfecho || ''
      });
      setLeftTab('clinical');
    }
    fetchHistory();
  }, [initialClinicalData]);

  const fetchHistory = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'generations'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched: GeneratedPost[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        fetched.push({
          id: docSnap.id,
          carousel: d.carousel || [],
          instagramCaption: d.instagramCaption || '',
          linkedinText: d.linkedinText || '',
          letterText: d.letterText || '',
          brandProfile: d.brandProfile,
          clinicalData: d.clinicalData,
          createdAt: d.createdAt
        });
      });
      setHistory(fetched);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const generatePost = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setCurrentSlideIndex(0);

    try {
      const response = await fetch('/api/generate-marketing-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clinicalData,
          brandProfile: {
            ...brandProfile,
            color: overrideColor,
            font: overrideFont
          }
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errJson = await response.json();
          throw new Error(errJson.error || 'Erro na geração de post.');
        } else {
          const text = await response.text();
          throw new Error(`Erro inesperado do servidor (${response.status}): ${text.substring(0, 100)}...`);
        }
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}...`);
      }
      const data = await response.json();
      
      const newPost: GeneratedPost = {
        carousel: data.carousel,
        instagramCaption: data.instagramCaption,
        linkedinText: data.linkedinText,
        letterText: data.letterText,
        brandProfile: {
          ...brandProfile,
          color: overrideColor,
          font: overrideFont
        },
        clinicalData
      };

      setGeneratedPost(newPost);
      setRightTab('carousel');

      // Auto save on DB
      await saveOutputToDatabase(newPost);
    } catch (err: any) {
      console.error('Marketing system failure:', err);
      setGenerationError(err.message || 'Erro de comunicação temporário com o servidor do Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveOutputToDatabase = async (postToSave: GeneratedPost) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSaving(true);
    try {
      const docData = {
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        carousel: postToSave.carousel,
        instagramCaption: postToSave.instagramCaption,
        linkedinText: postToSave.linkedinText,
        letterText: postToSave.letterText,
        brandProfile: postToSave.brandProfile || brandProfile,
        clinicalData: postToSave.clinicalData || clinicalData
      };

      const docRef = await addDoc(collection(db, 'generations'), docData).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'generations');
        throw err;
      });

      if (docRef && docRef.id) {
        setGeneratedPost(prev => prev ? { ...prev, id: docRef.id } : null);
      }
      fetchHistory();
    } catch (err) {
      console.error('Erro de gravação durável:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir permanentemente este post do seu histórico?')) return;

    try {
      await deleteDoc(doc(db, 'generations', id));
      setHistory(prev => prev.filter(item => item.id !== id));
      if (generatedPost?.id === id) {
        setGeneratedPost(null);
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Convert visual HTML Element wrapper to image (PNG)
  const exportSlideAsPng = async () => {
    if (!slideRef.current) return;
    try {
      // Add visual loaders
      const btn = document.getElementById('btn-export-current-slide');
      if (btn) btn.innerHTML = 'Exportando...';

      const canvas = await html2canvas(slideRef.current, {
        useCORS: true,
        scale: 2, // Retains premium sharpness pixelRatio: 2
        backgroundColor: '#111827',
        logging: false
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `vetmind-post-slide-${currentSlideIndex + 1}.png`;
      link.href = url;
      link.click();

      if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x11="12" x1="12" y2="15" y2="3"/></svg> Exportar PNG';
    } catch (exportErr) {
      console.error('PNG conversion failure:', exportErr);
    }
  };

  const loadHistoryItem = (item: GeneratedPost) => {
    setGeneratedPost(item);
    if (item.brandProfile) {
      setBrandProfile(item.brandProfile);
      setOverrideColor(item.brandProfile.color);
      setOverrideFont(item.brandProfile.font);
    }
    if (item.clinicalData) {
      setClinicalData(item.clinicalData);
    }
    setCurrentSlideIndex(0);
    setRightTab('carousel');
  };

  const handleStartRecording = async (target: 'queixa' | 'exames' | 'tecnica' | 'desfecho') => {
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
          await handleTranscribe(base64Audio, target);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTarget(target);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Acesso ao microfone negado ou não disponível.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTarget(null);
    }
  };

  const handleTranscribe = async (base64Audio: string, target: 'queixa' | 'exames' | 'tecnica' | 'desfecho') => {
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
          setClinicalData(prev => ({
            ...prev,
            [target]: prev[target] ? `${prev[target]} ${data.transcription}` : data.transcription
          }));
        }
      }
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const appendShortcut = (target: 'queixa' | 'exames' | 'tecnica' | 'desfecho', text: string) => {
    setClinicalData(prev => ({
      ...prev,
      [target]: prev[target] ? `${prev[target]} ${text}.` : `${text}.`
    }));
  };

  // Contrast overlay style helper matching selected brand Style
  const getContrastOverlayStyles = () => {
    const style = brandProfile.style;
    if (style === 'Acolhedor') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '1.25rem',
        border: '1px solid rgba(244, 63, 94, 0.1)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '1.25rem',
        color: '#1f2937'
      };
    } else if (style === 'Executivo') {
      return {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(79, 70, 229, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '1.5rem',
        color: '#f8fafc'
      };
    } else if (style === 'Minimalista') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '0px',
        borderLeft: `4px solid ${overrideColor}`,
        padding: '1.25rem',
        color: '#171717',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      };
    } else { // Moderno
      return {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        padding: '1.5rem',
        color: '#ffffff'
      };
    }
  };

  // Get font family CSS rule
  const getFontFamily = () => {
    switch (overrideFont) {
      case 'Outfit': return '"Outfit", sans-serif';
      case 'Playfair': return '"Playfair Display", serif';
      case 'Quicksand': return '"Quicksand", sans-serif';
      default: return '"Inter", sans-serif';
    }
  };

  const getStyleIndicatorColor = () => {
    return overrideColor;
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-slate-100 active:bg-slate-200 rounded-2xl transition-all border border-slate-200 text-slate-600 shadow-sm"
            aria-label="Voltar para painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-clinical-blue rounded-lg border border-blue-100">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Estúdio de Marketing IA</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium select-none">
              Converta casos clínicos em posts educativos, estudos de caso estruturados e cartas didáticas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => {
              setClinicalData({ queixa: '', exames: '', tecnica: '', desfecho: '' });
              setGeneratedPost(null);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 active:scale-95 transition-all text-center shadow-sm"
          >
            Limpar Formulário
          </button>
          
          <button
            onClick={() => setRightTab('history')}
            className="flex items-center gap-1 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl font-bold text-xs text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <History className="w-4 h-4 animate-none" />
            Histórico ({history.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL: Form Inputs / Profiling */}
        <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-1 shrink-0">
            <button
              onClick={() => setLeftTab('clinical')}
              className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all ${
                leftTab === 'clinical' 
                ? 'bg-white text-clinical-blue shadow-3xs border border-slate-100/50' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Exame Clínico
            </button>
            <button
              onClick={() => setLeftTab('brand')}
              className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all ${
                leftTab === 'brand' 
                ? 'bg-white text-clinical-blue shadow-3xs border border-slate-100/50' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Configuração Visual
            </button>
          </div>

          <div className="p-6 space-y-6 flex-grow overflow-y-auto max-h-[640px] custom-scrollbar">
            {leftTab === 'clinical' ? (
              <div className="space-y-5">
                <div className="border-l-2 border-blue-500 pl-3">
                  <span className="text-[10px] font-black tracking-widest text-[#003399] uppercase">Caso Prontuário</span>
                  <h3 className="text-sm font-black text-slate-800">DADOS DE ATENDIMENTO</h3>
                </div>
 
                <div className="space-y-5">
                  {/* Field 1: Queixa */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        1. Queixa Central do Tutor
                      </label>
                      <button
                        type="button"
                        onClick={() => isRecording && recordingTarget === 'queixa' ? handleStopRecording() : handleStartRecording('queixa')}
                        className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all text-[9.5px] font-extrabold uppercase tracking-wider border cursor-pointer select-none ${
                          isRecording && recordingTarget === 'queixa'
                            ? "bg-red-500 border-red-500 text-white animate-pulse shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:text-clinical-blue border-slate-200 hover:border-clinical-blue/20 shadow-3xs"
                        }`}
                      >
                        {isRecording && recordingTarget === 'queixa' ? (
                          <Square className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-clinical-blue" />
                        )}
                        <span>{isRecording && recordingTarget === 'queixa' ? "Parar" : "Voz"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        rows={3}
                        className="input-clinical text-sm min-h-[96px] resize-y"
                        placeholder="Ex: Animal mordendo a pata, cansaço..."
                        value={clinicalData.queixa}
                        onChange={e => setClinicalData({ ...clinicalData, queixa: e.target.value })}
                      />
                      {isTranscribing && recordingTarget === 'queixa' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-3xs rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                          <span className="text-[10px] text-clinical-blue font-black tracking-wider uppercase animate-pulse">
                            Transcrevendo fala...
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Shortcuts Group 1 */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["Apatia e vômito", "Sem comer há 2 dias", "Claudicação pélvica", "Coceira intensa"].map(shortcut => (
                        <button
                          key={shortcut}
                          type="button"
                          onClick={() => appendShortcut('queixa', shortcut)}
                          className="px-2 py-0.5 rounded-md text-[9px] font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          + {shortcut}
                        </button>
                      ))}
                    </div>
                  </div>
 
                  {/* Field 2: Exames */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        2. Achados Principais / Exames de Imagem
                      </label>
                      <button
                        type="button"
                        onClick={() => isRecording && recordingTarget === 'exames' ? handleStopRecording() : handleStartRecording('exames')}
                        className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all text-[9.5px] font-extrabold uppercase tracking-wider border cursor-pointer select-none ${
                          isRecording && recordingTarget === 'exames'
                            ? "bg-red-500 border-red-500 text-white animate-pulse shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:text-clinical-blue border-slate-200 hover:border-clinical-blue/20 shadow-3xs"
                        }`}
                      >
                        {isRecording && recordingTarget === 'exames' ? (
                          <Square className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-clinical-blue" />
                        )}
                        <span>{isRecording && recordingTarget === 'exames' ? "Parar" : "Voz"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        rows={3}
                        className="input-clinical text-sm min-h-[96px] resize-y"
                        placeholder="Ex: Radiografia mostrou fratura distal..."
                        value={clinicalData.exames}
                        onChange={e => setClinicalData({ ...clinicalData, exames: e.target.value })}
                      />
                      {isTranscribing && recordingTarget === 'exames' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-3xs rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                          <span className="text-[10px] text-clinical-blue font-black tracking-wider uppercase animate-pulse">
                            Transcrevendo fala...
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Shortcuts Group 2 */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["Hemograma normal", "RLCCr no Raio-X", "Ultrassom abdominal", "Altas enzimas"].map(shortcut => (
                        <button
                          key={shortcut}
                          type="button"
                          onClick={() => appendShortcut('exames', shortcut)}
                          className="px-2 py-0.5 rounded-md text-[9px] font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          + {shortcut}
                        </button>
                      ))}
                    </div>
                  </div>
 
                  {/* Field 3: Técnica */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        3. Método Cirúrgico / Procedimento Adotado (Se houver)
                      </label>
                      <button
                        type="button"
                        onClick={() => isRecording && recordingTarget === 'tecnica' ? handleStopRecording() : handleStartRecording('tecnica')}
                        className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all text-[9.5px] font-extrabold uppercase tracking-wider border cursor-pointer select-none ${
                          isRecording && recordingTarget === 'tecnica'
                            ? "bg-red-500 border-red-500 text-white animate-pulse shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:text-clinical-blue border-slate-200 hover:border-clinical-blue/20 shadow-3xs"
                        }`}
                      >
                        {isRecording && recordingTarget === 'tecnica' ? (
                          <Square className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-clinical-blue" />
                        )}
                        <span>{isRecording && recordingTarget === 'tecnica' ? "Parar" : "Voz"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        rows={3}
                        className="input-clinical text-sm min-h-[96px] resize-y"
                        placeholder="Ex: Realizada ráfia lateral e osteotomia..."
                        value={clinicalData.tecnica}
                        onChange={e => setClinicalData({ ...clinicalData, tecnica: e.target.value })}
                      />
                      {isTranscribing && recordingTarget === 'tecnica' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-3xs rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                          <span className="text-[10px] text-clinical-blue font-black tracking-wider uppercase animate-pulse">
                            Transcrevendo fala...
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Shortcuts Group 3 */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["TPLO de 2.0mm", "Castração cirúrgica", "Manejo clínico", "Ráfia lateral"].map(shortcut => (
                        <button
                          key={shortcut}
                          type="button"
                          onClick={() => appendShortcut('tecnica', shortcut)}
                          className="px-2 py-0.5 rounded-md text-[9px] font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          + {shortcut}
                        </button>
                      ))}
                    </div>
                  </div>
 
                  {/* Field 4: Desfecho */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        4. Desfecho Clínico / Resultado do Caso
                      </label>
                      <button
                        type="button"
                        onClick={() => isRecording && recordingTarget === 'desfecho' ? handleStopRecording() : handleStartRecording('desfecho')}
                        className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all text-[9.5px] font-extrabold uppercase tracking-wider border cursor-pointer select-none ${
                          isRecording && recordingTarget === 'desfecho'
                            ? "bg-red-500 border-red-500 text-white animate-pulse shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:text-clinical-blue border-slate-200 hover:border-clinical-blue/20 shadow-3xs"
                        }`}
                      >
                        {isRecording && recordingTarget === 'desfecho' ? (
                          <Square className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Mic className="w-2.5 h-2.5 text-clinical-blue" />
                        )}
                        <span>{isRecording && recordingTarget === 'desfecho' ? "Parar" : "Voz"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        rows={3}
                        className="input-clinical text-sm min-h-[96px] resize-y"
                        placeholder="Ex: Alta em 15 dias, recuperação 100%..."
                        value={clinicalData.desfecho}
                        onChange={e => setClinicalData({ ...clinicalData, desfecho: e.target.value })}
                      />
                      {isTranscribing && recordingTarget === 'desfecho' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-3xs rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                          <span className="text-[10px] text-clinical-blue font-black tracking-wider uppercase animate-pulse">
                            Transcrevendo fala...
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Shortcuts Group 4 */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["Excelente recuperação", "Alta médica", "Repouso de 15 dias", "Retorno para pontos"].map(shortcut => (
                        <button
                          key={shortcut}
                          type="button"
                          onClick={() => appendShortcut('desfecho', shortcut)}
                          className="px-2 py-0.5 rounded-md text-[9px] font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          + {shortcut}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="border-l-2 border-indigo-500 pl-3">
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">Aparência</span>
                  <h3 className="text-sm font-black text-slate-800">PERFIL E CORES DE MARCA</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-medical">Nome do Profissional/Clínica</label>
                      <input
                        type="text"
                        className="input-clinical py-3 text-xs"
                        value={brandProfile.brandName}
                        onChange={e => setBrandProfile({ ...brandProfile, brandName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label-medical">Especialidade / Título</label>
                      <input
                        type="text"
                        className="input-clinical py-3 text-xs"
                        value={brandProfile.specialty}
                        onChange={e => setBrandProfile({ ...brandProfile, specialty: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-medical">Estilo Geral da Marca</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Executivo', 'Acolhedor', 'Moderno', 'Minimalista'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setBrandProfile({ ...brandProfile, style: st })}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${
                            brandProfile.style === st
                            ? 'border-clinical-blue bg-blue-50/50 text-clinical-blue'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1.5 px-1 font-medium">
                      O estilo rege os prompts da ilustração médica e as cores dos gradientes de fundo.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-medical">Tipografia das Letras</label>
                      <select
                        className="input-clinical py-3 text-xs"
                        value={brandProfile.font}
                        onChange={e => setBrandProfile({ ...brandProfile, font: e.target.value as any })}
                      >
                        <option value="Inter">Inter (Swiss Modern)</option>
                        <option value="Outfit">Outfit (Tech Bold)</option>
                        <option value="Playfair">Playfair Display (Serif)</option>
                        <option value="Quicksand">Quicksand (Warm Rounded)</option>
                      </select>
                    </div>

                    <div>
                      <label className="label-medical">Cor de Destaque (Accent)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-12 w-12 rounded-xl cursor-pointer border border-slate-200 bg-white p-1 shrink-0"
                          value={brandProfile.color}
                          onChange={e => setBrandProfile({ ...brandProfile, color: e.target.value })}
                        />
                        <input
                          type="text"
                          className="input-clinical py-3 text-xs"
                          placeholder="#0052cc"
                          value={brandProfile.color}
                          onChange={e => setBrandProfile({ ...brandProfile, color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label-medical">ID Social / Alça de usuário (@handle)</label>
                    <input
                      type="text"
                      className="input-clinical py-3 text-xs"
                      placeholder="@seu.nome.clinica"
                      value={brandProfile.handle}
                      onChange={e => setBrandProfile({ ...brandProfile, handle: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              onClick={generatePost}
              disabled={isGenerating || !clinicalData.queixa}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 ${
                isGenerating 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                : 'bg-[#0047AB] text-white shadow-blue-500/20 hover:bg-[#003399]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando com Dual-Engine...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gerar Post IA Completo
                </>
              )}
            </button>
            {isSaving && (
              <span className="block text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                Salvando publicação na nuvem...
              </span>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Outputs PREVIEW and visual canvases */}
        <section className="lg:col-span-7 flex flex-col min-w-0">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Output Navigation tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-1 overflow-x-auto shrink-0 custom-scrollbar">
              <button
                onClick={() => setRightTab('carousel')}
                className={`py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-colors ${
                  rightTab === 'carousel' 
                  ? 'bg-white text-pink-600 shadow-3xs border border-slate-100/50' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Instagram className="w-4 h-4" />
                Slides Carrossel
              </button>

              <button
                onClick={() => setRightTab('caption')}
                className={`py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-colors ${
                  rightTab === 'caption' 
                  ? 'bg-white text-purple-600 shadow-3xs border border-slate-100/50' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Instagram className="w-4 h-4" />
                Legenda de Apoio
              </button>

              <button
                onClick={() => setRightTab('linkedin')}
                className={`py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-colors ${
                  rightTab === 'linkedin' 
                  ? 'bg-white text-blue-700 shadow-3xs border border-slate-100/50' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn Case
              </button>

              <button
                onClick={() => setRightTab('letter')}
                className={`py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-colors ${
                  rightTab === 'letter' 
                  ? 'bg-white text-slate-800 shadow-3xs border border-slate-100/50' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Carta ao Colega
              </button>
            </div>

            {/* Main output representation body */}
            <div className="p-6 flex-grow overflow-y-auto max-h-[700px] custom-scrollbar flex flex-col justify-between relative">
              {generationError && (
                <div className="absolute inset-0 z-55 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center shadow-md">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">Problema na Conexão</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    {generationError}
                  </p>
                  <button
                    onClick={generatePost}
                    className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-100 transition-colors border border-red-100"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              {!generatedPost ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-6 select-none opacity-85">
                   <div className="w-20 h-20 bg-slate-50 border border-slate-200 text-slate-600 rounded-[2rem] flex items-center justify-center shadow-inner relative">
                    <Sparkles className="w-10 h-10 animate-bounce text-slate-500/50" />
                  </div>
                  <div>
                    <h3 className="text-md font-black text-slate-700 uppercase tracking-wider">Aguardando seu Comando</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                      Preencha os dados do exame clínico e clique em <strong className="text-slate-700">"Gerar Post IA Completo"</strong> para que o modelo crie os slides, imagens e artigos automaticamente.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* INSTAGRAM CAROUSEL WORKSPACE */}
                  {rightTab === 'carousel' && (
                    <div className="space-y-6 flex-grow flex flex-col">
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
                            Slide {currentSlideIndex + 1} de {generatedPost.carousel.length}
                          </span>
                          <span className="hidden md:inline-block text-[10px] font-black uppercase text-trusted-green tracking-wider bg-emerald-50 px-2 py-1 rounded border border-emerald-100 select-none">
                            Imagens de Alta Definição
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowOverrideSidebar(!showOverrideSidebar)}
                            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-[11px] text-slate-600 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-3xs"
                          >
                            <Sliders className="w-4 h-4" />
                            Ajustar Estilo
                          </button>

                          <button
                            id="btn-export-current-slide"
                            onClick={exportSlideAsPng}
                            className="flex-1 md:flex-none px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm border border-pink-100"
                          >
                            <Download className="w-4 h-4" />
                            Exportar PNG
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-grow">
                        {/* Slide Render Display */}
                        <div className="md:col-span-8 flex flex-col items-center justify-center">
                          {/* Main Slide Card Container */}
                          <div 
                            ref={slideRef}
                            className="w-full max-w-[400px] aspect-square bg-[#0c0f1d] relative rounded-3xl overflow-hidden flex flex-col justify-between p-8 select-none"
                            style={{ 
                              background: generatedPost.carousel[currentSlideIndex]?.imageUrl 
                                ? `url(${generatedPost.carousel[currentSlideIndex].imageUrl}) center/cover no-repeat` 
                                : `linear-gradient(135deg, ${overrideColor}44, #0b0f19 90%)`,
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                            }}
                          >
                            {/* Ambient Overlay Layer for rich clinical background contrast */}
                            <div 
                              className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-80"
                              style={{ 
                                background: `linear-gradient(180deg, rgba(11, 15, 25, 0.45) 0%, rgba(11, 15, 25, 0.85) 100%)` 
                              }}
                            />

                            {/* Top row: Brand ID / Clinic Header */}
                            <div className="flex items-center justify-between z-10 w-full">
                              <span className="text-[10px] font-black uppercase tracking-widest font-mono" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Vetmind Precision
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: overrideColor }} />
                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                  {brandProfile.style}
                                </span>
                              </div>
                            </div>

                            {/* Draggable container with smart constraints */}
                            <div 
                              ref={dragConstraintRef}
                              className="flex-grow w-full relative z-10"
                            >
                              <motion.div
                                drag
                                dragElastic={0.15}
                                dragConstraints={dragConstraintRef}
                                className="cursor-grab active:cursor-grabbing max-w-[90%] left-4 right-4"
                                style={{ 
                                  fontFamily: getFontFamily(),
                                  marginTop: textPositionPercent + '%',
                                  ...getContrastOverlayStyles()
                                }}
                              >
                                <span 
                                  className="text-[9px] font-black tracking-widest uppercase block mb-1"
                                  style={{ color: overrideColor }}
                                >
                                  {brandProfile.specialty}
                                </span>
                                <h4 className="text-sm font-black tracking-tight leading-tight uppercase mb-2" style={{ color: 'inherit' }}>
                                  {generatedPost.carousel[currentSlideIndex]?.title}
                                </h4>
                                <p className="text-[11px] leading-relaxed font-semibold opacity-90" style={{ color: 'inherit' }}>
                                  {generatedPost.carousel[currentSlideIndex]?.content}
                                </p>
                              </motion.div>
                            </div>

                            {/* Footer: User social handle indicator */}
                            <div className="flex items-center justify-between z-10 w-full pt-4 mt-auto" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <span className="text-[9px] font-bold tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                Slide {currentSlideIndex + 1}/{generatedPost.carousel.length}
                              </span>
                              {includeBrandId && (
                                <span className="text-[10px] font-black tracking-tight font-mono" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                  {brandProfile.handle || '@drvetclinica'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pagination dots & Arrows */}
                          <div className="flex items-center justify-center gap-4 mt-6">
                            <button
                              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentSlideIndex === 0}
                              className={`p-2.5 rounded-full border transition-all ${
                                currentSlideIndex === 0 
                                ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' 
                                : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-850 shadow-3xs'
                              }`}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex gap-1.5">
                              {generatedPost.carousel.map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCurrentSlideIndex(i)}
                                  className={`h-2 rounded-full transition-all ${
                                    currentSlideIndex === i 
                                    ? 'w-6' 
                                    : 'w-2 bg-slate-200'
                                  }`}
                                  style={{ backgroundColor: currentSlideIndex === i ? overrideColor : undefined }}
                                />
                              ))}
                            </div>

                            <button
                              onClick={() => setCurrentSlideIndex(prev => Math.min(generatedPost.carousel.length - 1, prev + 1))}
                              disabled={currentSlideIndex === generatedPost.carousel.length - 1}
                              className={`p-2.5 rounded-full border transition-all ${
                                currentSlideIndex === generatedPost.carousel.length - 1 
                                ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' 
                                : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-850 shadow-3xs'
                              }`}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 mt-2 font-medium italic">
                            💡 Arraste a caixa de texto sobre o slide para posicioná-la onde preferir!
                          </div>
                        </div>

                        {/* Adjust Style Quick Override Sidebar (Live styling override) */}
                        {showOverrideSidebar && (
                          <div className="md:col-span-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col space-y-4">
                            <div className="border-b border-slate-200 pb-2">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                <Palette className="w-4 h-4" /> Design Expresso
                              </h4>
                            </div>

                            <div>
                              <label className="label-medical text-[9px]">Cor do Destaque</label>
                              <div className="flex gap-1">
                                <input
                                  type="color"
                                  className="h-8 w-8 cursor-pointer rounded-lg bg-white border border-slate-200"
                                  value={overrideColor}
                                  onChange={e => setOverrideColor(e.target.value)}
                                  style={{ padding: '2px' }}
                                />
                                <input
                                  type="text"
                                  className="flex-1 text-[11px] font-mono p-1 rounded-lg border border-slate-200 bg-white"
                                  value={overrideColor}
                                  onChange={e => setOverrideColor(e.target.value)}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="label-medical text-[9px]">Font Corporal</label>
                              <select
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white"
                                value={overrideFont}
                                onChange={e => setOverrideFont(e.target.value as any)}
                              >
                                <option value="Inter">Inter</option>
                                <option value="Outfit">Outfit</option>
                                <option value="Playfair">Playfair</option>
                                <option value="Quicksand">Quicksand</option>
                              </select>
                            </div>

                            <div>
                              <label className="label-medical text-[9px] flex justify-between">
                                <span>Posição do Texto (Slide)</span>
                                <span className="font-mono text-slate-500">{textPositionPercent}%</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="150"
                                className="w-full accent-blue-600 cursor-pointer"
                                value={textPositionPercent}
                                onChange={e => setTextPositionPercent(Number(e.target.value))}
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                              <input
                                id="chk-brand-id"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 rounded border-slate-300"
                                checked={includeBrandId}
                                onChange={e => setIncludeBrandId(e.target.checked)}
                              />
                              <label htmlFor="chk-brand-id" className="text-[10px] font-bold text-slate-500 cursor-pointer">
                                Incluir ID do Médico (@handle)
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* INSTAGRAM SUPPORT CAPTION */}
                  {rightTab === 'caption' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Instagram className="w-5 h-5 text-pink-600" />
                          <h4 className="text-sm font-black text-slate-800">LEGENDA DO INSTAGRAM</h4>
                        </div>
                        <button
                          onClick={() => handleCopy(generatedPost.instagramCaption, 'caption')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-[10px] font-black uppercase text-clinical-blue hover:bg-slate-50 active:scale-95 transition-all text-center border border-slate-200 shadow-3xs"
                        >
                          {copiedText === 'caption' ? (
                            <>
                              <Check className="w-4 h-4 text-trusted-green" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar Texto
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 whitespace-pre-line text-xs leading-relaxed text-slate-700 font-medium">
                        {generatedPost.instagramCaption}
                      </div>
                    </div>
                  )}

                  {/* LINKEDIN TECHNICAL CASE STUDY */}
                  {rightTab === 'linkedin' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Linkedin className="w-5 h-5 text-blue-700" />
                          <h4 className="text-sm font-black text-slate-800">ESTUDO DE CASO LINKEDIN</h4>
                        </div>
                        <button
                          onClick={() => handleCopy(generatedPost.linkedinText, 'linkedin')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-[10px] font-black uppercase text-clinical-blue hover:bg-slate-50 active:scale-95 transition-all text-center border border-slate-200 shadow-3xs"
                        >
                          {copiedText === 'linkedin' ? (
                            <>
                              <Check className="w-4 h-4 text-trusted-green" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar Texto
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 whitespace-pre-line text-xs leading-relaxed text-slate-700 font-medium font-sans">
                        {generatedPost.linkedinText}
                      </div>
                    </div>
                  )}

                  {/* REFERENCE LETTER TO COLLEAGUE */}
                  {rightTab === 'letter' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <h4 className="text-sm font-black text-slate-800">CARTA DE REFERÊNCIA OPERATÓRIA</h4>
                        </div>
                        <button
                          onClick={() => handleCopy(generatedPost.letterText, 'letter')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-[10px] font-black uppercase text-clinical-blue hover:bg-slate-50 active:scale-95 transition-all text-center border border-slate-200 shadow-3xs"
                        >
                          {copiedText === 'letter' ? (
                            <>
                              <Check className="w-4 h-4 text-trusted-green" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar Texto
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-8 bg-neutral-50 rounded-2xl border border-slate-200 text-xs leading-loose text-neutral-800 font-mono shadow-inner max-w-xl mx-auto">
                        <div className="text-center font-bold pb-4 border-b border-neutral-300 mb-6 font-sans">
                          {brandProfile.brandName} • {brandProfile.specialty}
                        </div>
                        <p className="whitespace-pre-line">
                          {generatedPost.letterText}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* SAVED LOCAL/CLOUD HISTORIC DRAWER PANEL view */}
              {rightTab === 'history' && (
                <div className="space-y-6 flex-grow flex flex-col justify-start">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" /> Histórico de Criações
                    </h3>
                    <button
                      onClick={fetchHistory}
                      className="text-xs font-bold text-clinical-blue hover:underline"
                    >
                      Recarregar
                    </button>
                  </div>

                  {isLoadingHistory ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Buscando histórico persistido...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center opacity-80 select-none">
                      <Calendar className="w-12 h-12 text-slate-350 tracking-wide mb-3" />
                      <p className="text-xs font-black text-slate-600 uppercase tracking-wide">Nenhum post no histórico</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                        Sua biblioteca de postagens geradas aparecerá listada aqui para consulta e edição imediata.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {history.map((hist, index) => {
                        const styleColor = hist.brandProfile?.color || '#0052cc';
                        const firstSlide = hist.carousel[0];
                        return (
                          <div
                            key={hist.id || index}
                            onClick={() => loadHistoryItem(hist)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-2xl cursor-pointer transition-all shadow-3xs hover:shadow-2xs flex flex-col justify-between space-y-4 group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <span className="label-medical text-[9px] px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: styleColor + '15', color: styleColor }}>
                                  {hist.brandProfile?.style || 'Minimalista'}
                                </span>
                                <h4 className="text-xs font-black text-slate-800 line-clamp-1 uppercase group-hover:text-clinical-blue transition-colors">
                                  {firstSlide?.title || 'Slide Principal'}
                                </h4>
                                <p className="text-[10px] text-slate-500 line-clamp-2">
                                  {hist.clinicalData?.queixa || hist.instagramCaption || 'Sem descrição clínica...'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="text-[9px] font-bold text-slate-500 font-mono">
                                {hist.carousel.length} slides • PNG
                              </span>
                              
                              <button
                                onClick={(e) => deleteHistoryItem(hist.id || '', e)}
                                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                title="Deletar permanentemente"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Discreet Simulation Presets section at the very end of the page */}
      <div className="max-w-6xl mx-auto border-t border-slate-200 pt-6 pb-2 mt-4 flex flex-col items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-slate-500 hover:text-slate-700 transition-colors text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer py-2 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 shadow-3xs hover:shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          <span>{showPresets ? "Ocultar Casos de Teste" : "Mostrar Casos de Teste (Simulação)"}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${showPresets ? "rotate-180" : ""}`} />
        </button>
        {showPresets && (
          <div className="w-full max-w-2xl bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] text-[#003399] font-black uppercase tracking-widest text-center mb-3">
              Selecione um caso de teste para simulação automática rápida de marketing
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {clinicalPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setClinicalData({
                      queixa: preset.queixa,
                      exames: preset.exames,
                      tecnica: preset.tecnica,
                      desfecho: preset.desfecho
                    });
                    setShowPresets(false);
                  }}
                  className="bg-white border border-slate-200 hover:border-[#003399]/40 hover:bg-[#003399]/5 rounded-xl p-3 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <span className="font-bold text-[#001D62] text-[11.5px] group-hover:text-[#003399] transition-colors line-clamp-1">
                    {preset.title}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase mt-1 block leading-tight">
                    Preencher Caso
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const clinicalPresets = [
  {
    title: "TPLO (Ruptura de Ligamento)",
    queixa: "Paciente Yorkie com dor intensa e claudicação de grau IV em membro pélvico esquerdo há 2 semanas.",
    exames: "Raio-X de joelho revelou efusão articular severa e sinal de gaveta positivo compatível com suspeita de RLCCr.",
    tecnica: "Estabilização dinâmica via Osteotomia de Nivelamento do Platô Tibial (TPLO 2.0mm) com placa em L.",
    desfecho: "Rápido apoio pós-cirúrgico. Reabilitação precoce com retorno de 100% da motricidade e massa magra."
  },
  {
    title: "Piometra Canina (Urgente)",
    queixa: "Apatia severa, polidipsia súbita e presença de secreção vaginal mucopurulenta sanguinolenta de odor fétido.",
    exames: "Ultrassom evidenciou cornos uterinos de 3.5cm contendo líquido viscoso asseptizado. Leucocitose com desvio.",
    tecnica: "Ovariohisterectomia de urgência em campo amplo asséptico com lavagem peritoneal.",
    desfecho: "Alta assistida em 24h com antibioterapia pós-altas. Paciente brincalhona e cicatrização perfeita."
  },
  {
    title: "Diabetes Felino (Fred)",
    queixa: "Felino com de emagrecimento progressivo rápido na última quinzena, acompanhado de poliúria acentuada.",
    exames: "Glicemia basal de 412 mg/dL correlacionada à dosagem urinária qualitativa positiva de corpos cetônicos.",
    tecnica: "Terapia hormonal com insulina NPH e transição nutricional com redução drástica de carboidratos.",
    desfecho: "Remissão clínica de cetose e estabilização da glicemia média. Animal alegre com energia restaurada."
  }
];
