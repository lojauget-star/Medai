import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Search, Filter, PlusCircle, Calendar, User, 
  FileText, Sparkles, ChevronDown, ChevronUp, Printer, Send, 
  Trash2, ExternalLink, BookOpen, Stethoscope, ArrowRight, Copy, Check, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, getCurrentUser, collection, query, where, getDocs, deleteDoc, doc } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Report } from '../types';

interface CasesWorkspaceProps {
  onSelectReport: (report: Report) => void;
  onNewCase: () => void;
  onToggleMenu?: () => void;
}

export default function CasesWorkspace({ onSelectReport, onNewCase, onToggleMenu }: CasesWorkspaceProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState<string>('Todos');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load cases from Firestore + LocalStorage sync
  const fetchCases = async () => {
    setLoading(true);
    const currentUser = getCurrentUser();
    let firebaseCases: Report[] = [];

    if (currentUser) {
      try {
        const q = query(
          collection(db, 'reports'),
          where('ownerId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q).catch((err) => {
          handleFirestoreError(err, OperationType.LIST, 'reports');
          return null as any;
        });

        if (snapshot) {
          firebaseCases = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as Report));
        }
      } catch (err) {
        console.error("Erro ao buscar casos do Firestore:", err);
      }
    }

    // Merge with localStorage backup cases if any exist
    try {
      const localRaw = localStorage.getItem('vetmind_saved_reports');
      if (localRaw) {
        const localCases: Report[] = JSON.parse(localRaw);
        const existingIds = new Set(firebaseCases.map(c => c.id));
        localCases.forEach(lc => {
          if (lc.id && !existingIds.has(lc.id)) {
            firebaseCases.push(lc);
          }
        });
      }
    } catch (e) {
      console.error("Erro ao ler backup local de casos:", e);
    }

    // Sort by createdAt descending
    firebaseCases.sort((a, b) => {
      const tA = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : (a.createdAt || 0);
      const tB = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : (b.createdAt || 0);
      return tB - tA;
    });

    setReports(firebaseCases);
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Delete Case function
  const handleDeleteCase = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja remover este caso clínico do histórico?")) return;

    setDeletingId(caseId);
    try {
      if (caseId) {
        const docRef = doc(db, 'reports', caseId);
        await deleteDoc(docRef).catch(() => {});
      }

      // Update local storage backup
      const localRaw = localStorage.getItem('vetmind_saved_reports');
      if (localRaw) {
        const localCases: Report[] = JSON.parse(localRaw);
        const filtered = localCases.filter(c => c.id !== caseId);
        localStorage.setItem('vetmind_saved_reports', JSON.stringify(filtered));
      }

      setReports(prev => prev.filter(r => r.id !== caseId));
      triggerToast('Caso removido com sucesso!');
    } catch (err) {
      console.error("Erro ao deletar caso:", err);
      alert("Erro ao remover caso do banco de dados.");
    } finally {
      setDeletingId(null);
    }
  };

  // Generate Print / PDF
  const handlePrintCase = (report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    const vetName = localStorage.getItem("vetmind_signature_name") || "Dr. André Eguchi";
    const crmv = localStorage.getItem("vetmind_signature_crmv") || "CRMV-SP 14892";
    const patientName = report.patientId || "Paciente";

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Prontuário - ${patientName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
            .header-bar { border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .clinic-title { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
            .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .patient-card strong { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
            .section-box { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            .section-title { font-size: 12px; font-weight: 800; color: #4f46e5; text-transform: uppercase; margin-bottom: 6px; }
            .section-content { font-size: 12px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; }
            .footer { margin-top: 40px; border-top: 2px solid #0f172a; padding-top: 16px; text-align: right; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h2 class="clinic-title">CLÍNICA VETERINÁRIA VETMIND</h2>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Prontuário de Atendimento Clínico e Diagnóstico</p>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <strong>${vetName}</strong><br/>
              <span>${crmv}</span>
            </div>
          </div>

          <div class="patient-card">
            <div>
              <strong>Paciente</strong>
              <span style="font-weight: 800; font-size: 13px;">${patientName}</span>
            </div>
            <div>
              <strong>Espécie / Raça</strong>
              <span>${report.patientSpecies || 'Não informada'} • ${report.patientBreed || 'SRD'}</span>
            </div>
            <div>
              <strong>Peso / Sexo</strong>
              <span>${report.patientWeight || '--'} kg • ${report.patientSex || 'N/I'}</span>
            </div>
          </div>

          <div class="section-box">
            <div class="section-title">Anamnese / Histórico Clínico</div>
            <div class="section-content">${report.anamnesis || 'Não informado'}</div>
          </div>

          ${report.examData ? `
            <div class="section-box">
              <div class="section-title">Exames e Sinais Físicos</div>
              <div class="section-content">${report.examData}</div>
            </div>
          ` : ''}

          <div class="section-box">
            <div class="section-title">Avaliação SOAP e Raciocínio Clínico IA</div>
            <div class="section-content">${report.soapContent || 'Conteúdo não gerado.'}</div>
          </div>

          ${report.prescription ? `
            <div class="section-box">
              <div class="section-title">Prescrição e Conduta Terapêutica</div>
              <div class="section-content">${report.prescription}</div>
            </div>
          ` : ''}

          <div class="footer">
            Assinado Digitalmente por: <strong>${vetName}</strong> (${crmv})
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      triggerToast('📄 Janela de impressão/PDF gerada!');
    }
  };

  // WhatsApp to Tutor
  const handleSendWhatsApp = (report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    const vetName = localStorage.getItem("vetmind_signature_name") || "Dr. André Eguchi";
    const patientName = report.patientId || "Paciente";

    let msg = `Olá! 🐾\n\n`;
    msg += `Aqui é do atendimento veterinário do(a) *${patientName}* com o(a) *${vetName}*.\n\n`;
    msg += `📄 *Resumo do Atendimento Clínico*\n`;
    msg += `_Espécie:_ ${report.patientSpecies || 'Não informada'} (${report.patientBreed || 'SRD'})\n\n`;
    msg += `🔹 *Orientações Médicas:*\n${report.prescription || report.soapContent.slice(0, 300) + '...'}\n\n`;
    msg += `Qualquer dúvida ou alteração clínica, entre em contato conosco!\n\n`;
    msg += `Atenciosamente,\n*${vetName}*`;

    navigator.clipboard.writeText(msg);

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    triggerToast('💬 Resumo copiado e WhatsApp aberto para envio!');
  };

  // Filter cases
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      (r.patientId || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.patientSpecies || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.patientBreed || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.anamnesis || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.soapContent || '').toLowerCase().includes(search.toLowerCase());

    const matchesSpecies = selectedSpeciesFilter === 'Todos' || r.patientSpecies === selectedSpeciesFilter;

    return matchesSearch && matchesSpecies;
  });

  const totalCases = reports.length;
  const totalCanine = reports.filter(r => r.patientSpecies === 'Canino').length;
  const totalFeline = reports.filter(r => r.patientSpecies === 'Felino').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12">
      {/* Toast Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-[#4F46E5]" />
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight font-display">
              Casos Clínicos & Prontuários
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-normal">
            Histórico completo de atendimentos, análises diagnósticas e laudos sincronizados na nuvem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewCase}
            className="px-6 py-3.5 bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs rounded-full shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Analisar Novo Caso</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Casos</p>
            <p className="text-2xl font-extrabold text-[#0F172A]">{totalCases}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caninos</p>
            <p className="text-2xl font-extrabold text-[#0F172A]">{totalCanine}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Felinos</p>
            <p className="text-2xl font-extrabold text-[#0F172A]">{totalFeline}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sincronização</p>
            <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mt-1">Nuvem Ativa</p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar por paciente, sintoma ou raça..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium focus:outline-none focus:border-[#4F46E5] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Espécie:</span>
          {['Todos', 'Canino', 'Felino', 'Outros'].map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSpeciesFilter(sp)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedSpeciesFilter === sp
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-16 bg-slate-50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 text-[#4F46E5] rounded-3xl flex items-center justify-center mx-auto border border-indigo-100">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-lg font-bold text-[#0F172A]">Nenhum caso clínico encontrado</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                {search || selectedSpeciesFilter !== 'Todos'
                  ? 'Nenhum resultado corresponde aos filtros aplicados. Tente ajustar sua busca.'
                  : 'Inicie uma nova análise clínica para gerar laudos SOAP e diagnósticos salvos automaticamente no seu banco de dados.'}
              </p>
            </div>
            <button
              onClick={onNewCase}
              className="px-8 py-3 bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs rounded-full shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Analisar Novo Caso Agora</span>
            </button>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isExpanded = expandedCaseId === report.id;
            const formattedDate = (report.createdAt as any)?.seconds
              ? new Date((report.createdAt as any).seconds * 1000).toLocaleDateString('pt-BR')
              : report.createdAt
                ? new Date(report.createdAt).toLocaleDateString('pt-BR')
                : 'Data recente';

            return (
              <motion.div
                key={report.id || Math.random()}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all p-6 space-y-5 relative group"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4F46E5] flex items-center justify-center shrink-0 font-black text-lg">
                      {report.patientSpecies === 'Felino' ? '🐱' : (report.patientSpecies === 'Canino' ? '🐶' : '🐾')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
                          {report.patientId || 'Paciente sem nome'}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          {report.status === 'finalized' ? 'Prontuário Concluído' : 'Em Análise'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                        <span>{report.patientSpecies || 'Não informada'} • {report.patientBreed || 'SRD'}</span>
                        <span>•</span>
                        <span>{report.patientWeight ? `${report.patientWeight} kg` : ''}</span>
                        <span>•</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formattedDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectReport(report)}
                      className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Abrir no editor de prontuário"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Abrir Caso</span>
                    </button>

                    <button
                      onClick={(e) => handlePrintCase(report, e)}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full border border-slate-200 transition-colors cursor-pointer"
                      title="Gerar PDF para Impressão"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleSendWhatsApp(report, e)}
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200 transition-colors cursor-pointer"
                      title="Enviar ao WhatsApp do Tutor"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => report.id && handleDeleteCase(report.id, e)}
                      disabled={deletingId === report.id}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Excluir Caso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Anamnesis & Findings Summary */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Queixa Principal & Anamnese:
                  </span>
                  <p className="text-xs text-slate-700 font-normal leading-relaxed line-clamp-2 italic">
                    "{report.anamnesis || 'Anamnese não detalhada'}"
                  </p>
                </div>

                {/* Accordion Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {report.sources && report.sources.length > 0 && (
                      <span className="px-2.5 py-1 bg-indigo-50 text-[#4F46E5] text-[10px] font-semibold rounded-lg flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {report.sources.length} Fontes RAG
                      </span>
                    )}
                    {report.prescription && (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded-lg flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Com Prescrição
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedCaseId(isExpanded ? null : (report.id || Math.random().toString()))}
                    className="text-xs font-semibold text-[#4F46E5] hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Ocultar Raciocínio Clínico' : 'Ver SOAP Completo'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expandable Accordion Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-slate-100 pt-4 space-y-4"
                    >
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-[#4F46E5]" />
                          Análise Diagnóstica & SOAP
                        </h4>
                        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {report.soapContent}
                        </div>
                      </div>

                      {report.prescription && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Prescrição Terapêutica
                          </h4>
                          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl text-xs text-purple-950 whitespace-pre-wrap">
                            {report.prescription}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => onSelectReport(report)}
                          className="px-5 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-full hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Abrir e Editar no Estúdio Clínico</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
