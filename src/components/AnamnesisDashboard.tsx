import React, { useRef } from 'react';
import { 
  Search, 
  Bell, 
  PawPrint, 
  Edit3, 
  Activity, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  FileDown, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Loader2 
} from 'lucide-react';
import { Patient } from '../types';

interface AnamnesisDashboardProps {
  patient: Patient;
  onUpdatePatient: (updated: Partial<Patient>) => void;
  anamnesisText: string;
  onAnamnesisChange: (text: string) => void;
  uploadedFiles: Array<{ name: string; size: string; data: string; mimeType: string }>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onSubmitCase: () => void;
  isGenerating: boolean;
  isRecording: boolean;
  recordTimer: number;
  onToggleRecording: () => void;
  isTranscribing: boolean;
  onOpenEditModal: () => void;
}

export default function AnamnesisDashboard({
  patient,
  onUpdatePatient,
  anamnesisText,
  onAnamnesisChange,
  uploadedFiles,
  onFileUpload,
  onRemoveFile,
  onSubmitCase,
  isGenerating,
  isRecording,
  recordTimer,
  onToggleRecording,
  isTranscribing,
  onOpenEditModal,
}: AnamnesisDashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Vet Profile from localStorage
  const [vetName, setVetName] = React.useState(() => localStorage.getItem("vetmind_signature_name") || "Dr. André Eguchi");
  const [vetCrmv, setVetCrmv] = React.useState(() => localStorage.getItem("vetmind_signature_crmv") || "CRMV-SP 14892");

  React.useEffect(() => {
    const handleProfileUpdate = () => {
      setVetName(localStorage.getItem("vetmind_signature_name") || "Dr. André Eguchi");
      setVetCrmv(localStorage.getItem("vetmind_signature_crmv") || "CRMV-SP 14892");
    };
    window.addEventListener("vetmind_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("vetmind_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  // Vital signs parameters
  const vitals = {
    fc: patient.fc ? (patient.fc.endsWith('bpm') ? patient.fc : `${patient.fc} bpm`) : '--',
    fr: patient.fr ? (patient.fr.endsWith('mpm') ? patient.fr : `${patient.fr} mpm`) : '--',
    temp: patient.temperature ? (patient.temperature.includes('ºC') || patient.temperature.includes('°C') ? patient.temperature : `${patient.temperature} ºC`) : '--',
    tpc: patient.tpc || '--',
    mucosas: patient.mucosas || '--',
    hydration: patient.hydration || '--',
  };

  const handleApplyTemplate = () => {
    const template = `QUEIXA PRINCIPAL:\nPaciente que se apresenta com episódios de emese recorrente e inapetência há 48 horas.\n\nHISTÓRICO & EVOLUÇÃO:\nTutor relata apatia progressiva, episódios de vômito amarelado (bile/suco gástrico) e desconforto abdominal à palpação.\n\nALIMENTAÇÃO & AMBIENTE:\nAlimentação habitual ração seca. Sem acesso à rua não supervisionado. Vacinas (V10/Antirrábica) atualizadas.\n\nMEDICAÇÕES EM USO:\nNenhuma medicação iniciada previamente.`;
    onAnamnesisChange(template);
  };

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC] min-h-full font-sans text-[#0F172A] selection:bg-indigo-100 selection:text-indigo-700 pb-20">
      
      {/* Ultra-Compact Minimalist Desktop Header */}
      <header className="h-[40px] bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 z-10 sticky top-0 shadow-3xs">
        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-0.5 rounded-full w-full max-w-xs focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/10 transition-all">
          <Search className="w-3 h-3 text-[#64748B] shrink-0" />
          <input 
            type="text"
            placeholder="Pesquisar casos, pacientes ou literatura médica..."
            className="w-full bg-transparent text-[11px] text-[#0F172A] placeholder-[#64748B] outline-none font-normal"
          />
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            className="p-1 rounded-full border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-all relative cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          </button>

          <div className="h-4 w-px bg-[#E2E8F0]" />

          {/* Active Vet Avatar */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full border border-[#E2E8F0] overflow-hidden bg-slate-100 shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(vetName)}`} alt={vetName} className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold text-[#0F172A] leading-tight font-sans">{vetName}</p>
              <p className="text-[9px] text-[#10B981] font-medium tracking-tight font-sans">{vetCrmv.toUpperCase().startsWith('CRMV') ? vetCrmv : `CRMV-${vetCrmv}`}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main 2-Column Ultra-Compact Dashboard Canvas */}
      <div className="flex-1 p-2 md:p-3 max-w-[2160px] w-full mx-auto space-y-2">
        
        {/* Compact Title */}
        <div className="flex items-center justify-between py-0.5">
          <h1 className="text-base font-bold text-[#0F172A] tracking-tight font-sans flex items-center gap-2">
            Novo Atendimento <span className="text-xs font-normal text-[#64748B]">• Anamnese e Triagem</span>
          </h1>
        </div>

        {/* 2-Column Grid Layout (Left 38% / Right 62%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="lg:col-span-5 space-y-2.5">
            
            {/* CARD 1: Dados do Paciente */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <PawPrint className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">Paciente</h3>
                </div>
                <button 
                  type="button"
                  onClick={onOpenEditModal}
                  className="px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[10px] font-semibold text-[#64748B] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Edit3 className="w-3 h-3" />
                  Editar
                </button>
              </div>

              {/* Patient Photo & Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-[#E2E8F0] overflow-hidden bg-indigo-50/50 shrink-0 shadow-3xs flex items-center justify-center">
                  <img 
                    src={patient.species === 'Felino' ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=120" : (patient.species === 'Canino' ? "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=120" : "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=120")} 
                    alt={patient.name || "Pet"} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A] font-sans truncate">{patient.name || "Aguardando cadastro..."}</h2>
                    {patient.name && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-[#10B981] text-[9px] font-semibold tracking-tight border border-emerald-100">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#64748B] font-sans truncate">
                    {patient.species || "Espécie N/I"} • {patient.breed || "Raça N/I"}
                  </p>
                  <p className="text-[11px] text-[#64748B] font-sans truncate">
                    {patient.sex || "Sexo N/I"} • {patient.age || "Idade N/I"} • {patient.weight ? `${patient.weight} kg` : "Peso N/I"}
                  </p>
                </div>
              </div>

              {/* Tutor Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 text-xs">
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] uppercase font-semibold text-[#64748B] block font-sans">Tutor</span>
                  <span className="font-semibold text-[#0F172A] text-[11px] block mt-0.5 font-sans truncate">{patient.ownerName || patient.tutorName || "Não informado"}</span>
                </div>
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] uppercase font-semibold text-[#64748B] block font-sans">Contato</span>
                  <span className="font-semibold text-[#0F172A] text-[11px] block mt-0.5 tabular-nums font-sans truncate">{patient.ownerPhone || patient.tutorPhone || "Não informado"}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: Sinais Vitais */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#10B981]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">Sinais Vitais</h3>
                </div>
                <button 
                  type="button"
                  onClick={onOpenEditModal}
                  className="px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[10px] font-semibold text-[#64748B] hover:text-[#10B981] hover:border-[#10B981] transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Edit3 className="w-3 h-3" />
                  Preencher
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-semibold text-[#64748B] uppercase block font-sans">FC</span>
                  <span className="text-xs font-semibold text-[#0F172A] tabular-nums font-sans">{vitals.fc}</span>
                </div>
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-semibold text-[#64748B] uppercase block font-sans">FR</span>
                  <span className="text-xs font-semibold text-[#0F172A] tabular-nums font-sans">{vitals.fr}</span>
                </div>
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-semibold text-[#64748B] uppercase block font-sans">Temp</span>
                  <span className="text-xs font-semibold text-[#0F172A] tabular-nums font-sans">{vitals.temp}</span>
                </div>
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-semibold text-[#64748B] uppercase block font-sans">TPC</span>
                  <span className="text-xs font-semibold text-[#0F172A] tabular-nums font-sans">{vitals.tpc}</span>
                </div>
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-semibold text-[#64748B] uppercase block font-sans">Mucosas</span>
                  <span className="text-xs font-semibold text-[#0F172A] font-sans truncate block">{vitals.mucosas}</span>
                </div>
                <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-semibold text-[#64748B] uppercase block font-sans">Hidratação</span>
                  <span className="text-xs font-semibold text-[#0F172A] font-sans truncate block">{vitals.hydration}</span>
                </div>
              </div>
            </div>

            {/* CARD 3: Anexos e Exames */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">Anexos</h3>
                </div>
                <span className="text-[10px] text-[#64748B] font-sans">PDF, Imagem, Áudio</span>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileUpload} 
                className="hidden" 
                multiple 
                accept="image/*,application/pdf,audio/*"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] hover:border-[#4F46E5] rounded-xl p-3.5 sm:p-4 text-center bg-[#F8FAFC] hover:bg-indigo-50/30 transition-all cursor-pointer group flex flex-col items-center justify-center gap-1.5 min-h-[85px] shadow-2xs"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-4 h-4 text-[#4F46E5]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#0F172A] font-sans">Anexar exames ou laudos</p>
                  <p className="text-[10px] text-[#64748B] font-sans">Clique ou arraste exames em PDF, imagens ou áudios aqui</p>
                </div>
              </div>

              {/* List of Attached Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1">
                  {uploadedFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-[#F8FAFC] rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-3 h-3 text-[#4F46E5] shrink-0" />
                        <span className="font-medium text-[#0F172A] truncate font-sans text-xs">{f.name}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => onRemoveFile(idx)}
                        className="p-0.5 hover:bg-rose-50 text-[#64748B] hover:text-[#F43F5E] rounded transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>


          {/* ================= RIGHT COLUMN ================= */}
          <div className="lg:col-span-7 space-y-2.5">
            
            {/* CARD PRINCIPAL: ANAMNESE */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs space-y-2 flex flex-col">
              
              {/* Header Actions */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">Anamnese Clínica</h3>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onToggleRecording}
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer font-sans ${
                      isRecording 
                        ? 'border-red-400 bg-red-50 text-red-600 animate-pulse' 
                        : 'border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
                    }`}
                    title="Gravar áudio"
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording ? `(${recordTimer}s)` : 'Voz'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[10px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>Imagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[10px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    className="px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[10px] font-semibold text-[#4F46E5] hover:bg-indigo-50/50 transition-all flex items-center gap-1 cursor-pointer font-sans"
                    title="Carregar modelo de anamnese"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Modelo</span>
                  </button>
                </div>
              </div>

              {/* Text Area (Compact Height so button is visible on-screen) */}
              <div className="flex flex-col relative space-y-1">
                <textarea
                  value={anamnesisText}
                  onChange={(e) => onAnamnesisChange(e.target.value)}
                  placeholder="Descreva a queixa principal, evolução dos sintomas, alimentação, ambiente, medicamentos em uso..."
                  className="w-full h-[150px] lg:h-[160px] p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 rounded-lg text-xs text-[#0F172A] font-normal placeholder-[#64748B] leading-relaxed resize-none outline-none transition-all font-sans"
                />

                <div className="flex items-center justify-between text-[10px] text-[#64748B] font-sans px-1">
                  <span>{isTranscribing ? "Transcrevendo áudio..." : "Pronto para análise"}</span>
                  <span className="tabular-nums">{anamnesisText.length} caracteres</span>
                </div>
              </div>
            </div>

            {/* CARD SECUNDÁRIO: CHECKLIST */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-2.5 shadow-2xs space-y-1.5">
              <h4 className="font-semibold text-[11px] text-[#0F172A] font-sans">Checklist de Anamnese:</h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-medium text-[#64748B]">
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Histórico prévio</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Ambiente & manejo</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Sintomas & evolução</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Alimentação</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Medicações</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Vacinação</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Comportamento</span>
                </div>
                <div className="flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>Exames prévios</span>
                </div>
              </div>
            </div>

            {/* BOTÃO PRINCIPAL DE AÇÃO (CTA DESTAQUE ALTAMENTE VISÍVEL) */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={onSubmitCase}
                disabled={!anamnesisText.trim() || isGenerating}
                className="w-full sm:w-[380px] h-[46px] bg-[#4F46E5] hover:bg-[#3730A3] active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group font-sans"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processando Raciocínio Clínico...</span>
                  </>
                ) : (
                  <>
                    <span>Gerar Diagnósticos Diferenciais</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
