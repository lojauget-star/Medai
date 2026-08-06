import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  ListChecks,
  Plus,
  Trash2,
  Copy,
  Pill,
  MessageSquare,
  FileText,
  ChevronDown,
  Sparkles,
  Clock,
  ArrowRight,
  Stethoscope,
  X,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ChecklistStep {
  id: string;
  category: "exam" | "treatment" | "monitoring" | "tutor";
  title: string;
  description?: string;
  completed: boolean;
  priority: "high" | "medium" | "normal";
}

interface ClinicalNextStepsChecklistProps {
  soapRaw?: string;
  differentialsRaw?: string;
  patientName?: string;
  onOpenPrescription?: () => void;
  onOpenTutorMessage?: () => void;
}

export default function ClinicalNextStepsChecklist({
  soapRaw,
  differentialsRaw,
  patientName,
  onOpenPrescription,
  onOpenTutorMessage,
}: ClinicalNextStepsChecklistProps) {
  // Generate initial steps based on the clinical case
  const [steps, setSteps] = useState<ChecklistStep[]>(() => {
    const initialSteps: ChecklistStep[] = [];

    // Parse exams from differentials/SOAP
    let exam1 = "Solicitar Raio-X ou Ultrassonografia de confirmação";
    let exam2 = "Realizar Hemograma Completo e Perfil Renal/Hepático";

    if (differentialsRaw) {
      if (differentialsRaw.toLowerCase().includes("ruptura") || differentialsRaw.toLowerCase().includes("ligamento") || differentialsRaw.toLowerCase().includes("joelho")) {
        exam1 = "Raio-X ortogonal de joelho (Posicionamento sob sedação leve)";
        exam2 = "Avaliação gaveta/compressão tibial e citologia do líquido sinovial";
      } else if (differentialsRaw.toLowerCase().includes("piometra") || differentialsRaw.toLowerCase().includes("uter")) {
        exam1 = "Ultrassonografia abdominal focada em útero e ovários";
        exam2 = "Hemograma completo (Avaliação de leucocitose com desvio) + Creatinina";
      } else if (differentialsRaw.toLowerCase().includes("diabete") || differentialsRaw.toLowerCase().includes("glicem")) {
        exam1 = "Curva glicêmica seriada T-2h e Dosagem de Frutosamina";
        exam2 = "Urinálise com fita reativa (Glicosúria/Cetonúria) e Hemograma";
      }
    }

    initialSteps.push(
      {
        id: "step-exam-1",
        category: "exam",
        title: exam1,
        description: "Confirmação e exclusão de diferenciais de alta probabilidade",
        completed: false,
        priority: "high",
      },
      {
        id: "step-exam-2",
        category: "exam",
        title: exam2,
        description: "Mapeamento metabólico e pré-procedimento clínico",
        completed: false,
        priority: "high",
      },
      {
        id: "step-treat-1",
        category: "treatment",
        title: "Iniciar protocolo de analgesia e suporte de emergência",
        description: "Administrar medicação conforme peso do paciente",
        completed: false,
        priority: "high",
      },
      {
        id: "step-treat-2",
        category: "treatment",
        title: "Restrição de movimentação e repouso em ambiente controlado",
        description: "Evitar pisos escorregadios e exercícios ativos",
        completed: false,
        priority: "medium",
      },
      {
        id: "step-mon-1",
        category: "monitoring",
        title: "Aferir parâmetros vitais (Temp, FC, FR, TRC) a cada 8h - 12h",
        description: "Monitorar aparecimento de picos febris ou prostração",
        completed: false,
        priority: "normal",
      },
      {
        id: "step-tutor-1",
        category: "tutor",
        title: "Orientar o tutor e enviar resumo do atendimento no WhatsApp",
        description: "Explicar a conduta e os sinais de alerta de emergência",
        completed: false,
        priority: "normal",
      }
    );

    return initialSteps;
  });

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ChecklistStep["category"]>("exam");
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const deleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddCustomStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newStepItem: ChecklistStep = {
      id: "step-custom-" + Date.now(),
      category: newCategory,
      title: newTitle.trim(),
      description: "Conduta personalizada adicionada pelo veterinário",
      completed: false,
      priority: "medium",
    };

    setSteps((prev) => [...prev, newStepItem]);
    setNewTitle("");
    setShowAddForm(false);
  };

  const handleCopyExamsList = () => {
    const examSteps = steps.filter((s) => s.category === "exam");
    if (examSteps.length === 0) return;

    const formattedText = `📋 SOLICITAÇÃO DE EXAMES COMPLEMENTARES\nPaciente: ${
      patientName || "Paciente"
    }\nData: ${new Date().toLocaleDateString("pt-BR")}\n\n${examSteps
      .map((s, i) => `${i + 1}. ${s.title}${s.description ? ` (${s.description})` : ""}`)
      .join("\n")}\n\nVetmind Assistente Clínico Veterinário`;

    navigator.clipboard.writeText(formattedText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const getCategoryBadge = (cat: ChecklistStep["category"]) => {
    switch (cat) {
      case "exam":
        return {
          label: "Exames",
          color: "bg-purple-50 text-purple-700 border-purple-100",
          icon: Stethoscope,
        };
      case "treatment":
        return {
          label: "Estabilização",
          color: "bg-emerald-50 text-emerald-700 border-emerald-100",
          icon: Pill,
        };
      case "monitoring":
        return {
          label: "Monitoramento",
          color: "bg-amber-50 text-amber-700 border-amber-100",
          icon: Clock,
        };
      case "tutor":
        return {
          label: "Comunicação",
          color: "bg-blue-50 text-blue-700 border-blue-100",
          icon: MessageSquare,
        };
    }
  };

  return (
    <div className="space-y-4 w-full text-left font-sans">
      {/* Workflow Progress Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100/80 shadow-3xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Progresso do Roteiro
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                progressPercent === 100
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-indigo-50 text-indigo-700"
              }`}
            >
              {completedCount}/{steps.length} Concluídos ({progressPercent}%)
            </span>
          </div>

          <button
            onClick={handleCopyExamsList}
            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-purple-100"
            title="Copiar lista de exames solicitados"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedNotification ? "Copiado!" : "Copiar Pedido Exames"}</span>
          </button>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full transition-all rounded-full ${
              progressPercent === 100
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-indigo-500 to-purple-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {progressPercent === 100 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Parabéns! Todas as condutas do roteiro clínico foram concluídas com sucesso.</span>
          </motion.div>
        )}
      </div>

      {/* Checklist Items List */}
      <div className="space-y-2">
        <AnimatePresence>
          {steps.map((step) => {
            const catBadge = getCategoryBadge(step.category);
            const CategoryIcon = catBadge.icon;

            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  step.completed
                    ? "bg-slate-50/60 border-slate-100/60 opacity-80"
                    : "bg-white border-slate-100 shadow-2xs hover:shadow-xs hover:border-indigo-100"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors shrink-0"
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500" />
                    )}
                  </button>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 border ${catBadge.color}`}
                      >
                        <CategoryIcon className="w-2.5 h-2.5" />
                        {catBadge.label}
                      </span>

                      {step.priority === "high" && !step.completed && (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[8px] font-black uppercase tracking-wider">
                          Prioridade
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs font-bold leading-snug transition-all ${
                        step.completed
                          ? "line-through text-slate-400"
                          : "text-slate-800"
                      }`}
                    >
                      {step.title}
                    </p>

                    {step.description && (
                      <p className="text-[10px] text-slate-450 font-medium leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteStep(step.id)}
                  className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Remover passo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quick Action Navigation Bar & Add Step Form */}
      <div className="pt-2 space-y-2">
        {!showAddForm ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 text-indigo-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Passo ao Roteiro</span>
            </button>

            <div className="flex items-center gap-1.5">
              {onOpenPrescription && (
                <button
                  onClick={onOpenPrescription}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Ir p/ Prescrição</span>
                </button>
              )}

              {onOpenTutorMessage && (
                <button
                  onClick={onOpenTutorMessage}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar ao Tutor</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleAddCustomStep}
            className="p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-sm space-y-3 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">
                Novo Passo do Roteiro Clínico
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as ChecklistStep["category"])
                }
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="exam">🧪 Exames</option>
                <option value="treatment">💉 Estabilização</option>
                <option value="monitoring">🩺 Monitoramento</option>
                <option value="tutor">💬 Comunicação</option>
              </select>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Coletar urina por cistocentese para microbiológico..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-400"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider"
              >
                Salvar Passo
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
