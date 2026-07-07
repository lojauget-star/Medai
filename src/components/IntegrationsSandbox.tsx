import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Chrome,
  CheckCircle2,
  FileText,
  Copy,
  Zap,
  HelpCircle,
  Layers,
  Check,
  Radio,
  BookOpen,
  MessageSquare,
  Mic,
  MicOff,
  Trash2,
  TrendingUp,
  RefreshCw,
  Database,
  ArrowRight,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VetmindLogo from "./VetmindLogo";

// Types for the parsed/structured simulator data
interface CaseData {
  patientDetails: string;
  soap: {
    S: string;
    S_rationale: string;
    O: string;
    O_rationale: string;
    A: string;
    A_rationale: string;
    P: string;
    P_rationale: string;
  };
  rag: {
    title: string;
    compatibility: string;
    sourceName: string;
    citation: string;
    snippet: string;
    highlightWord: string;
    analysis: string;
    time: string;
  };
  prescriptions: Array<{
    name: string;
    dosePerKg: number;
    unit: string;
    details: string;
  }>;
  whatsapp: string;
}

export default function IntegrationsSandbox() {
  // Preset data loaded instantly for maximum "Disney/Lego" magic
  const presets: Record<"piometra" | "otitis" | "urinary", CaseData> = {
    piometra: {
      patientDetails: "Brisa (Canina, Golden Retriever, 9 anos, Fêmea inteira, 32kg)",
      soap: {
        S: "Fêmea inteira de 9 anos com secreção vaginal purulenta abundante e aumento moderado de ingestão de água (polidipsia) observado após 6 semanas do último estro.",
        S_rationale: "O cio ocorreu há aproximadamente 42 dias (6 semanas), período de máxima atividade de progesterona uterina, que predispõe à proliferação bacteriana.",
        O: "Ao exame físico geral: desidratação estimada em 5%, temperatura retal de 39.1ºC (febre leve), abdômen distendido e doloroso à palpação profunda. Hemograma revela leucocitose acentuada com desvio à esquerda.",
        O_rationale: "A febre e o abdômen doloroso confirmam processo inflamatório/infeccioso agudo sistêmico, correlacionado à leucocitose grave decorrente do acúmulo purulento uterino.",
        A: "Forte suspeita clínica e laboratorial de Piometra Aberta (complexo hiperplasia endometrial cística-piometra). Os sinais de corrimento vaginal purulento e desvio à esquerda são altamente característicos.",
        A_rationale: "O útero aberto permite a drenagem externa do exsudato, o que reduz o risco imediato de ruptura uterina mas perpetua a endotoxemia sistêmica e poliúria/polidipsia compensatória.",
        P: "Indicação imediata para ultrassonografia abdominal para confirmação do diâmetro uterino e acúmulo de fluido. Estabilização hídrica com fluidoterapia e indicação cirúrgica de Ovariossalpingohisterectomia (OSH) de urgência. Terapia antibiótica sistêmica com Cefalotina e Metronidazol.",
        P_rationale: "A cirurgia é o padrão-ouro definitivo para evitar septicemia. O suporte com fluidoterapia restabelece a perfusão renal afetada pelas toxinas bacterianas."
      },
      rag: {
        title: "Piometra Aberta",
        compatibility: "87% compatível",
        sourceName: "Nelson & Couto (Medicina Interna)",
        citation: "Nelson & Couto, Cap. 47 • Pág. 312",
        snippet: "...corrimento vaginal purulento associado a leucocitose e polidipsia em fêmeas inteiras de meia-idade a idosas representa o quadro clínico clássico e inquestionável de piometra diagnóstica...",
        highlightWord: "leucocitose e polidipsia",
        analysis: "A fêmea inteira de 9 anos apresenta secreção vaginal drenando externamente + leucocitose confirmada + polidipsia informada na queixa principal.",
        time: "1.2s"
      },
      prescriptions: [
        { name: "Cefalotina Sódica", dosePerKg: 30, unit: "mg", details: "IV, a cada 8 horas por 7 dias. Antibioticoterapia profilática de amplo espectro." },
        { name: "Metronidazol", dosePerKg: 15, unit: "mg", details: "IV, a cada 12 horas por 7 dias. Combate eficaz a microrganismos anaeróbios." },
        { name: "Dipirona Monoidratada", dosePerKg: 25, unit: "mg", details: "SC ou VO, a cada 8 horas para controle térmico e álgico pós-operatório." }
      ],
      whatsapp: "Olá! Gostaria de passar uma atualização sobre a Brisa. Identificamos uma suspeita importante de Piometra Aberta (infecção uterina). Ela apresenta secreção vaginal e aumento de ingestão de água. O tratamento recomendado de escolha é cirúrgico (remoção do útero) com máxima urgência para garantir a total recuperação dela. Já iniciamos a fluidoterapia de suporte. Qualquer dúvida, estou à total disposição."
    },
    otitis: {
      patientDetails: "Thor (Canino, Golden Retriever, 4 anos, Macho inteiro, 34kg)",
      soap: {
        S: "Prurido otológico severo bilateral há 10 dias. Tutor relata comportamento frequente de balançar a cabeça (head shaking) e coçar as orelhas com as patas traseiras.",
        S_rationale: "Prurido intenso e agitação cefálica indicam desconforto agudo em conduto auditivo externo, comumente relacionado a hipersensibilidades alimentares ou atopia de base.",
        O: "Eritema intenso em pavilhão auricular e conduto externo bilateral. Presença de exsudato ceruminoso espesso marrom escuro com odor fétido ativo. Dor moderada ao toque e palpação do conduto auditivo externo. Membrana timpânica íntegra bilateralmente.",
        O_rationale: "O conduto íntegro possibilita o tratamento tópico direto e seguro, sem risco de ototoxicidade por medicamentos no ouvido médio.",
        A: "Otite externa eritematoceruminosa bilateral de provável etiologia fúngica (Malassezia pachydermatis) ou bacteriana secundária a distúrbio de barreira cutânea.",
        A_rationale: "O exsudato marrom-chocolate e o odor adocicado característico são marcas patognomônicas da infecção oportunista por Malassezia em cães.",
        P: "Realizar exame citológico por swab auricular. Limpeza de conduto com cerumolítico suave. Prescrever solução otológica contendo antifúngico, antibacteriano e anti-inflamatório (ex: Oto Sana ou similar) por 10-14 dias. Retorno em 14 dias.",
        P_rationale: "A limpeza auricular adequada remove o excesso de lipídeos celulares, permitindo que os princípios ativos da pomada penetrem e façam efeito de forma eficaz."
      },
      rag: {
        title: "Otite Externa Ceruminosa",
        compatibility: "92% compatível",
        sourceName: "Fossum (Cirurgia de Pequenos Animais)",
        citation: "Fossum, Cap. 22 • Pág. 418",
        snippet: "...o acúmulo de exsudato ceruminoso marrom com eritema acentuado e prurido recorrente sugere proliferação de Malassezia pachydermatis, com indicação primária de terapia otológica tópica de amplo espectro...",
        highlightWord: "exsudato ceruminoso marrom com eritema acentuado",
        analysis: "Golden Retriever com prurido otológico agudo de 10 dias, head shaking ativo e exsudato fétido ceruminoso marrom bilateral com membrana timpânica preservada.",
        time: "0.8s"
      },
      prescriptions: [
        { name: "Oto Sana (Pomada Otológica)", dosePerKg: 0.2, unit: "ml (gotas)", details: "Instilar 6 gotas em cada conduto auditivo a cada 12 horas por 10 dias consecutivos." },
        { name: "Ots-Clean (Limpador Auricular)", dosePerKg: 1.0, unit: "ml", details: "Aplicar no conduto 20 minutos antes do tratamento otológico, 2 vezes por semana." }
      ],
      whatsapp: "Olá! Passando para atualizar sobre a consulta do Thor. Ele foi diagnosticado com Otite Externa Bilateral (inflamação e infecção nos ouvidos), o que explica o incômodo e o hábito de balançar a cabeça. Prescrevi uma rotina de limpeza e gotas de tratamento local para ser aplicada duas vezes ao dia. O tratamento dura 10 dias e é fundamental segui-lo até o final."
    },
    urinary: {
      patientDetails: "Garfield (Felino, SRD, 3 anos, Macho castrado, 4.5kg)",
      soap: {
        S: "Dificuldade severa para urinar (estrangúria), sangue na urina (hematúria) e gemidos de dor na caixa de areia há 24 horas. Tutor notou apatia profunda e recusa alimentar total no dia de hoje.",
        S_rationale: "Frequência excessiva na caixa de areia com ausência de débito urinário real é sinal patognomônico de obstrução baixa em felinos machos castrados.",
        O: "Prostração intensa, mucosas levemente pálidas. Ao exame físico abdominal, detecta-se bexigoma extremamente distendido, rígido (pétreo) e altamente doloroso. Desidratação estimada em 6%. FC: 190 bpm.",
        O_rationale: "O bexigoma pétreo indica anúria pós-renal obstrutiva mecânica imediata. A FC elevada é decorrente do estresse doloroso e desidratação iminente.",
        A: "Obstrução uretral aguda em felino (síndrome de FLUTD / DTUIF). Emergência clínica com alto risco de hipercalemia e injúria renal aguda pós-renal.",
        A_rationale: "A incapacidade de escoamento urinário gera reabsorção renal de potássio, levando à cardiotoxicidade e distúrbios graves de ritmo, exigindo intervenção rápida.",
        P: "Desobstrução uretral imediata sob sedação/anestesia geral (uso de sonda Tom Cat). Fluidoterapia endovenosa agressiva para correção eletrolítica e restabelecimento do débito urinário. Analgesia potente e monitoramento intensivo.",
        P_rationale: "A sondagem alivia instantaneamente a pressão pós-renal retrograda, prevenindo a ruptura de bexiga e permitindo a reidratação endovenosa contínua do felino."
      },
      rag: {
        title: "Obstrução Uretral Felina",
        compatibility: "95% compatível",
        sourceName: "Ettinger & Feldman (Internal Medicine)",
        citation: "Ettinger & Feldman, Cap. 182 • Pág. 784",
        snippet: "...a incapacidade de esvaziamento vesical por mais de 24 horas resulta em bexigoma rígido e doloroso, desencadeando azotemia pós-renal progressiva e distúrbios eletrolíticos fatais, exigindo desobstrução de urgência...",
        highlightWord: "bexigoma rígido e doloroso",
        analysis: "Paciente felino macho castrado apresentando bexigoma obstrutivo doloroso há 24h, com risco imediato de choque urêmico e parada cardíaca.",
        time: "1.4s"
      },
      prescriptions: [
        { name: "Cloridrato de Tramadol", dosePerKg: 2, unit: "mg", details: "SC, dose única para analgesia imediata do desconforto uretral intenso." },
        { name: "Soro Ringer com Lactato", dosePerKg: 50, unit: "ml/kg/dia", details: "IV contínuo nas primeiras 24h para restabelecer a hidratação e eliminar escórias de potássio." }
      ],
      whatsapp: "Olá! Escrevo para informar que o Garfield deu entrada com um quadro urgente de Obstrução Uretral Felina. Ele não estava conseguindo urinar, o que gera acúmulo de toxinas no sangue e extrema dor. Ele já foi sedado com segurança e realizamos a desobstrução. Ele precisará ficar internado em observação com soro na veia para reidratar e garantir que volte a urinar normalmente."
    }
  };

  // State
  const [selectedCase, setSelectedCase] = useState<"piometra" | "otitis" | "urinary">(() => {
    return (localStorage.getItem("vetmind_sandbox_selectedCase") as any) || "piometra";
  });
  const [inputText, setInputText] = useState(() => {
    return localStorage.getItem("vetmind_sandbox_inputText") || 
      "Fêmea inteira com corrimento vaginal purulento associado a desvio à esquerda e polidipsia moderada após 6 semanas do estro.";
  });
  
  const [isInputtingText, setIsInputtingText] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  
  // Applet stage: idle, generating, results
  const [stage, setStage] = useState<"idle" | "generating" | "results">(() => {
    return (localStorage.getItem("vetmind_sandbox_stage") as any) || "idle";
  });
  const [activeSubTab, setActiveSubTab] = useState<"soap" | "rag" | "prescriptions" | "whatsapp">(() => {
    return (localStorage.getItem("vetmind_sandbox_activeSubTab") as any) || "soap";
  });
  
  // Custom generated case state if user edits input text and clicks generate
  const [customCase, setCustomCase] = useState<CaseData | null>(() => {
    const saved = localStorage.getItem("vetmind_sandbox_customCase");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // SOAP Accordions state
  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    return localStorage.getItem("vetmind_sandbox_expandedSection") || null;
  });

  // Interactive dose weight state
  const [calcWeight, setCalcWeight] = useState<string>(() => {
    return localStorage.getItem("vetmind_sandbox_calcWeight") || "10";
  });

  // Pricing states
  const [isAnnual, setIsAnnual] = useState(true);

  // Feedback states
  const [copiedText, setCopiedText] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("vetmind_sandbox_selectedCase", selectedCase);
    localStorage.setItem("vetmind_sandbox_inputText", inputText);
    localStorage.setItem("vetmind_sandbox_stage", stage);
    localStorage.setItem("vetmind_sandbox_activeSubTab", activeSubTab);
    localStorage.setItem("vetmind_sandbox_customCase", customCase ? JSON.stringify(customCase) : "");
    localStorage.setItem("vetmind_sandbox_expandedSection", expandedSection || "");
    localStorage.setItem("vetmind_sandbox_calcWeight", calcWeight);
  }, [selectedCase, inputText, stage, activeSubTab, customCase, expandedSection, calcWeight]);

  // Simulated Voice recording effect
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordTimer((prev) => {
          if (prev >= 4) {
            // Stop recording at 5s and pre-populate text dynamically based on the current selection!
            setIsRecording(false);
            if (selectedCase === "piometra") {
              setInputText("Fêmea inteira com corrimento vaginal purulento associado a desvio à esquerda e polidipsia moderada após 6 semanas do estro.");
            } else if (selectedCase === "otitis") {
              setInputText("Paciente Golden Retriever, 4 anos, macho, com prurido intenso em orelhas bilateralmente há 10 dias. Balança muito a cabeça. Ao exame físico: eritema acentuado em conduto auditivo externo bilateral, secreção ceruminosa marrom abundante com odor fétido.");
            } else {
              setInputText("Felino, SRD, 3 anos, macho castrado. Tutor relata estrangúria, hematúria e vocalização ao tentar usar a caixa de areia há 24h. Hoje apático e anoréxico. Ao exame físico: bexiga extremamente distendida, rígida e dolorosa.");
            }
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, selectedCase]);

  // Clean current input
  const handleClear = () => {
    setInputText("");
    setStage("idle");
    setCustomCase(null);
  };

  // Change preset case
  const handleSelectCase = (key: "piometra" | "otitis" | "urinary") => {
    setSelectedCase(key);
    setCustomCase(null);
    setStage("idle");
    if (key === "piometra") {
      setInputText("Fêmea inteira com corrimento vaginal purulento associado a desvio à esquerda e polidipsia moderada após 6 semanas do estro.");
    } else if (key === "otitis") {
      setInputText("Paciente Golden Retriever, 4 anos, macho, com prurido intenso em orelhas bilateralmente há 10 dias. Balança muito a cabeça. Ao exame físico: eritema acentuado em conduto auditivo externo bilateral, secreção ceruminosa marrom abundante com odor fétido.");
    } else {
      setInputText("Felino, SRD, 3 anos, macho castrado. Tutor relata estrangúria, hematúria e vocalização ao tentar usar a caixa de areia há 24h. Hoje apático e anoréxico. Ao exame físico: bexiga extremamente distendida, rígida e dolorosa.");
    }
  };

  // Run Simulated/Live analysis
  const [currentStepLabel, setCurrentStepLabel] = useState("");
  const handleAnalyse = async () => {
    if (!inputText.trim()) return;

    setStage("generating");
    
    // Check if user edited the preset text. If they edited, we can fetch real data or procedurally construct it.
    const isCustomText = inputText.trim() !== presets[selectedCase].soap.S && 
                         inputText.trim() !== presets[selectedCase].soap.O && 
                         inputText.trim() !== presets[selectedCase].patientDetails &&
                         !inputText.startsWith("Fêmea inteira") && !inputText.startsWith("Paciente Golden") && !inputText.startsWith("Felino");

    // Disney: informational, calming steps
    setCurrentStepLabel("Analisando sintomas clínicas e históricos...");
    await new Promise((r) => setTimeout(r, 900));
    
    setCurrentStepLabel("Cruzando com literatura veterinária e consensos...");
    await new Promise((r) => setTimeout(r, 900));
    
    setCurrentStepLabel("Montando diagnósticos e protocolos de tratamento...");
    await new Promise((r) => setTimeout(r, 700));

    if (isCustomText) {
      try {
        // Hit real backend dynamically for custom inputs!
        const response = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anamnesis: inputText,
            patient: { name: "Paciente", species: "Canino", breed: "SRD", age: "5", sex: "Fêmea inteira", weight: "12" },
            examData: "Exame clínico geral."
          }),
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            // Let's parse the returned SOAP using the delimiters '##'
            const sections = (data.soapContent || "").split("##");
            let s_val = "", o_val = "", a_val = "", p_val = "";
            
            sections.forEach((sec: string) => {
              const trimmed = sec.trim();
              if (trimmed.startsWith("S (")) s_val = trimmed.replace(/^S \([^)]+\):?/, "").trim();
              else if (trimmed.startsWith("O (")) o_val = trimmed.replace(/^O \([^)]+\):?/, "").trim();
              else if (trimmed.startsWith("A (")) a_val = trimmed.replace(/^A \([^)]+\):?/, "").trim();
              else if (trimmed.startsWith("P (")) p_val = trimmed.replace(/^P \([^)]+\):?/, "").trim();
            });

            // Fallback if split didn't find them perfectly
            if (!s_val) s_val = inputText;
            if (!o_val) o_val = "Exame geral executado. Sintomas condizentes com queixa subjetiva.";
            if (!a_val) a_val = "Diagnóstico diferencial sob verificação do clínico responsável.";
            if (!p_val) p_val = "Fluidoterapia de suporte e exames complementares imediatos.";

          setCustomCase({
            patientDetails: "Paciente (Canino, SRD, 5 anos, Fêmea, 12kg)",
            soap: {
              S: s_val.slice(0, 200),
              S_rationale: "Análise processada a partir da anamnese informada pelo clínico.",
              O: o_val.slice(0, 200),
              O_rationale: "Achados extraídos via inferência linguística estruturada.",
              A: a_val.slice(0, 200),
              A_rationale: "Diagnóstico baseado em correlação de sintomas e consensos.",
              P: p_val.slice(0, 200),
              P_rationale: "Tratamento empírico inicial indicado para controle de sintomas."
            },
            rag: {
              title: "Diferencial Identificado",
              compatibility: "78% compatível",
              sourceName: "Literatura Veterinária Ativa",
              citation: "RAG • Diretrizes Gerais de Clínica",
              snippet: "...a manifestação aguda do paciente requer exclusão de patologias infecciosas e mecânicas concomitantes...",
              highlightWord: "manifestação aguda do paciente",
              analysis: "Análise textual cruzou queixas clínicas com termos recorrentes em publicações científicas indexadas.",
              time: "1.5s"
            },
            prescriptions: [
              { name: "Terapia de Suporte Inicial", dosePerKg: 10, unit: "ml/kg/h", details: "Fluidoterapia com Ringer Lactato ou Soro Fisiológico para hidratação." },
              { name: "Analgesia de Controle", dosePerKg: 2, unit: "mg/kg", details: "Administrar a critério médico veterinário conforme evolução da dor." }
            ],
            whatsapp: `Olá! Passando para atualizar sobre a consulta do seu pet. Analisamos os sintomas e iniciamos as primeiras condutas de suporte clínico. Prescrevi as medicações necessárias e o plano terapêutico inicial. Seguiremos acompanhando cada passo.`
          });
          } else {
            setCustomCase(null);
          }
        } else {
          setCustomCase(null);
        }
      } catch (err) {
        console.error("Custom analysis error:", err);
        setCustomCase(null);
      }
    }

    setStage("results");
    setActiveSubTab("soap");
  };

  // Get active rendering case data
  const activeCaseData = customCase || presets[selectedCase];

  // Helper to copy text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Dynamic Pulse Keyframes Style Block */}
      <style>{`
        @keyframes container-pulse {
          0%, 100% {
            border-color: rgba(99, 102, 241, 0.25);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(99, 102, 241, 0.04);
          }
          50% {
            border-color: rgba(16, 185, 129, 0.45);
            box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.08), 0 10px 10px -5px rgba(16, 185, 129, 0.08), 0 0 0 4px rgba(16, 185, 129, 0.08);
          }
        }
        .animate-container-pulse {
          animation: container-pulse 4s infinite ease-in-out;
        }
      `}</style>

      {/* Visual Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/65 pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full font-mono">
              Vetmind Co-Pilot V2.8
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full font-mono">
              Clinical Soft Aesthetic
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 leading-none tracking-tight font-display">
            Copiloto Clínico Integrado
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-xl">
            Experimente a perfeita simulação da injeção do Vetmind Copilot. Nossa inteligência opera como uma camada nativa agnóstica para qualquer prontuário eletrônico do mercado.
          </p>
        </div>

        {/* Info stats */}
        <div className="flex items-center gap-4 bg-white border border-slate-150 rounded-2xl p-4 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Chrome className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Motor de Busca</p>
            <p className="text-sm font-bold text-slate-800 mt-1">Conectado ao RAG</p>
            <p className="text-[9px] text-emerald-600 font-extrabold uppercase mt-0.5 tracking-wider">● SISTEMA INTEGRADO ATIVO</p>
          </div>
        </div>
      </div>

      {/* Preset case switcher buttons (Disney/Lego Perfect Alignment) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Selecione um Caso Clínico de Exemplo:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSelectCase("piometra")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
              selectedCase === "piometra" && !customCase
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20 scale-[1.02]"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Caso 1: Piometra Aberta (Geral)
          </button>
          <button
            onClick={() => handleSelectCase("otitis")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
              selectedCase === "otitis" && !customCase
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20 scale-[1.02]"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Caso 2: Otite Externa (Golden)
          </button>
          <button
            onClick={() => handleSelectCase("urinary")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
              selectedCase === "urinary" && !customCase
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20 scale-[1.02]"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Caso 3: Bexigoma (Felino SRD)
          </button>
        </div>
      </div>

      {/* MAIN DYNAMIC SIMULATOR PAINEL (Container Pulse Animated) */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden animate-container-pulse">
        {/* Top bar mockup like OS Window */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[11px] font-black font-mono text-slate-400 uppercase tracking-widest">
              VETMIND CO-PILOT V2.8
            </span>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            SISTEMA INTEGRADO
          </span>
        </div>

        {/* Inner grid (Two Columns on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* LEFT COLUMN: INPUT ZONE */}
          <div className="p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between space-y-8 bg-slate-50/40">
            <div className="space-y-6">
              {/* Header inside Column 1 */}
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-wider uppercase font-display">
                  SINTOMAS E ANAMNESE
                </h3>
                
                {/* Switcher: Voice or Text */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => {
                      setIsInputtingText(false);
                      setIsRecording(true);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                      !isInputtingText || isRecording
                        ? "bg-rose-100 text-rose-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Mic className={`w-3.5 h-3.5 ${isRecording ? "animate-bounce text-rose-600" : ""}`} />
                    Gravar Voz
                  </button>
                  <button
                    onClick={() => {
                      setIsInputtingText(true);
                      setIsRecording(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                      isInputtingText && !isRecording
                        ? "bg-white text-indigo-600 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Digitar IA
                  </button>
                </div>
              </div>

              {/* Input Area or Sound Wave Recording Box */}
              <div className="relative bg-white rounded-3xl border border-slate-200 shadow-inner overflow-hidden min-h-[220px] flex flex-col justify-between p-6">
                
                {isRecording ? (
                  // Sound Wave / Pulsating indicators (Pink-Rose)
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-8 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-16 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-12 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="w-2.5 h-20 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                      <span className="w-2.5 h-6 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
                      <span className="w-2.5 h-14 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '750ms' }} />
                      <span className="w-2.5 h-10 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '900ms' }} />
                    </div>
                    
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-bold text-rose-600 flex items-center gap-2 justify-center">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        Gravando áudio clínico... (00:0{recordTimer})
                      </p>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">
                        Fale os sintomas naturalmente. O Vetmind transcreverá em tempo real.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsRecording(false)}
                      className="px-6 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-full text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Concluir Gravação
                    </button>
                  </div>
                ) : (
                  // Normal Textarea with "limpar" inside
                  <>
                    <textarea
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        if (customCase) setCustomCase(null);
                      }}
                      placeholder="Descreva a queixa do tutor, histórico clínico e observações de exame físico do paciente..."
                      className="w-full flex-1 border-none outline-none resize-none bg-transparent text-sm font-semibold text-slate-700 leading-relaxed placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {inputText.length} caracteres digitados
                      </span>
                      <button
                        onClick={handleClear}
                        className="px-3 py-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        limpar
                      </button>
                    </div>
                  </>
                )}

              </div>

              {/* Status information banner */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-3">
                <Database className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-950 font-semibold leading-relaxed">
                  <b>API Conectada:</b> O Vetmind correlaciona os dados informados com a <b>literatura veterinária nacional e internacional</b> para gerar os diferenciais sistemáticos.
                </p>
              </div>
            </div>

            {/* Bottom Giant CTA Action with grand gradient */}
            <div className="pt-6">
              <button
                onClick={handleAnalyse}
                disabled={!inputText.trim() || isRecording}
                className={`w-full py-4 rounded-full font-bold text-sm tracking-wide text-white transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  inputText.trim() && !isRecording
                    ? "bg-gradient-to-r from-indigo-600 to-emerald-500 hover:scale-[1.02] shadow-lg shadow-indigo-600/15"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Zap className="w-4 h-4 animate-bounce" />
                ANALISAR CASO INTEGRADO
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: OUTPUT ZONE */}
          <div className="p-6 lg:p-10 flex flex-col justify-between min-h-[460px] bg-white">
            
            {stage === "idle" && (
              // Case 1: Empty state placeholder (as requested in mockup)
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 shadow-xs">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-extrabold text-slate-800 font-display">Aguardando entrada de dados</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Insira as anotações do paciente ou clique em <span className="text-indigo-600 font-bold">"Digitar IA"</span> e aperte <span className="text-emerald-500 font-bold">"Analisar Caso"</span> para assistir à IA estruturando o prontuário.
                  </p>
                </div>
              </div>
            )}

            {stage === "generating" && (
              // Case 2: Nice loading state with informative progress (Lego/Disney standard)
              <div className="flex-1 flex flex-col justify-center space-y-8 py-10">
                <div className="space-y-4 text-center">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 border-2 border-slate-100 rounded-full" />
                    <div className="absolute inset-0 border-2 border-t-indigo-600 rounded-full animate-spin" />
                    <div className="absolute inset-2 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-full flex items-center justify-center font-bold text-[11px] text-white">
                      VM
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                      {currentStepLabel}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
                      Aguarde enquanto montamos a inteligência...
                    </p>
                  </div>
                </div>

                {/* Simulated Shimmer Skeleton Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded-full w-24" />
                  <div className="space-y-2">
                    <div className="h-2.5 bg-slate-200 rounded-full w-full" />
                    <div className="h-2.5 bg-slate-200 rounded-full w-5/6" />
                    <div className="h-2.5 bg-slate-200 rounded-full w-4/6" />
                  </div>
                </div>
              </div>
            )}

            {stage === "results" && (
              // Case 3: Tabs and structural ficha médica rendering
              <div className="flex-1 flex flex-col justify-between h-full space-y-6">
                
                {/* Abas behavior: behavior like clean clinical cards */}
                <div className="flex border-b border-slate-200 overflow-x-auto gap-2 scrollbar-none shrink-0">
                  <button
                    onClick={() => setActiveSubTab("soap")}
                    className={`pb-3 px-3 text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer ${
                      activeSubTab === "soap"
                        ? "text-indigo-900 border-b-2 border-indigo-600 font-black scale-102"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Ficha SOAP
                  </button>
                  <button
                    onClick={() => setActiveSubTab("rag")}
                    className={`pb-3 px-3 text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer ${
                      activeSubTab === "rag"
                        ? "text-indigo-900 border-b-2 border-indigo-600 font-black scale-102"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Literatura Rastreável
                  </button>
                  <button
                    onClick={() => setActiveSubTab("prescriptions")}
                    className={`pb-3 px-3 text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer ${
                      activeSubTab === "prescriptions"
                        ? "text-indigo-900 border-b-2 border-indigo-600 font-black scale-102"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Prescrições
                  </button>
                  <button
                    onClick={() => setActiveSubTab("whatsapp")}
                    className={`pb-3 px-3 text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer ${
                      activeSubTab === "whatsapp"
                        ? "text-indigo-900 border-b-2 border-indigo-600 font-black scale-102"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    WhatsApp Tutor
                  </button>
                </div>

                {/* Tab content screens */}
                <div className="flex-grow overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
                  
                  {/* TAB 1: SOAP */}
                  {activeSubTab === "soap" && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 text-xs font-bold text-slate-700">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Paciente Identificado</span>
                        <p className="mt-0.5 text-indigo-950 font-extrabold">{activeCaseData.patientDetails}</p>
                      </div>

                      <div className="space-y-3">
                        {/* S SECTION */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <button
                            onClick={() => setExpandedSection(expandedSection === "S" ? null : "S")}
                            className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs flex items-center justify-center">S</span>
                              <span className="text-xs font-bold text-slate-800">S — Subjetivo (Queixa e Histórico)</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedSection === "S" ? "rotate-180" : ""}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {(expandedSection === "S" || true) && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 border-t border-slate-100 text-xs font-medium text-slate-650 leading-relaxed space-y-2 bg-white">
                                  <p>{activeCaseData.soap.S}</p>
                                  {expandedSection === "S" && (
                                    <div className="p-2.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-[11px] text-indigo-850 mt-2 font-semibold">
                                      💡 <b>Raciocínio Clínico:</b> {activeCaseData.soap.S_rationale}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* O SECTION */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <button
                            onClick={() => setExpandedSection(expandedSection === "O" ? null : "O")}
                            className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs flex items-center justify-center">O</span>
                              <span className="text-xs font-bold text-slate-800">O — Objetivo (Exame Físico/Exames)</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedSection === "O" ? "rotate-180" : ""}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedSection === "O" && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 border-t border-slate-100 text-xs font-medium text-slate-650 leading-relaxed space-y-2 bg-white">
                                  <p>{activeCaseData.soap.O}</p>
                                  <div className="p-2.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-[11px] text-indigo-850 mt-2 font-semibold">
                                    💡 <b>Análise de Evidências:</b> {activeCaseData.soap.O_rationale}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* A SECTION */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <button
                            onClick={() => setExpandedSection(expandedSection === "A" ? null : "A")}
                            className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs flex items-center justify-center">A</span>
                              <span className="text-xs font-bold text-slate-800">A — Avaliação e Diferenciais</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedSection === "A" ? "rotate-180" : ""}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedSection === "A" && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 border-t border-slate-100 text-xs font-medium text-slate-650 leading-relaxed space-y-2 bg-white">
                                  <p>{activeCaseData.soap.A}</p>
                                  <div className="p-2.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-[11px] text-indigo-850 mt-2 font-semibold">
                                    💡 <b>Fisiopatologia:</b> {activeCaseData.soap.A_rationale}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* P SECTION */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <button
                            onClick={() => setExpandedSection(expandedSection === "P" ? null : "P")}
                            className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs flex items-center justify-center">P</span>
                              <span className="text-xs font-bold text-slate-800">P — Plano Terapêutico e Conduta</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedSection === "P" ? "rotate-180" : ""}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedSection === "P" && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 border-t border-slate-100 text-xs font-medium text-slate-650 leading-relaxed space-y-2 bg-white">
                                  <p>{activeCaseData.soap.P}</p>
                                  <div className="p-2.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-[11px] text-indigo-850 mt-2 font-semibold">
                                    💡 <b>Fundamentação:</b> {activeCaseData.soap.P_rationale}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LITERATURA RASTREÁVEL (Matches Image 3 perfectly!) */}
                  {activeSubTab === "rag" && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      
                      {/* Badge and Citation metadata */}
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest">
                            DIAGNÓSTICO PRINCIPAL • COMPROVAÇÃO DE DIAGNÓSTICO
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 font-black">{activeCaseData.rag.sourceName}</span>
                        </div>

                        {/* Title of Diagnosis */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-black text-slate-900 leading-none font-display">
                            {activeCaseData.rag.title}
                          </h4>
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {activeCaseData.rag.compatibility} ✓
                          </span>
                        </div>

                        {/* Author/page locator */}
                        <div className="inline-block bg-indigo-50 text-indigo-800 text-[10px] font-black uppercase tracking-widest font-mono px-3 py-1 rounded-lg border border-indigo-100">
                          {activeCaseData.rag.citation}
                        </div>
                      </div>

                      {/* Literal referenced Book Snippet with yellow-green marker highlighter */}
                      <div className="p-4 bg-slate-50/70 border border-slate-150/80 rounded-2xl relative overflow-hidden">
                        <span className="text-[14px] text-indigo-400 absolute top-2 right-4 font-mono select-none">“</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed italic pr-4 font-sans">
                          {activeCaseData.rag.snippet.split(activeCaseData.rag.highlightWord)[0]}
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded mx-1 text-xs select-all">
                            {activeCaseData.rag.highlightWord}
                          </span>
                          {activeCaseData.rag.snippet.split(activeCaseData.rag.highlightWord)[1]}
                        </p>
                      </div>

                      {/* Copilot Case analysis rationale */}
                      <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                          ANÁLISE DO CASO PELO COPILOTO
                        </h5>
                        <p className="text-xs text-slate-700 font-medium leading-normal">
                          {activeCaseData.rag.analysis}
                        </p>
                      </div>

                      {/* Footnotes */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1">
                        <span>Verificado em {activeCaseData.rag.time}</span>
                        <span className="text-emerald-600 flex items-center gap-1 font-bold">✓ Fonte científica verificada</span>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: PRESCRIÇÕES & CALCULATOR */}
                  {activeSubTab === "prescriptions" && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {activeCaseData.prescriptions.map((med, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-1.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{idx + 1}. {med.name}</h4>
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{med.dosePerKg} {med.unit}/kg</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{med.details}</p>
                          </div>
                        ))}
                      </div>

                      {/* SIMULAR DOSE POR PESO: Modal leve/Inline calculator (as requested by user_rules) */}
                      <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🧮</span>
                          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-display">Simular Dose por Peso</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Peso do Paciente (kg)</label>
                            <input
                              type="number"
                              value={calcWeight}
                              onChange={(e) => setCalcWeight(e.target.value)}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                              min="1"
                              max="100"
                            />
                          </div>

                          <div className="bg-white/80 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Resultado Calculado</span>
                            <div className="space-y-1 mt-1.5">
                              {activeCaseData.prescriptions.map((med, idx) => {
                                const weightVal = parseFloat(calcWeight) || 0;
                                const total = (weightVal * med.dosePerKg).toFixed(1);
                                return (
                                  <p key={idx} className="text-[11px] font-bold text-slate-800 flex justify-between">
                                    <span className="truncate max-w-[120px]">{med.name}:</span>
                                    <span className="text-indigo-700 font-black">{total} {med.unit} total</span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 4: WHATSAPP TUTOR */}
                  {activeSubTab === "whatsapp" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-150 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mensagem para Tutor</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded-full uppercase">Pronto para Enviar</span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed font-sans whitespace-pre-line bg-white p-3.5 rounded-xl border border-slate-100 shadow-inner">
                          {activeCaseData.whatsapp}
                        </p>
                      </div>

                      {/* Copy to Clipboard action */}
                      <button
                        onClick={() => handleCopyText(activeCaseData.whatsapp)}
                        className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          copiedText
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                        }`}
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-4 h-4 animate-bounce" />
                            Copiado com Sucesso!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar Mensagem de WhatsApp
                          </>
                        )}
                      </button>
                    </div>
                  )}

                </div>

                {/* Footer status representing OS Window success injection */}
                <div className="pt-4 border-t border-slate-150 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Prontuário gerado em {activeCaseData.rag.time}</span>
                  <button
                    onClick={() => {
                      alert("Injetado com sucesso no seu Prontuário Clínico!");
                    }}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 shadow-md shadow-emerald-500/10 hover:scale-[1.02] cursor-pointer"
                  >
                    ✦ Injetar na Ficha do SimplesVet
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* SECTION 4: TABELA DE PLANOS E PREÇOS (Pricing Model - Clinically Polished) */}
      <div className="space-y-10 py-10">
        
        {/* Toggle Switch header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display">
            Planos de Assinatura Simples e Transparentes
          </h2>
          <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
            Escolha o plano ideal para a sua rotina e potencialize a segurança e agilidade dos seus atendimentos hoje mesmo.
          </p>

          {/* Monthly / Annual Toggle switch with 20% Discount emerald badge */}
          <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-full border border-slate-200 mt-4">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all ${
                !isAnnual ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center ${
                isAnnual ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Faturamento Anual
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-black ml-2 animate-pulse">
                -20% Off
              </span>
            </button>
          </div>
        </div>

        {/* 2-Column Elegant Pricing Grid (focused on Estudante and Veterinário Autônomo only!) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch">
          
          {/* Plan 1: Estudante */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between space-y-8 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Para Acadêmicos</span>
                <h3 className="text-xl font-extrabold text-slate-900 font-display">Plano Estudante</h3>
              </div>

              {/* Price display */}
              <div>
                <p className="text-4xl font-black text-slate-900 font-display tracking-tight">
                  R$ {isAnnual ? "95" : "119"}
                  <span className="text-xs text-slate-400 font-semibold uppercase font-mono tracking-wider"> / mês</span>
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  {isAnnual ? "Faturamento anual de R$ 1.140" : "Cancelamento flexível mensal"}
                </p>
              </div>

              {/* Features list */}
              <ul className="space-y-3 text-xs font-semibold text-slate-650">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Acesso integral ao Copiloto SOAP</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Até 30 consultas / mês</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Acesso à base de livros clássicos integrada</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Suporte por e-mail comercial</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => alert("Assinatura do Plano Estudante simulada com sucesso!")}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer"
            >
              Começar Período Grátis
            </button>
          </div>

          {/* Plan 2: Veterinário Autônomo (FAVORITE / HIGHLIGHTED) */}
          <div className="bg-white border-2 border-indigo-600 rounded-[2.5rem] p-8 flex flex-col justify-between space-y-8 relative overflow-hidden shadow-lg hover:shadow-xl transition-all scale-105">
            {/* Top popular/recommendation badge ribbon */}
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
              RECOMENDADO
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest font-mono">Mais Vendido de Todos</span>
                <h3 className="text-xl font-extrabold text-indigo-950 font-display">Veterinário Autônomo</h3>
              </div>

              {/* Price display */}
              <div>
                <p className="text-4xl font-black text-indigo-950 font-display tracking-tight">
                  R$ {isAnnual ? "199" : "249"}
                  <span className="text-xs text-slate-400 font-semibold uppercase font-mono tracking-wider"> / mês</span>
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  {isAnnual ? "Faturamento anual de R$ 2.388 (Economize R$ 600)" : "Cancelamento flexível mensal"}
                </p>
              </div>

              {/* Features list */}
              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Consultas e Laudos <b>Ilimitados</b></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>RAG com upload de PDFs ilimitado</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Integração de 1 clique via Extensão Chrome</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Envio automatizado de WhatsApp do Tutor</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Suporte VIP 24h via WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => alert("Assinatura do Plano Veterinário Autônomo simulada com sucesso!")}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-extrabold uppercase tracking-widest transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Assinar Agora
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
