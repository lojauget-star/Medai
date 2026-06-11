import React, { useState } from "react";
import {
  Sparkles,
  Chrome,
  ArrowRight,
  Monitor,
  Cpu,
  CheckCircle2,
  FileText,
  Copy,
  Zap,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Check,
  Building,
  Radio,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VetmindLogo from "./VetmindLogo";

export default function IntegrationsSandbox() {
  const [selectedPreset, setSelectedPreset] = useState<"otitis" | "urinary" | "custom">("otitis");
  const [anamnesisText, setAnamnesisText] = useState(
    "Paciente Golden Retriever, 4 anos, com queixa de prurido intenso em orelhas bilateralmente há 10 dias. Balança muito a cabeça. Ao exame físico: eritema acentuado em conduto auditivo externo esquerdo e direito, secreção ceruminosa marrom escura abundante com odor fétido. Dor à palpação do conduto. Membrana timpânica íntegra."
  );
  
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [injected, setInjected] = useState(false);
  
  // Results in the simulator
  const [ehrReport, setEhrReport] = useState("");
  const [ehrPrescription, setEhrPrescription] = useState("");

  const presets = {
    otitis: {
      title: "Otite Externa Bilateral",
      text: "Paciente Golden Retriever, 4 anos, com queixa de prurido intenso em orelhas bilateralmente há 10 dias. Balança muito a cabeça. Ao exame físico: eritema acentuado em conduto auditivo externo esquerdo e direito, secreção ceruminosa marrom escura abundante com odor fétido. Dor à palpação do conduto. Membrana timpânica íntegra.",
      resultReport: "MINUTA DE CONDUÇÃO CLÍNICA (SOAP)\n- S: Prurido em orelhas há 10 dias, head shaking frequente.\n- O: Eritema em conduto auditivo externo bilateral, exsudato ceruminoso marrom espesso abundante, dor moderada à palpação. Membranas timpânicas íntegras.\n- A: Otite externa eritêmato-ceruminosa bilateral (suspeita de etiologia fúngica/bacteriana por Malassezia ou Staphylococcus).\n- P: Limpeza com solução otológica cerumolítica e aplicação de otológico contendo corticoide, antifúngico e antibiótico. Recomendada citologia de ouvido.",
      resultPrescription: "1. Oto Sana (ou similar) - Instilar 4 gotas em ambos os ouvidos a cada 12 horas por 10 dias.\n2. Limpeza auricular com Ots-Clean - Aplicar 2x por semana antes de medicar.\n3. Retorno em 14 dias para nova avaliação diagnóstica."
    },
    urinary: {
      title: "Obstrução Uretral Felina",
      text: "Felino, SRD, 3 anos, macho castrado. Tutor relata estrangúria, hematúria e vocalização ao tentar usar a caixa de areia há 24h. Hoje apático e anoréxico. Ao exame físico: bexiga extremamente distendida, rígida e dolorosa à palpação abdominal (bexigoma). Desidratação estimada em 6%. FC: 190 bpm, T: 37.8°C.",
      resultReport: "MINUTA DE CONDUÇÃO CLÍNICA (SOAP)\n- S: Disúria, estrangúria, hematúria e vocalização na caixa de areia há 24 horas. Prostração e hiporexia nas últimas horas.\n- O: Presença de volumoso e pétreo bexigoma doloroso à palpação abdominal. Desidratação 6%. Sinais vitais limítrofes.\n- A: Obstrução uretral felina (Dout/FLUTD). Risco iminente de injúria renal aguda e distúrbios de potássio.\n- P: Desobstrução uretral de urgência sob sedação profunda, sondagem de demora urinária (sonda Tom Cat), fluidoterapia de suporte (Ringer com Lactato) e monitoramento de débito.",
      resultPrescription: "1. Internação imediata para desobstrução uretral e hidratação intravenosa.\n2. Cloridrato de Tramadol - 2 mg/kg SC para analgesia analgésica imediata.\n3. Cloridrato de Fenoxibenzamina - 0.5 mg/kg VO a cada 12 horas (após alta) para mitigar espasmos uretrais por 7 dias."
    },
    custom: {
      title: "Nova Queixa Livre",
      text: "Digite qualquer anotação clínica rápida que o Vetmind Copiloto preencherá de forma automatizada...",
      resultReport: "MINUTA DE CONDUÇÃO CLÍNICA (SOAP)\n- S: Queixa clínica genérica informada pelo usuário em anotação simplificada.\n- O: Achados clínicos estruturados a partir das notas inseridas.\n- A: Avaliação preliminar de diagnóstico diferencial por evidências clínicas de suporte.\n- P: Plano terapêutico farmacológico básico sugerido para revisão profissional.",
      resultPrescription: "1. Verifique as recomendações terapêuticas detalhadas geradas na extensão para aprovar."
    }
  };

  const selectPreset = (key: "otitis" | "urinary" | "custom") => {
    setSelectedPreset(key);
    setAnamnesisText(presets[key].text);
    setEhrReport("");
    setEhrPrescription("");
    setInjected(false);
  };

  const handleSimulateAnalysis = () => {
    setIsProcessing(true);
    setExtensionOpen(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
  };

  const handleInject = () => {
    const currentPreset = presets[selectedPreset] || presets.custom;
    setEhrReport(currentPreset.resultReport);
    setEhrPrescription(currentPreset.resultPrescription);
    setInjected(true);
    setExtensionOpen(false);
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Visual Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/60 pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-clinical-blue text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full font-mono">
              Fase 2 de Escala
            </span>
            <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full font-mono">
              Sandbox Tecnológico
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 leading-none tracking-tight">
            Navegador & Extensões Integradas
          </h1>
          <p className="text-sm font-semibold text-slate-500 max-w-xl">
            Acabe com a barreira de entrada clínica. Nossa tecnologia permite simular a injeção do Vetmind Copilot diretamente dentro de qualquer prontuário eletrônico existente (SimplesVet, VetMax, etc.) via Extensão do Chrome.
          </p>
        </div>

        {/* Info stats */}
        <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-clinical-blue rounded-xl flex items-center justify-center">
            <Chrome className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status da Extensão</p>
            <p className="text-sm font-bold text-slate-800 mt-1">Pronta para Deploy</p>
            <p className="text-[9px] text-emerald-600 font-extrabold uppercase mt-0.5 tracking-wider">● 1-Click Injection Ativo</p>
          </div>
        </div>
      </div>

      {/* Conceptual Explanation Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-clinical-blue flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">1. Fluxo sem Atrito</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            O veterinário não precisa copiar dados, abrir guias colaterais ou preencher cadastros duplicados. A inteligência opera como uma camada nativa do software atual dele.
          </p>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">2. Identificação Inteligente</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            A extensão localiza os campos de anamnese na tela e injeta um pequeno botão Vetmind discreto e reativo ao lado ou dentro dos campos de texto (textarea).
          </p>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">3. Multi-Sistemas (EHR Agnostic)</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Funciona nos maiores sistemas do mercado (SimplesVet, VetMax, ClinicCloud, Sisvet) injetando scripts customizados e seguros por XPath dinâmico.
          </p>
        </div>
      </div>

      {/* Main Interactive Stage Widget */}
      <div className="bg-slate-900/5 border border-slate-200 rounded-[2.5rem] p-6 lg:p-10 space-y-8">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Simulador de Extensão em Tempo Real</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Experimente o comportamento do widget do Chrome rodando de forma fictícia em uma tela nativa do sistema da clínica do veterinário.
          </p>
        </div>

        {/* Step-by-Step interactive controller */}
        <div className="flex flex-wrap items-center gap-2 bg-white/70 backdrop-blur-md p-2 rounded-2xl border border-slate-200/60 max-w-xl">
          <span className="text-[10px] font-black uppercase text-slate-400 px-3 tracking-widest">Selecione um Caso Clínico:</span>
          <button
            onClick={() => selectPreset("otitis")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
              selectedPreset === "otitis" ? "bg-clinical-blue text-white" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            Caso 1: Otite
          </button>
          <button
            onClick={() => selectPreset("urinary")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
              selectedPreset === "urinary" ? "bg-clinical-blue text-white" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            Caso 2: Bexigoma
          </button>
          <button
            onClick={() => selectPreset("custom")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
              selectedPreset === "custom" ? "bg-clinical-blue text-white" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            Livre (Custom)
          </button>
        </div>

        {/* The visual simulator screen mockup */}
        <div className="relative bg-slate-900 rounded-[2rem] border-4 border-slate-950 shadow-2xl overflow-hidden min-h-[580px] grid grid-cols-1 lg:grid-cols-12">
          
          {/* Main Simulated Clinical CRM (representing the 3rd-party software) - 8 Cols */}
          <div className="lg:col-span-8 p-6 flex flex-col justify-between bg-slate-100 text-slate-800 relative">
            {/* Mock Header of SimplesVet */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-orange-500"></div>
                  <span className="font-black text-xs uppercase tracking-widest text-[#E65F2B] font-mono">
                    SimplesVet Cloud v8.4.1
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Prontuário Ativo</span>
                </div>
              </div>

              {/* Patient Profile */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Identificação do Paciente</span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {selectedPreset === "otitis" && "Thor (Golden Retriever, 4A, Macho)"}
                    {selectedPreset === "urinary" && "Garfield (Felino SRD, 3A, Macho Castrado)"}
                    {selectedPreset === "custom" && "Paciente Personalizado (Análise Livre)"}
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">Ficha #29938</span>
              </div>

              {/* Patient Fields Form */}
              <div className="space-y-4 mt-2">
                
                {/* Textarea containing Anamnesis with floating extension badge inside! */}
                <div className="relative space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Queixa Clínica, Exame Físico & Anotações de Consulta:
                  </label>
                  <div className="relative">
                    <textarea
                      value={anamnesisText}
                      onChange={(e) => {
                        if (selectedPreset !== "custom") {
                          setSelectedPreset("custom");
                        }
                        setAnamnesisText(e.target.value);
                      }}
                      className="w-full min-h-[140px] pr-12 p-4 bg-white border border-slate-200 focus:outline-[#E65F2B] focus:border-transparent rounded-xl text-xs font-semibold leading-relaxed text-slate-700 shadow-inner"
                      placeholder="Anote aqui as descrições em linguagem natural..."
                    />

                    {/* FLOATING VETMIND EXTENSION BADGE */}
                    <button
                      onClick={handleSimulateAnalysis}
                      className="absolute bottom-3 right-3 p-2 bg-gradient-to-br from-[#003399] to-clinical-blue hover:from-clinical-blue hover:to-[#002266] text-white rounded-xl shadow-lg border border-white/20 hover:scale-110 active:scale-95 transition-all group pointer-events-auto"
                      title="Analisar com Vetmind Copiloto"
                    >
                      <div className="relative">
                        <VetmindLogo showText={false} size={22} />
                        <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sub-results filled automatically */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Laudo / Condução SOAP (Vetmind Auto-fill):
                    </label>
                    <textarea
                      readOnly
                      value={ehrReport}
                      placeholder="Aguardando a injeção do Copiloto no sistema..."
                      className={`w-full h-[120px] p-3 text-[11px] font-bold border rounded-lg bg-slate-50 leading-normal text-slate-600 outline-none transition-all ${
                        injected ? "border-emerald-300 bg-emerald-50/20 text-slate-800" : "border-slate-200"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Prescrição Indicada (Vetmind Auto-fill):
                    </label>
                    <textarea
                      readOnly
                      value={ehrPrescription}
                      placeholder="Aguardando a injeção do Copiloto no sistema..."
                      className={`w-full h-[120px] p-3 text-[11px] font-bold border rounded-lg bg-slate-50 leading-normal text-slate-600 outline-none transition-all ${
                        injected ? "border-emerald-300 bg-emerald-50/20 text-slate-800" : "border-slate-200"
                      }`}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* SimplesVet Footer Button */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">SimplesVet integration active</span>
              <button
                disabled={!injected}
                onClick={() => {
                  alert("Dados da consulta salvos no prontuário eletrônico SimplesVet!");
                  setEhrReport("");
                  setEhrPrescription("");
                  setInjected(false);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  injected 
                    ? "bg-[#E65F2B] text-white hover:bg-[#c24e20]" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Salvar Prontuário Nativo
              </button>
            </div>
          </div>

          {/* Chrome Extension Simulated Sidebar Panel Drawer (Locks Right) - 4 Cols */}
          <div className="lg:col-span-4 bg-slate-850 p-5 flex flex-col justify-between text-white border-l border-slate-700 relative overflow-hidden">
            
            {/* Background glowing aura */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Extension Header */}
            <div className="space-y-4 z-10 relative">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                    <VetmindLogo showText={false} size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-[12px] text-white tracking-widest uppercase">
                      Vetmind v2.0
                    </h4>
                    <p className="text-[8px] text-[#00E5FF] font-mono leading-none font-bold tracking-widest uppercase">
                      Chrome Extension Widget
                    </p>
                  </div>
                </div>
                {extensionOpen && (
                  <button
                    onClick={() => setExtensionOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status and instruction when waiting */}
              {!extensionOpen && !isProcessing && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">Aguardando gatilho...</p>
                    <p className="text-[10px] text-slate-400 px-4 leading-normal">
                      Clique no ícone flutuante do <span className="text-[#0052cc] font-black">Vetmind</span> dentro da caixa de texto da esquerda para abrir a análise automática do Copiloto.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isProcessing && (
                <div className="py-20 text-center space-y-4">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-clinical-blue rounded-full animate-spin"></div>
                    <div className="absolute inset-2 bg-gradient-to-tr from-clinical-blue to-purple-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                      VM
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-200 tracking-wider">Lendo Prontuário...</p>
                    <p className="text-[9px] text-slate-400 uppercase font-mono">Buscando consenso científico RAG</p>
                  </div>
                </div>
              )}

              {/* Success Result in Extension Drawer */}
              {extensionOpen && !isProcessing && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">Minuta Preparada</p>
                      <p className="text-[9px] text-emerald-100 font-medium leading-normal">
                        RAG analisou as queixas e exteve as melhores condutas e prescrições.
                      </p>
                    </div>
                  </div>

                  {/* Sample Preview inside Extension Container */}
                  <div className="space-y-3 bg-white/5 border border-white/15 p-3.5 rounded-xl text-slate-300 font-normal">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-[9px] font-black uppercase text-slate-400">Análise Estruturada</span>
                      <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold font-mono">SOAP Ok</span>
                    </div>
                    
                    <div className="space-y-2 text-[9.5px] leading-relaxed select-all">
                      <p><b>Subjetivo:</b> {selectedPreset === "otitis" ? "Prurido auditivo há 10d" : "Estrangúria felina"}</p>
                      <p><b>Objetivo:</b> {selectedPreset === "otitis" ? "Eritema bilateral grave" : "Bexigoma pétreo doloroso"}</p>
                      <p><b>Sugestão de Conduta:</b> Pronta para injeção direta.</p>
                    </div>
                  </div>

                  {/* Warning inside Chrome widget */}
                  <div className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 text-orange-200 text-[8.5px] font-semibold leading-relaxed">
                     ⚠️ <b>Aviso Legal:</b> Copiloto Vetmind não assume riscos civis de laudos. Cabe ao médico avaliar, modificar se achar necessário e assinar no sistema local.
                  </div>
                </div>
              )}
            </div>

            {/* Injetar button */}
            <div className="space-y-2 pt-4 border-t border-white/10 z-10 relative">
              <button
                disabled={!extensionOpen || isProcessing}
                onClick={handleInject}
                className={`w-full py-3 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  extensionOpen && !isProcessing
                    ? "bg-gradient-to-r from-clinical-blue to-blue-500 text-white shadow-xl hover:scale-[1.02] active:scale-95"
                    : "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                }`}
              >
                <Zap className="w-4 h-4" />
                Injetar Diretamente no SimplesVet
              </button>
              <p className="text-[8px] text-slate-500 text-center font-bold uppercase tracking-wider">
                Injeta diagnósticos e prescrições por ID em 0.2s
              </p>
            </div>
            
          </div>

        </div>
      </div>

      {/* Visual representation of why this scales */}
      <div className="bg-gradient-to-br from-[#003399]/10 to-indigo-50/50 border border-[#003399]/10 rounded-[2rem] p-8 lg:p-10">
        <h3 className="font-extrabold text-lg text-slate-900 leading-tight">Por que o Stage 2 é uma potência de escala comercial?</h3>
        <p className="text-xs text-slate-500 mt-1 font-semibold">
          Entender o fluxo de trabalho do veterinário elimina a maior objeção de vendas do SaaS do mercado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white/80 p-5 rounded-xl border border-blue-100/40">
            <h4 className="font-black text-rose-500 text-2xl leading-none">0%</h4>
            <p className="text-[10px] font-black text-rose-500 uppercase mt-1 tracking-widest leading-none">MUDANÇA DE ROTINA</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">O veterinário continua logado no CRM habitual dele sem ter que abrir outro painel de software para copiar dados.</p>
          </div>

          <div className="bg-white/80 p-5 rounded-xl border border-blue-100/40">
            <h4 className="font-black text-indigo-800 text-2xl leading-none">8.5 min</h4>
            <p className="text-[10px] font-black text-indigo-800 uppercase mt-1 tracking-widest leading-none">POUPADOS POR LAUDO</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">O preenchimento automático em 1 clique do SOAP, anamnese e prescrições acelera a rotina absurdamente.</p>
          </div>

          <div className="bg-white/80 p-5 rounded-xl border border-blue-100/40">
            <h4 className="font-black text-[#6B4EFF] text-2xl leading-none">ILIMITADAS</h4>
            <p className="text-[10px] font-black text-[#6B4EFF] uppercase mt-1 tracking-widest leading-none">SISTEMAS PARCEIROS</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Não há necessidade de APIs ou integrações com os donos do sistema de prontuários. A extensão do Chrome injeta o conteúdo no Client-side.</p>
          </div>

          <div className="bg-white/80 p-5 rounded-xl border border-blue-100/40">
            <h4 className="font-black text-emerald-600 text-2xl leading-none">ZERO</h4>
            <p className="text-[10px] font-black text-emerald-600 uppercase mt-1 tracking-widest leading-none">RISCO JURÍDICO IA</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">A extensão só preenche campos secundários. O veterinário revisa na tela do próprio software e assina o atendimento, mantendo a inteira responsabilidade ética profissional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline simple SVG text-cross components
function X(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
