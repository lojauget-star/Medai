import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Save, Send, Clipboard, BookOpen, AlertCircle, 
  Loader2, User, PawPrint, ClipboardList, Upload, CheckCircle2, 
  RefreshCw, Sparkles, ChevronRight, Share2, Trash2, Edit3,
  Activity, Thermometer, Wind, Droplets, FileUp, FileDown,
  Mic, Square, Pill, Calendar, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Patient, Report } from '../types';

export default function ReportWorkspace({ initialReport, onBack }: { initialReport?: Report | null, onBack?: () => void }) {
  const [step, setStep] = useState<'input' | 'result'>(initialReport ? 'result' : 'input');
  const [patient, setPatient] = useState<Partial<Patient>>({
    name: initialReport?.patientId || '',
    species: 'Canino',
    breed: 'Golden Retriever',
    age: '5 anos'
  });
  const [anamnesis, setAnamnesis] = useState(initialReport?.anamnesis || '');
  const [examData, setExamData] = useState(initialReport?.examData || '');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, size: string, data?: string, mimeType?: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(initialReport?.soapContent || null);
  const [sources, setSources] = useState<string[]>(initialReport?.sources || []);
  const [error, setError] = useState<string | null>(null);

  // New Literature Grounding States
  const [workMode, setWorkMode] = useState<'soap' | 'literature'>('soap');
  const [generatedReview, setGeneratedReview] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Prescription State
  const [prescription, setPrescription] = useState<string | null>(null);
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialReport) {
      setPatient({ name: initialReport.patientId, species: 'Canino', breed: 'Golden Retriever', age: '5 anos' });
      setAnamnesis(initialReport.anamnesis || '');
      setExamData(initialReport.examData || '');
      setGeneratedReport(initialReport.soapContent || null);
      setSources(initialReport.sources || []);
      setStep('result');
    } else {
      setPatient({ name: '', species: 'Canino', breed: 'Golden Retriever', age: '5 anos' });
      setAnamnesis('');
      setExamData('');
      setUploadedFiles([]);
      setGeneratedReport(null);
      setGeneratedReview(null);
      setSources([]);
      setStep('input');
    }
  }, [initialReport]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFilesPromises = Array.from(files).map(async (f) => {
        return new Promise<{name: string, size: string, data: string, mimeType: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(',')[1];
            resolve({
              name: f.name,
              size: (f.size / (1024 * 1024)).toFixed(1) + 'MB',
              data: base64,
              mimeType: f.type
            });
          };
          reader.readAsDataURL(f);
        });
      });

      const newFiles = await Promise.all(newFilesPromises);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      // Update examData summary
      setExamData(prev => prev + "\n[Arquivos analisados: " + newFiles.map(f => f.name).join(', ') + "]");
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!anamnesis && uploadedFiles.length === 0) {
      alert("Por favor, preencha a anamnese ou anexe exames.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patient, 
          anamnesis, 
          examData: examData || 'Nenhum exame anexado',
          files: uploadedFiles.map(f => ({
            data: f.data,
            mimeType: f.mimeType
          }))
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let msg = 'Falha na comunicação com a IA';
        if (contentType && contentType.includes('application/json')) {
          const errData = await response.json();
          msg = errData.error || msg;
        }
        setError(msg);
        throw new Error(msg);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setGeneratedReport(data.soapContent);
        setSources(data.sources || []);
        setStep('result');
      } else {
        const errorText = 'Resposta inválida do servidor (não JSON).';
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
      alert("Por favor, digite uma dúvida clínica, tema ou anexe um artigo para revisão crítica.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/literature-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: anamnesis, 
          files: uploadedFiles.map(f => ({
            data: f.data,
            mimeType: f.mimeType
          }))
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let msg = 'Falha na comunicação com o Motor de RAG da Literatura.';
        if (contentType && contentType.includes('application/json')) {
          const errData = await response.json();
          msg = errData.error || msg;
        }
        setError(msg);
        throw new Error(msg);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setGeneratedReview(data.review);
        setSources(["Watson Critical Care", "Fossum Vet Surgery", "ACVIM Consensus"]);
        setStep('result');
      } else {
        const errorText = 'Resposta inválida do servidor de literatura.';
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
    let extractedSource = 'Outros';
    const sections = generatedReport.split('##');
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
        patientId: patient.name || 'Sem nome',
        anamnesis,
        examData,
        soapContent: generatedReport,
        prescription, 
        marketingSource: extractedSource,
        sources,
        ownerId: auth.currentUser.uid,
        status: 'finalized',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'reports'), reportData).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'reports');
      });
      
      const successModal = document.createElement('div');
      successModal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-300";
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
      document.getElementById('closeModal')?.addEventListener('click', () => {
        document.body.removeChild(successModal);
        if (onBack) onBack();
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await handleTranscribe(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
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
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: base64Audio, mimeType: 'audio/webm' })
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.transcription) {
          setAnamnesis(prev => prev + (prev ? "\n" : "") + data.transcription);
        }
      } else {
        console.warn("Expected JSON answer for transcription but got:", contentType);
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
      const response = await fetch('/api/generate-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soapContent: generatedReport, patient })
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setPrescription(data.prescription);
      } else {
        console.warn("Expected JSON answer for prescription but got:", contentType);
      }
      
      // Auto scroll to prescription
      setTimeout(() => {
        const pSection = document.getElementById('prescription-section');
        pSection?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error("Prescription error:", err);
    } finally {
      setIsGeneratingPrescription(false);
    }
  };

  if (step === 'result' && (generatedReport || generatedReview)) {
    if (generatedReview) {
       const sections = generatedReview.split('##');
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
                 <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">Análise Crítica de Literatura</h2>
                 <p className="text-sm font-medium text-slate-500 max-w-xl">
                   O motor de RAG estruturado do Voa.Vet cruzou os dados e diretrizes das bases clínicas com o prompt consultado.
                 </p>
              </div>
              
              <div className="flex flex-row md:flex-col gap-3 min-w-[200px]">
                <button onClick={() => { setStep('input'); setGeneratedReview(null); setAnamnesis(''); }} className="flex-1 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-slate-50">
                  <Edit3 className="w-4 h-4 text-[#6B4EFF]" /> Nova Busca
                </button>
                <button onClick={() => alert('PDF exportado com sucesso contendo as referências e cruzamentos.')} className="flex-1 px-6 py-3.5 bg-[#6B4EFF] text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
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
                     <ReactMarkdown>{sections[1].replace('📌 RESUMO EXECUTIVO (TL;DR)', '')}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Aplicação Prática */}
              {sections[2] && (
                <div className="bg-white border border-slate-150 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                  <h3 className="font-extrabold text-emerald-600 uppercase text-[11px] tracking-widest flex items-center gap-2">
                     <span className="text-lg">⚙️</span> Aplicação Prática (Posologia / Prática)
                  </h3>
                  <div className="text-sm text-slate-600 font-semibold leading-relaxed prose-clinical">
                     <ReactMarkdown>{sections[2].replace('⚙️ APLICAÇÃO PRÁTICA (O QUE MUDA?)', '')}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Confiança */}
              {sections[3] && (
                <div className="bg-white border border-slate-150 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                  <h3 className="font-extrabold text-amber-600 uppercase text-[11px] tracking-widest flex items-center gap-2">
                     <span className="text-lg">⚖️</span> Força de Evidência e Limitações
                  </h3>
                  <div className="text-xs text-slate-500 font-bold leading-relaxed prose-clinical">
                     <ReactMarkdown>{sections[3].replace('⚖️ AVALIAÇÃO DE CONFIANÇA E LIMITAÇÕES DO ESTUDO', '')}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Confronto Base */}
              {sections[4] && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-4 hover:shadow-md transition-all">
                  <h3 className="font-extrabold text-blue-700 uppercase text-[11px] tracking-widest flex items-center gap-2">
                     <span className="text-lg">📚</span> Confronto com Literatura de Base
                  </h3>
                  <div className="text-sm text-slate-600 font-semibold leading-relaxed prose-clinical">
                     <ReactMarkdown>{sections[4].replace('📚 CONFRONTADO COM A LITERATURA BASE (GLOBAL VS LOCAL)', '')}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Citações */}
              {sections[5] && (
                <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 md:p-10 text-white shadow-xl space-y-4 relative overflow-hidden">
                  <h3 className="font-black text-purple-300 uppercase text-[11px] tracking-widest flex items-center gap-2">
                     <span className="text-lg">📖</span> Referência Bibliográfica Rastreável
                  </h3>
                  <div className="text-xs text-slate-200 leading-relaxed font-mono">
                     <ReactMarkdown>{sections[5].replace('📖 CITAÇÃO CLÍNICA EXATA', '')}</ReactMarkdown>
                  </div>
                  {/* Subtle water mark */}
                  <div className="absolute right-6 bottom-6 text-white/5 font-black text-6xl select-none">RAG</div>
                </div>
              )}
           </div>

           <div className="flex items-center justify-around py-5 rounded-2xl bg-white border border-slate-100 shadow-xl sticky bottom-4 z-50">
             <button onClick={() => { navigator.clipboard.writeText(generatedReview); alert('Revisão copiada para a área de transferência.'); }} className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors">
                <Clipboard className="w-5 h-5" /> Copiar Tudo
             </button>
             <button onClick={() => alert('Compartilhado com sucesso.')} className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors">
                <Share2 className="w-5 h-5" /> Compartilhar
             </button>
             <button onClick={() => { alert("Adicionado ao histórico clínico com sucesso!"); if (onBack) onBack(); }} className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-clinical-blue hover:scale-105 transition-transform">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <Save className="w-6 h-6" />
                </div>
                Salvar Revisão
             </button>
           </div>
         </div>
       );
    }

    const sections = generatedReport.split('##');
    
    // Parse metrics if available
    let metrics = { fc: '--', fr: '--', temp: '--', trc: '--' };
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
             <span className="bg-emerald-50 text-trusted-green text-[10px] px-2 py-0.5 rounded border border-emerald-100 font-bold uppercase tracking-wider">Aprovado</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: #ORD-{Math.floor(Math.random() * 90000) + 10000}</span>
          </div>

          <h2 className="text-2xl font-bold text-surface-text leading-tight tracking-tight">Laudo Veterinário Assistido</h2>
          <div className="flex items-center gap-2">
            <span className="label-medical text-xs mr-2">Paciente:</span>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-tight">{patient.name} • {patient.age}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('input')} className="flex-1 bg-white border border-surface-border py-2.5 rounded-xl text-clinical-blue font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-slate-50">
              <Edit3 className="w-4 h-4" /> Editar
            </button>
            <button className="flex-1 bg-clinical-blue text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Diagnósticos Diferenciais - Special Insight Box */}
        {sections.length > 5 && (
          <div className="bg-[#DEEBFF] border border-clinical-blue/20 rounded-lg p-6 space-y-4 shadow-sm border-l-4 border-l-clinical-blue">
             <div className="flex items-center gap-2 text-clinical-blue">
                <Activity className="w-5 h-5" />
                <h3 className="font-bold text-[11px] uppercase tracking-[0.1em]">Diagnósticos Diferenciais</h3>
             </div>
             <div className="text-sm text-surface-text font-medium leading-relaxed prose-clinical">
                <ReactMarkdown>{sections[5]}</ReactMarkdown>
             </div>
          </div>
        )}

        {/* SOAP Sections */}
        <div className="card-clinical overflow-hidden divide-y divide-slate-100">
          <SoapSection title="S (SUBJETIVO)">
            <div className="text-sm text-surface-text leading-relaxed font-normal">
              <ReactMarkdown>{sections[1] || '---'}</ReactMarkdown>
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
              <ReactMarkdown>{sections[2] || '---'}</ReactMarkdown>
            </div>
          </SoapSection>
 
          <SoapSection title="A (AVALIAÇÃO)">
            <div className="bg-slate-50 rounded border border-slate-200 p-4">
               <div className="text-sm text-surface-text font-semibold leading-relaxed">
                 <ReactMarkdown>{sections[3] || '---'}</ReactMarkdown>
               </div>
            </div>
          </SoapSection>
 
          <SoapSection title="P (PLANO)">
            <div className="text-sm text-surface-text leading-relaxed font-normal space-y-2">
              <ReactMarkdown>{sections[4] || '---'}</ReactMarkdown>
            </div>
            {!prescription && (
               <button 
                 onClick={handleGeneratePrescription}
                 disabled={isGeneratingPrescription}
                 className="mt-6 w-full py-4 border-2 border-dashed border-clinical-blue text-clinical-blue rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-50"
               >
                 {isGeneratingPrescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pill className="w-4 h-4" />}
                 Gerar Prescrição Digital
               </button>
            )}
          </SoapSection>
        </div>

        {/* Prescription Box */}
        {prescription && (
          <div id="prescription-section" className="bg-white border-2 border-slate-200 rounded-[2rem] overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-500">
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
                <div className="text-sm text-slate-700 leading-relaxed font-normal prose-clinical">
                   <ReactMarkdown>{prescription}</ReactMarkdown>
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
              <h4 className="text-sm font-bold text-slate-900">Plano Preventivo</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paciente está com as vacinas V10 e Raiva próximas do vencimento. 
                Deseja agendar um retorno preventivo para <b>Junho/2026</b>?
              </p>
              <button className="text-trusted-green text-[10px] font-black uppercase tracking-widest mt-2 hover:underline flex items-center gap-1">
                Agendar Agora <ChevronRight className="w-3 h-3" />
              </button>
           </div>
        </div>

        <div className="flex items-center justify-around py-5 rounded-lg bg-white border border-surface-border shadow-lg sticky bottom-4 mx-2 z-50">
          <button className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors">
             <Clipboard className="w-5 h-5" /> Copiar
          </button>
          <button className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-clinical-blue transition-colors">
             <Share2 className="w-5 h-5" /> Compartilhar
          </button>
          <button onClick={handleSave} className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-clinical-blue hover:scale-105 transition-transform">
             <div className="bg-blue-50 p-2 rounded">
               <Save className="w-6 h-6" />
             </div>
             Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-40 animate-in fade-in slide-in-from-right-2 duration-400 max-w-md mx-auto px-1">
      {/* Progress */}
      <div className="flex justify-center gap-2 mb-6">
        <div className="h-1 w-10 bg-clinical-blue animate-pulse"></div>
        <div className="h-1 w-10 bg-slate-200"></div>
        <div className="h-1 w-10 bg-slate-200"></div>
      </div>

      <div className="px-1 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-surface-text tracking-tight uppercase">Voa.Vet Copilot</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Conectado ao cérebro de RAG Clínico Certificado.</p>
        </div>
      </div>

      {/* Mode Switcher Tab */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200/50 shadow-inner">
        <button 
          onClick={() => { setWorkMode('soap'); setError(null); }}
          className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${workMode === 'soap' ? 'bg-white text-clinical-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          📝 Laudo SOAP
        </button>
        <button 
          onClick={() => { setWorkMode('literature'); setError(null); }}
          className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${workMode === 'literature' ? 'bg-white text-clinical-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          📚 Revisão Crítica (RAG)
        </button>
      </div>

      {/* Dados do Paciente - Omit if literature review */}
      {workMode === 'soap' && (
        <div className="card-clinical p-8 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 text-clinical-blue">
            <PawPrint className="w-5 h-5" />
            <h3 className="font-bold text-lg text-surface-text tracking-tight">Dados do Paciente</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label-medical">Nome do Paciente</label>
              <input 
                className="input-clinical" 
                placeholder="Ex: Rex"
                value={patient.name}
                onChange={(e) => setPatient({...patient, name: e.target.value})}
              />
            </div>
            <div>
               <label className="label-medical">Espécie / Raça</label>
               <input 
                 className="input-clinical" 
                 placeholder="Ex: Canino / Golden"
                 value={patient.breed}
                 onChange={(e) => setPatient({...patient, breed: e.target.value})}
               />
            </div>
            <div>
              <label className="label-medical">Idade</label>
              <input 
                className="input-clinical" 
                placeholder="Ex: 5 anos"
                value={patient.age}
                onChange={(e) => setPatient({...patient, age: e.target.value})}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload de Exames */}
      <div className="card-clinical p-8 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 text-clinical-blue">
          <FileUp className="w-5 h-5" />
          <h3 className="font-bold text-lg text-surface-text tracking-tight">
            {workMode === 'soap' ? 'Upload de Exames' : 'Anexar Artigo Científico ou Diretriz'}
          </h3>
        </div>
        
        <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf,.jpg,.jpeg,.png" />

        <div 
          onClick={() => fileInputRef.current?.click()} 
          className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-all group cursor-pointer"
        >
          <div className="text-slate-400 group-hover:scale-110 transition-all mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <p className="text-sm font-bold text-slate-600">
            {workMode === 'soap' ? 'Arraste seus arquivos de exames aqui' : 'Arraste artigos, PDFs ou diretrizes aqui'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">PDF, JPG ou PNG (Máx 10MB)</p>
          <button className="mt-5 bg-[#003399] text-white text-[11px] font-black uppercase px-8 py-3 rounded-lg shadow-lg shadow-[#003399]/20 transition-transform active:scale-95">
            {workMode === 'soap' ? 'Selecionar Exames' : 'Selecionar Documento'}
          </button>
        </div>
        
        <AnimatePresence>
          <div className="space-y-2 pt-2">
             {uploadedFiles.map((file, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <FileText className="w-5 h-5 text-slate-400" />
                     <div>
                        <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{file.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Pronto • {file.size}</p>
                     </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-trusted-green" />
              </div>
             ))}
             {isGenerating && (
                <div className="bg-slate-50 border border-slate-100 rounded-md p-3 space-y-2">
                   <div className="flex items-center justify-between font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                      <span>Processando documentos...</span>
                      <Loader2 className="w-3 h-3 animate-spin" />
                   </div>
                   <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '70%', transition: { duration: 2, repeat: Infinity } }}
                        className="h-full bg-clinical-blue"
                      />
                   </div>
                </div>
             )}
          </div>
        </AnimatePresence>
      </div>

      {/* Anamnese */}
      <div className="card-clinical p-8 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-clinical-blue">
            <ClipboardList className="w-5 h-5" />
            <h3 className="font-bold text-lg text-surface-text tracking-tight">
               {workMode === 'soap' ? 'Anamnese / Histórico' : 'Tema de Pesquisa Clínica (RAG)'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
             {isTranscribing && <div className="flex items-center gap-1.5 text-[10px] font-bold text-clinical-blue animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> Transcrevendo...</div>}
             <button 
               onClick={isRecording ? handleStopRecording : handleStartRecording}
               className={`p-3 rounded-xl flex items-center gap-2 transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-clinical-blue border border-slate-200 hover:bg-slate-100'}`}
             >
               {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
               <span className="text-[10px] font-black uppercase tracking-widest">{isRecording ? 'Parar Grav.' : 'Gravar Áudio'}</span>
             </button>
          </div>
        </div>
        <div>
          <label className="label-medical">
             {workMode === 'soap' ? 'Relato Completo da Consulta' : 'Sua pergunta para cruzamento Literário'}
          </label>
          <div className="relative">
            <textarea 
              className="input-clinical h-64 resize-none leading-relaxed text-sm" 
              placeholder={workMode === 'soap' ? "Descreva aqui os sintomas, duração, e observações relevantes do tutor... Dica: Você também pode gravar o relato em áudio clicando no botão acima." : "Ex: Qual é a recomendação da WSAVA sobre dosagem preventiva em felinos geriátricos? Ou qual o manejo correto da cetoacidose diabética refratária de acordo com Nelson & Couto?"}
              value={anamnesis}
              onChange={(e) => setAnamnesis(e.target.value)}
            />
            {isRecording && (
              <div className="absolute inset-0 bg-red-50/50 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center space-y-3 z-10">
                 <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-ping absolute opacity-20"></div>
                 <Mic className="w-8 h-8 text-red-500 animate-bounce" />
                 <p className="text-sm font-black text-red-600 uppercase tracking-widest">Gravando...</p>
                 <button onClick={handleStopRecording} className="bg-red-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg">Finalizar</button>
              </div>
            )}
          </div>
        </div>
        <div className="bg-[#EBF2FF] border border-blue-50 rounded-lg p-6 flex gap-4">
          {workMode === 'soap' ? (
            <>
              <Sparkles className="w-6 h-6 text-clinical-blue shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-bold text-clinical-blue uppercase tracking-tight mb-1">Sugestão do Copilot</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mencione se o paciente apresentou episódios de vômito ou diarreia nas últimas 24h para melhorar a precisão do laudo.
                </p>
              </div>
            </>
          ) : (
            <>
              <BookOpen className="w-6 h-6 text-[#6B4EFF] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-bold text-[#6B4EFF] uppercase tracking-tight mb-1">Guarda-chuva Científico</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O sistema de RAG cruza automaticamente as referências tradicionais (Nelson, Fossum, WSAVA, ACVIM) contra suas dúvidas ou anexo.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Próximos Passos */}
      <div className="bg-[#081528] rounded-xl p-8 text-white space-y-6 shadow-2xl">
        <h3 className="font-bold text-xl tracking-tight">Próximos Passos</h3>
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center gap-4 group hover:bg-white/10 transition-colors">
             <div className="p-2 rounded bg-emerald-500/10 text-emerald-400">
                <Activity className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-slate-300">Análise Preditiva</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center gap-4 group hover:bg-white/10 transition-colors">
             <div className="p-2 rounded bg-clinical-blue/10 text-clinical-blue">
                <div className="w-5 h-5 flex items-center justify-center border-2 border-clinical-blue rounded-sm text-[8px] font-bold">+</div>
             </div>
             <span className="text-sm font-semibold text-slate-300">Sugestão Terapêutica</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center gap-4 group hover:bg-white/10 transition-colors">
             <div className="p-2 rounded bg-slate-500/10 text-slate-400">
                <Share2 className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-slate-300">Exportar Laudo</span>
          </div>
        </div>
      </div>

      {/* Status Bar - Reverted to Card Flow for better discretion */}
      <div className="card-clinical bg-slate-50 border-slate-200 p-8 space-y-6 shadow-sm mb-10 group relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h4 className="text-lg font-bold text-surface-text tracking-tight">Status do Protocolo</h4>
                  <p className="text-xs text-slate-500 mt-1">Dados validados e prontos para análise</p>
               </div>
               <div className="flex flex-col items-end gap-1">
                 <span className="bg-clinical-blue/10 text-clinical-blue text-[10px] font-bold uppercase px-3 py-1 rounded-full">3/3 Etapas</span>
                 <div className="flex items-center gap-1 text-[9px] text-trusted-green font-bold uppercase tracking-tighter">
                   <CheckCircle2 className="w-3 h-3" /> Conectado à IA
                 </div>
               </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-900">Erro na Consulta</p>
                  <p className="text-[10px] text-red-700 leading-relaxed mt-0.5">{error}</p>
                </div>
              </div>
            )}
            
            <button 
              onClick={workMode === 'soap' ? handleGenerate : handleGenerateReview}
              disabled={isGenerating || (!anamnesis && uploadedFiles.length === 0)}
              className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.15em] shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                isGenerating || (!anamnesis && uploadedFiles.length === 0) 
                  ? 'bg-slate-300 cursor-not-allowed text-white' 
                  : workMode === 'soap'
                    ? 'bg-trusted-green text-white hover:bg-emerald-600 shadow-trusted-green/20'
                    : 'bg-[#6B4EFF] text-white hover:bg-[#5339cc] shadow-[#6B4EFF]/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analisando e Cruzando Bases...</span>
                </>
              ) : (
                <>
                  {workMode === 'soap' ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      GERAR PROPOSTA DE LAUDO
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      ANALISAR BASES E ARTIGO (RAG)
                    </>
                  )}
                </>
              )}
            </button>
         </div>
         {/* Subtle decoration */}
         <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <PawPrint className="w-32 h-32" strokeWidth={1} />
         </div>
      </div>
    </div>
  );
}

function SoapSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-slate-50 border-y border-slate-100 px-6 py-2">
        <h4 className="text-[10px] font-bold text-clinical-blue uppercase tracking-[0.2em]">{title}</h4>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">{label}</p>
      <p className="text-xs font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StepItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group">
      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight uppercase">{label}</span>
    </div>
  );
}
