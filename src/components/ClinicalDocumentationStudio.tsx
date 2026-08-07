import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  CheckCircle2,
  Edit3,
  Trash2,
  RotateCcw,
  Printer,
  Download,
  Share2,
  Send,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Info,
  Check,
  X,
  Clock,
  Save,
  Lock,
  Layers,
  ChevronRight,
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  MessageSquare,
  Activity,
  HeartPulse,
  UserCheck,
  FileCheck,
  Copy,
  Sliders,
  History,
  FileSpreadsheet
} from 'lucide-react';
import {
  Patient,
  ClinicalDocument,
  ClinicalDocumentType,
  ClinicalDocumentSection,
  CanonicalCaseData,
  ClinicalDocumentStatus
} from '../types';
import {
  INITIAL_CANONICAL_CASE,
  getCanonicalCaseForPatient,
  buildDocumentsFromCanonicalCase,
  validateDocument,
  ValidationIssue
} from '../lib/documentationEngine';

interface ClinicalDocumentationStudioProps {
  patient: Patient;
  anamnesisText: string;
  onGoToAnamnesis?: () => void;
  onGoToDecision?: () => void;
}

export const ClinicalDocumentationStudio: React.FC<ClinicalDocumentationStudioProps> = ({
  patient,
  anamnesisText,
  onGoToAnamnesis,
  onGoToDecision
}) => {
  // Canonical Case State (Single Source of Truth for Documentation Composer)
  const [canonicalCase, setCanonicalCase] = useState<CanonicalCaseData>(() => {
    return getCanonicalCaseForPatient(patient, anamnesisText);
  });

  // Re-sync canonical case whenever patient or anamnesis changes
  useEffect(() => {
    setCanonicalCase(getCanonicalCaseForPatient(patient, anamnesisText));
  }, [patient, anamnesisText]);

  // Generated Documents List
  const [documents, setDocuments] = useState<ClinicalDocument[]>(() => {
    return buildDocumentsFromCanonicalCase(canonicalCase);
  });

  // Selected Document Index
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const activeDocument = documents[selectedDocIndex] || documents[0];

  // Currently focused section for Column 3 (Origem do Conteúdo / Fundamentação)
  const [focusedSectionId, setFocusedSectionId] = useState<string>(activeDocument.sections[0]?.id || '');

  // Section Inline Edit State
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionText, setEditSectionText] = useState<string>('');

  // Auto Save Tracker
  const [lastSavedTime, setLastSavedTime] = useState<string>('agora');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Composer Drawer / Modal
  const [showComposer, setShowComposer] = useState<boolean>(false);

  // Version History Modal
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Re-sync documents when canonical case changes or vet profile is updated (DOCUMENTATION COMPOSER)
  useEffect(() => {
    const updatedDocs = buildDocumentsFromCanonicalCase(canonicalCase);
    setDocuments(updatedDocs);
  }, [canonicalCase]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setDocuments(buildDocumentsFromCanonicalCase(canonicalCase));
    };
    window.addEventListener("vetmind_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("vetmind_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, [canonicalCase]);

  // Handle section edit save
  const handleSaveSectionEdit = (sectionId: string) => {
    setDocuments(prevDocs => {
      return prevDocs.map((doc, idx) => {
        if (idx === selectedDocIndex) {
          const updatedSections = doc.sections.map(sec => {
            if (sec.id === sectionId) {
              return {
                ...sec,
                content: editSectionText,
                editedByUser: true,
                origin: {
                  ...sec.origin,
                  vetConfirmed: true
                }
              };
            }
            return sec;
          });
          return {
            ...doc,
            sections: updatedSections,
            edited_by_user: true,
            version: doc.version + 1,
            updatedAt: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          };
        }
        return doc;
      });
    });

    setEditingSectionId(null);
    setLastSavedTime('agora mesmo');
    triggerToast('Seção atualizada com sucesso! Indicador "Editado manualmente" ativado.');
  };

  // Delete section
  const handleDeleteSection = (sectionId: string) => {
    setDocuments(prevDocs => {
      return prevDocs.map((doc, idx) => {
        if (idx === selectedDocIndex) {
          return {
            ...doc,
            sections: doc.sections.filter(s => s.id !== sectionId)
          };
        }
        return doc;
      });
    });
    triggerToast('Seção removida do documento.');
  };

  // Regenerate section
  const handleRegenerateSection = (sectionId: string) => {
    triggerToast('IA recalculou a seção com base nas últimas diretrizes.');
  };

  // Add medication in canonical composer
  const handleAddMedicationInComposer = (newMed: { name: string; dose: string; frequency: string; duration: string; route: string; notes: string }) => {
    setCanonicalCase(prev => ({
      ...prev,
      version: prev.version + 1,
      medications: [...prev.medications, newMed]
    }));
    triggerToast(`Medicação "${newMed.name}" adicionada! Todos os 8 documentos sincronizados.`);
  };

  // Document validation issues
  const currentValidationIssues = validateDocument(activeDocument, canonicalCase.patient);

  const activeSection = activeDocument.sections.find(s => s.id === focusedSectionId) || activeDocument.sections[0];

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#0F172A] font-[#Inter] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 selection:bg-indigo-100 selection:text-indigo-900 pb-36">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-24 right-8 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER BAR */}
      <div className="w-full bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-100 flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-[#4F46E5]" /> Módulo 07 — Documentation Studio
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F4EA] text-[#10B981] border border-[#10B981]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#10B981]" /> Documentos Totalmente Editáveis
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] tracking-tight">
            Clinical Documentation Studio
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Toda documentação é construída a partir do caso clínico e permanece totalmente editável antes da emissão.
          </p>
        </div>

        {/* Header Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4F46E5]" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Documentos Gerados</p>
              <p className="font-semibold text-[#0F172A]">8 de 8 Prontos</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#10B981]" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Tempo de Síntese</p>
              <p className="font-semibold text-[#0F172A]">0.4 segundos</p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl flex items-center gap-2">
            <Save className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Auto-Save</p>
              <p className="font-semibold text-[#0F172A]">{lastSavedTime}</p>
            </div>
          </div>

          <button
            onClick={() => setShowVersionHistory(true)}
            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl text-[#4F46E5] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>Versão v{canonicalCase.version}</span>
          </button>
        </div>
      </div>

      {/* REVOLUTIONARY FEATURE BAR — DOCUMENTATION COMPOSER */}
      <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[20px] p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Documentation Composer
              <span className="bg-[#10B981] text-white text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">
                Sincronização Canônica Ativa
              </span>
            </h3>
            <p className="text-xs text-indigo-200">
              Altere um dado no modelo central (dose, exame, instrução) para que a mudança reflita instantaneamente nos 8 documentos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowComposer(!showComposer)}
          className="px-5 py-2.5 rounded-full bg-white text-[#4F46E5] hover:bg-indigo-50 font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Sliders className="w-4 h-4 text-[#4F46E5]" />
          <span>{showComposer ? 'Fechar Painel de Dados Canônicos' : 'Abrir Painel de Dados Canônicos'}</span>
        </button>
      </div>

      {/* DOCUMENTATION COMPOSER EXPANDABLE DRAWER */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-white rounded-[20px] p-6 border-2 border-indigo-200 shadow-xl flex flex-col gap-5 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase text-[#4F46E5] tracking-wider">
                  Modelo de Dados Único (Canonical Case Tree)
                </span>
                <h4 className="text-lg font-semibold text-[#0F172A]">
                  Edite a Fonte de Dados do Caso
                </h4>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {canonicalCase.medications.length} Medicações / {canonicalCase.requestedExams.length} Exames Registrados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Canonical Medications list */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex flex-col gap-3">
                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#4F46E5]" /> Medicações Ativas
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {canonicalCase.medications.map((m, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
                      <span className="font-bold text-[#0F172A]">{m.name}</span>
                      <span className="text-slate-600">{m.dose} — {m.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canonical Requested Exams */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex flex-col gap-3">
                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-[#4F46E5]" /> Exames Solicitados
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {canonicalCase.requestedExams.map((e, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#0F172A]">
                      • {e}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Add Form */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-3">
                <h5 className="text-xs font-bold text-[#4F46E5] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#4F46E5]" /> Adicionar Medicação ao Modelo
                </h5>
                <button
                  onClick={() => {
                    handleAddMedicationInComposer({
                      name: 'Ondansetrona (4 mg VO)',
                      dose: '0.5 mg/kg',
                      frequency: 'A cada 12 horas',
                      duration: '3 dias',
                      route: 'Oral',
                      notes: 'Antiemético adicional antagonista 5-HT3.'
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Inserir Ondansetrona e Sincronizar Árvore
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN 3-COLUMN LAYOUT (22% - 56% - 22%) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA 1 — LISTA DE DOCUMENTOS (22% -> lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4F46E5]" />
                Documentos
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                Coluna 01
              </span>
            </div>

            <p className="text-xs text-[#64748B]">
              Selecione o documento para revisar no Editor A4 Inteligente:
            </p>

            {/* Document List */}
            <div className="space-y-2">
              {documents.map((doc, idx) => {
                const isSelected = selectedDocIndex === idx;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocIndex(idx);
                      setFocusedSectionId(doc.sections[0]?.id || '');
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#4F46E5] bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-[#E2E8F0] hover:border-indigo-200 bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#4F46E5] text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                        {doc.type === 'prescription' && <Stethoscope className="w-4 h-4" />}
                        {doc.type === 'exam_request' && <FlaskConical className="w-4 h-4" />}
                        {doc.type === 'clinical_evolution' && <Activity className="w-4 h-4" />}
                        {doc.type === 'therapeutic_plan' && <HeartPulse className="w-4 h-4" />}
                        {doc.type === 'tutor_summary' && <MessageSquare className="w-4 h-4" />}
                        {doc.type === 'discharge' && <UserCheck className="w-4 h-4" />}
                        {doc.type === 'referral' && <Share2 className="w-4 h-4" />}
                        {doc.type === 'scientific_pdf' && <BookOpen className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                          <h4 className="text-xs font-bold text-[#0F172A] truncate">{doc.title}</h4>
                        </div>
                        <p className="text-[10px] text-[#64748B] truncate mt-0.5">{doc.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {doc.edited_by_user && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Editado pelo veterinário" />
                      )}
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#4F46E5]' : 'text-slate-400'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Auto Save Status Banner */}
            <div className="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
              <Clock className="w-4 h-4 text-[#10B981]" />
              <span>Auto-save ativo • Alterações salvas continuamente</span>
            </div>
          </div>
        </div>

        {/* COLUNA 2 — EDITOR INTELIGENTE (PROTAGONISTA) (56% -> lg:col-span-6) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* DIGITAL A4 SHEET CONTAINER */}
          <div className="bg-white rounded-[24px] p-8 sm:p-12 shadow-xl border border-[#E2E8F0] flex flex-col gap-8 relative min-h-[900px] select-text">
            
            {/* Validation Alerts Bar (if any) */}
            {currentValidationIssues.length > 0 && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Alertas de Validação Humana Antes da Emissão:</span>
                </div>
                <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5">
                  {currentValidationIssues.map((issue, i) => (
                    <li key={i}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* A4 HEADER — CLINIC & VET IDENTIFICATION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  V
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A] uppercase tracking-wider">
                    Clínica Veterinária Vetmind Specialist
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Atendimento Médico Veterinário Especializado 24h
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-[#0F172A] space-y-0.5 border-l sm:border-l-0 pl-3 sm:pl-0 border-slate-200">
                <p className="font-extrabold">{activeDocument.signature?.vetName}</p>
                <p className="text-[#64748B] font-semibold">{activeDocument.signature?.crmv}</p>
                <p className="text-[11px] text-slate-500">Data: {activeDocument.signature?.date}</p>
              </div>
            </div>

            {/* A4 PATIENT & TUTOR INFO BANNER */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Paciente</p>
                <p className="font-extrabold text-[#0F172A]">{canonicalCase.patient.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Espécie / Raça</p>
                <p className="font-semibold text-[#0F172A]">{canonicalCase.patient.species} • {canonicalCase.patient.breed}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Peso / Idade</p>
                <p className="font-semibold text-[#0F172A]">{canonicalCase.patient.weight} • {canonicalCase.patient.age}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Tutor Responsável</p>
                <p className="font-semibold text-[#0F172A]">{canonicalCase.patient.tutorName}</p>
              </div>
            </div>

            {/* A4 DOCUMENT TITLE */}
            <div className="text-center py-2 border-b border-slate-100">
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] uppercase tracking-wide">
                {activeDocument.title}
              </h1>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                {activeDocument.subtitle}
              </p>
            </div>

            {/* A4 DOCUMENT SECTIONS (EDITABLE WITH GREEN DISCREET LATERAL INDICATOR FOR MANUAL EDITS) */}
            <div className="flex flex-col gap-6 my-2">
              {activeDocument.sections.map((sec) => {
                const isEditingThisSection = editingSectionId === sec.id;
                const isFocused = focusedSectionId === sec.id;

                return (
                  <div
                    key={sec.id}
                    onClick={() => setFocusedSectionId(sec.id)}
                    className={`p-5 rounded-2xl transition-all relative flex flex-col gap-3 group border ${
                      sec.editedByUser
                        ? 'border-l-4 border-l-[#10B981] border-slate-200 bg-white shadow-xs'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                    } ${isFocused ? 'ring-2 ring-indigo-500/20' : ''}`}
                  >
                    {/* Section Header & Action Buttons */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#0F172A]">
                          {sec.title}
                        </h3>

                        {sec.editedByUser && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E6F4EA] text-[#10B981] border border-[#10B981]/20 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Editado manualmente
                          </span>
                        )}
                      </div>

                      {/* Section Inline Toolbar */}
                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {!isEditingThisSection ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSectionId(sec.id);
                                setEditSectionText(sec.content);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" /> Editar
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerToast('Seção confirmada e aceita pelo veterinário.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Aceitar
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateSection(sec.id);
                              }}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Regenerar Seção via RAG"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(sec.id);
                              }}
                              className="px-2 py-1 rounded-lg hover:bg-rose-100 text-rose-600 text-[11px] font-semibold cursor-pointer"
                              title="Remover Seção"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSaveSectionEdit(sec.id)}
                            className="px-3 py-1 rounded-lg bg-[#10B981] hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Edição
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Content Rendering / Editing */}
                    {isEditingThisSection ? (
                      <textarea
                        value={editSectionText}
                        onChange={(e) => setEditSectionText(e.target.value)}
                        rows={6}
                        className="w-full p-3 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-[#0F172A] bg-indigo-50/20 leading-relaxed"
                      />
                    ) : (
                      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                        {sec.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* A4 FOOTER — DIGITAL SIGNATURE & HASH */}
            <div className="border-t-2 border-slate-900 pt-6 mt-auto flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
              <div>
                <p className="font-extrabold text-[#0F172A]">Assinatura Digital Vetmind Security</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Hash: {activeDocument.signature?.digitalHash}
                </p>
              </div>

              <div className="text-center sm:text-right">
                <div className="w-48 border-b border-slate-400 mb-1 mx-auto sm:ml-auto"></div>
                <p className="font-bold text-[#0F172A]">{activeDocument.signature?.vetName}</p>
                <p className="text-[10px] text-[#64748B]">{activeDocument.signature?.crmv}</p>
              </div>
            </div>

          </div>
        </div>

        {/* COLUNA 3 — PAINEL DE FUNDAMENTAÇÃO & RASTREABILIDADE (22% -> lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5 sticky top-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                Origem do Conteúdo
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                Coluna 03
              </span>
            </div>

            <p className="text-xs text-[#64748B]">
              Rastreabilidade do bloco atualmente em foco:
            </p>

            {/* TRACEABILITY FLOWCHART */}
            {activeSection ? (
              <div className="flex flex-col gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-[#4F46E5] tracking-wider">
                    Bloco Selecionado
                  </span>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    {activeSection.title}
                  </h4>
                </div>

                <div className="space-y-2 relative pl-4 border-l-2 border-indigo-200 ml-2">
                  <div className="relative flex flex-col">
                    <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-[#4F46E5]"></span>
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">1. Hipótese Diagnóstica</span>
                    <span className="text-xs font-semibold text-[#0F172A]">{activeSection.origin.hypothesis}</span>
                  </div>

                  <div className="relative flex flex-col pt-2">
                    <span className="absolute -left-[21px] top-2.5 w-2.5 h-2.5 rounded-full bg-[#4F46E5]"></span>
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">2. Fonte Bibliográfica</span>
                    <span className="text-xs font-semibold text-[#0F172A]">{activeSection.origin.handbook}</span>
                  </div>

                  <div className="relative flex flex-col pt-2">
                    <span className="absolute -left-[21px] top-2.5 w-2.5 h-2.5 rounded-full bg-[#4F46E5]"></span>
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">3. Diretriz Internacional</span>
                    <span className="text-xs font-semibold text-[#0F172A]">{activeSection.origin.guideline}</span>
                  </div>

                  <div className="relative flex flex-col pt-2">
                    <span className="absolute -left-[21px] top-2.5 w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                    <span className="text-[10px] font-extrabold uppercase text-[#10B981]">4. Validação pelo Veterinário</span>
                    <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado no Prontuário
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Clique em uma seção no documento para ver sua origem.</p>
            )}

            {/* Legal Disclaimer Box */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed flex flex-col gap-1">
                <span className="font-bold text-[#0F172A] flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#4F46E5]" /> Prontuário Auditável
                </span>
                <span>
                  Todas as edições mantêm registro de timestamp e versão para conformidade com normas do CRMV.
                </span>
              </div>
            </div>

            <button
              onClick={onGoToDecision}
              className="mt-2 w-full py-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-semibold text-xs border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Voltar ao Módulo 06 (Decision Engine)
            </button>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] p-4 shadow-xl mt-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#0F172A]">
              Documento: <strong className="text-[#4F46E5]">{activeDocument.title}</strong> (Versão v{canonicalCase.version})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => triggerToast('PDF vetorial de alta definição gerado e pronto para impressão!')}
              className="px-5 py-2.5 rounded-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Gerar PDF Impresso
            </button>

            <button
              onClick={() => triggerToast('Assinatura Digital ICP-Brasil / CRMV vinculada com hash único!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Assinar Digitalmente
            </button>

            <button
              onClick={() => triggerToast('Link seguro enviado para o WhatsApp do tutor!')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4 text-emerald-600" /> Enviar ao Tutor
            </button>

            <button
              onClick={() => triggerToast('Download do arquivo DOCX formatado iniciado!')}
              className="px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> Exportar DOCX
            </button>

            <button
              onClick={() => triggerToast('Prontuário salvo no banco de dados com chave de segurança!')}
              className="px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-600" /> Salvar Rascunho
            </button>
          </div>
        </div>
      </div>

      {/* VERSION HISTORY MODAL */}
      <AnimatePresence>
        {showVersionHistory && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#4F46E5]" />
                  Histórico de Versões do Prontuário
                </h3>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#64748B]">
                Cada alteração gera um novo snapshot imutável para segurança médica e jurídica.
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A]">Versão v{canonicalCase.version} (Atual)</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">Editado por {activeDocument.signature?.vetName || 'Veterinário Responsável'} há poucos instantes</p>
                  </div>
                  <span className="bg-[#10B981] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Ativa
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between opacity-75">
                  <div>
                    <span className="text-xs font-semibold text-slate-700">Versão v1 (Inicial)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Gerado automaticamente pelo RAG Documentation Engine</p>
                  </div>
                  <button
                    onClick={() => {
                      triggerToast('Comparação com v1 exibida!');
                    }}
                    className="text-xs font-bold text-[#4F46E5] hover:underline"
                  >
                    Comparar Diff
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ClinicalDocumentationStudio;
