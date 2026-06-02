import React, { useState, useRef } from 'react';
import { 
  Check, ArrowLeft, ArrowRight, BookOpen, Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Answers {
  role?: string;
  useIA?: string;
  trustIA?: string;
  hasSpecialist?: string;
  insomnia?: string;
  willTrustIfCited?: string;
}

export default function VoaVetQuiz() {
  const [cur, setCur] = useState<string>('0'); // '0' is intro, '1'-'6' are qs, 'i1' & 'i2' are insights, 'R' is result.
  const [hist, setHist] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  const FLOW: Record<string, string> = {
    '0': '1',
    '1': '2',
    'i1': '3',
    'i2': '6',
  };

  const PROG: Record<string, number> = {
    '0': 0, '1': 10, '2': 22, 'i1': 30,
    '3': 44, '4': 55, '5': 66, 'i2': 75,
    '6': 88, 'R': 100
  };

  const LABELS: Record<string, string> = {
    '1': '1/6', '2': '2/6', '3': '3/6',
    '4': '4/6', '5': '5/6', '6': '6/6',
  };

  const BTN_LABELS: Record<string, string> = {
    '0': 'Começar agora',
    'i1': 'Continuar →',
    'i2': 'Continuar →',
    'R': 'Garantir minha vaga →',
  };

  const go = (next: string) => {
    setHist(prev => [...prev, cur]);
    setCur(next);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const goBack = () => {
    if (hist.length === 0) return;
    const prev = hist[hist.length - 1];
    setHist(prev => prev.slice(0, -1));
    setCur(prev);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const handlePick = (qNum: number, value: string, next: string) => {
    const fieldMap: Record<number, keyof Answers> = {
      1: 'role',
      2: 'useIA',
      3: 'trustIA',
      4: 'hasSpecialist',
      5: 'insomnia',
      6: 'willTrustIfCited'
    };
    
    setAnswers(prev => ({
      ...prev,
      [fieldMap[qNum]]: value
    }));

    setTimeout(() => {
      go(next);
    }, 240);
  };

  const getInsight1Content = () => {
    const use = answers.useIA;
    if (use === 'nao') {
      return {
        title: 'Colegas já usam. Você vai chegar lá.',
        body: 'A adoção de IA na clínica veterinária cresceu 340% em 2024. A questão não é se você vai usar — é quando. E quando for, vai querer uma feita para veterinários.',
        stat: '340% de crescimento em 2024'
      };
    } else if (use === 'frequente') {
      return {
        title: 'Você não está sozinho nessa dúvida',
        body: '87% dos veterinários que usam IA relatam a mesma fricção: a resposta parece certa, mas falta algo para confiar de verdade.',
        stat: '87% sentem a mesma dúvida'
      };
    } else {
      return {
        title: 'Cada caso difícil merece um apoio confiável',
        body: 'Nos casos que travam, você precisa de um segundo raciocínio com fonte — não de uma resposta genérica sem referência clínica.',
        stat: 'Apoio clínico rastreável'
      };
    }
  };

  const getResultsContent = () => {
    const hasSpec = answers.hasSpecialist;
    const willTrust = answers.willTrustIfCited;

    if (hasSpec === 'nao') {
      return {
        title: <>Você precisa disso <em className="text-[#6B4EFF] not-italic font-black">mais do que imagina.</em></>,
        sub: 'Trabalhar sem rede de especialistas é a situação mais arriscada da clínica. A Voa.Vet é o especialista disponível às 22h, sem incomodar ninguém.'
      };
    } else if (willTrust === 'sim') {
      return {
        title: <>Você é o perfil <em className="text-[#6B4EFF] not-italic font-black">exato.</em></>,
        sub: 'Você já sabe o que falta: fonte rastreável. É exatamente isso que a Voa.Vet entrega. Cada diagnóstico com referência clínica verificável.'
      };
    } else if (willTrust === 'talvez') {
      return {
        title: <>O ceticismo é <em className="text-[#6B4EFF] not-italic font-black">bem-vindo aqui.</em></>,
        sub: 'A Voa.Vet foi construída para quem só acredita testando. Cancele se não entregar. Mas você vai querer ficar.'
      };
    } else {
      return {
        title: <>Você vai entender <em className="text-[#6B4EFF] not-italic font-black">quando precisar.</em></>,
        sub: 'A Voa.Vet é para quando a dúvida aparecer e não tiver ninguém para ligar. Garanta acesso agora e teste quando o momento chegar.'
      };
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setEmailSubmitted(true);
  };

  const handleBtn = () => {
    if (cur === 'R') return;
    const next = FLOW[cur];
    if (next) go(next);
  };

  const insight1 = getInsight1Content();
  const results = getResultsContent();

  return (
    <div className="w-full flex flex-col items-center justify-center p-0 md:p-6 select-none bg-slate-50/50 min-h-screen">
      
      {/* Interactive Top Banner with meta Info */}
      <div className="w-full max-w-[430px] mb-4 p-5 bg-[#6B4EFF]/5 border border-[#6B4EFF]/15 rounded-3xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[#6B4EFF]">
          <Sparkle className="w-4 h-4 animate-spin duration-3000" />
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">Demonstração Interativa</span>
        </div>
        <h3 className="text-sm font-black text-slate-800 leading-tight">Mockup de Conversão (Nebula Quiz)</h3>
        <p className="text-[11px] text-slate-500 leading-normal">
          Esta é a página estática de marketing e captura de leads do <b>Voa.Vet</b>. Alinhada integralmente ao design de alta fidelidade.
        </p>
        {cur !== '0' && (
          <button 
            onClick={() => { setCur('0'); setHist([]); setAnswers({}); setEmailSubmitted(false); setEmail(''); }}
            className="mt-2 text-[10px] font-bold text-[#6B4EFF] uppercase tracking-wider text-left hover:underline"
          >
            ← Reiniciar simulação do funil
          </button>
        )}
      </div>

      {/* Main smartphone Frame enclosure on Desktop, Full fluid on Mobile */}
      <div className="w-full max-w-[430px] h-[100vh] md:h-[840px] bg-white rounded-none md:rounded-[3rem] border-0 md:border-[12px] md:border-slate-900 md:shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
        
        {/* TOP BAR */}
        <div className="flex-shrink-0 px-5 pt-5 pb-2 flex items-center justify-between relative z-10 bg-white">
          <button 
            onClick={goBack}
            className={`text-[#6B4EFF] text-4xl leading-none font-light h-10 w-10 flex items-center justify-start transition-opacity active:scale-95 ${cur === '0' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            ‹
          </button>
          <div className="w-9 h-9 bg-[#1A1A2E] rounded-[10px] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <button className="text-[#1A1A2E] text-2xl h-10 w-10 flex items-center justify-end leading-none active:scale-95">
            ☰
          </button>
        </div>

        {/* PROGRESS ROW */}
        <div className="flex-shrink-0 px-5 pt-1 pb-3 flex items-center gap-3 bg-white">
          <div className={`text-[13px] text-[#9B9BB5] font-normal whitespace-nowrap leading-none transition-all ${LABELS[cur] ? 'opacity-100' : 'opacity-0 scale-95 w-0 overflow-hidden'}`}>
            Sobre você <span className="text-[#6B4EFF] font-semibold">{LABELS[cur]}</span>
          </div>
          <div className="flex-1 h-[3px] bg-[#EEEEF5] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#6B4EFF] to-[#8B72FF] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${PROG[cur] || 0}%` }}
            />
          </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-white"
          style={{ scrollbarWidth: 'none' }}
        >
          <AnimatePresence mode="wait">
            
            {/* S0: INTRO SCREEN */}
            {cur === '0' && (
              <motion.div 
                key="s0"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-8 pb-10 flex flex-col min-h-full"
              >
                <div className="flex justify-center mb-8">
                  <div className="w-[72px] h-[72px] bg-[#F0EDFF] rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-3xl">🐾</span>
                  </div>
                </div>
                
                <div className="flex justify-center mb-5">
                  <div className="inline-flex items-center gap-1.5 bg-[#E6FAF4] rounded-full px-4 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#00C48C] tracking-wider uppercase">IA clínica veterinária</span>
                  </div>
                </div>

                <h1 className="text-[30px] font-extrabold leading-[1.15] text-[#1A1A2E] tracking-tight text-center mb-3">
                  Você ainda<br />confia <em className="text-[#6B4EFF] not-italic font-black">100%</em><br />na IA?
                </h1>
                
                <p className="text-[15px] text-[#9B9BB5] text-center leading-[1.6] mb-8 font-normal max-w-[320px] mx-auto">
                  6 perguntas para descobrir se a Voa.Vet resolve sua dor clínica de verdade.
                </p>

                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  <span className="bg-[#F7F7FB] border border-[#EEEEF5] text-[#3D3D5C] text-[12px] font-medium px-3.5 py-1.5 rounded-full">
                    🧬 Diagnóstico diferencial
                  </span>
                  <span className="bg-[#F7F7FB] border border-[#EEEEF5] text-[#3D3D5C] text-[12px] font-medium px-3.5 py-1.5 rounded-full">
                    📚 Fontes rastreáveis
                  </span>
                  <span className="bg-[#F7F7FB] border border-[#EEEEF5] text-[#3D3D5C] text-[12px] font-medium px-3.5 py-1.5 rounded-full">
                    🐾 Por veterinário
                  </span>
                </div>
              </motion.div>
            )}

            {/* S1: ROLE QUESTION */}
            {cur === '1' && (
              <motion.div 
                key="s1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <p className="text-[11px] font-semibold text-[#9B9BB5] uppercase tracking-wider mb-2">Sobre você</p>
                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">Eu sou...</h2>
                <p className="text-[15px] text-[#9B9BB5] leading-normal mb-6 font-normal">Isso ajuda a calibrar o escopo principal do raciocínio.</p>
                
                <div className="flex flex-col gap-2.5">
                  {[
                    { id: 'clinico', emoji: '🩺', label: 'Clínico geral', desc: 'Atendo pequenos e/ou grandes animais' },
                    { id: 'especialista', emoji: '🔬', label: 'Especialista', desc: 'Dermatologia, oncologia, neurologia etc.' },
                    { id: 'residente', emoji: '🎓', label: 'Residente ou recém-formado', desc: 'Ainda nos primeiros anos de carreira' }
                  ].map((opt) => {
                    const isSel = answers.role === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handlePick(1, opt.id, '2')}
                        className={`bg-[#F7F7FB] border-[1.5px] rounded-[16px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${isSel ? 'border-[#6B4EFF] bg-[#6B4EFF]/[0.08]' : 'border-[#F7F7FB]'}`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm transition-colors ${isSel ? 'bg-[#F0EDFF]' : ''}`}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[15px] text-[#1A1A2E] leading-tight">{opt.label}</div>
                          <div className="font-normal text-[13px] text-[#9B9BB5] mt-1 leading-snug">{opt.desc}</div>
                        </div>
                        <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-[#6B4EFF] border-[#6B4EFF]' : 'border-[#EEEEF5]'}`}>
                          {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* S2: USE IA IN CLINIC */}
            {cur === '2' && (
              <motion.div 
                key="s2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <p className="text-[11px] font-semibold text-[#9B9BB5] uppercase tracking-wider mb-2">Dia a dia</p>
                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">Você usa IA<br />na clínica?</h2>
                <p className="text-[15px] text-[#9B9BB5] leading-normal mb-6 font-normal">Seja para elaboração rápida ou diagnóstico estático.</p>
                
                <div className="flex flex-col gap-2.5">
                  {[
                    { id: 'frequente', emoji: '✅', label: 'Sim, uso com frequência', desc: 'ChatGPT, Gemini — mando casos e exames' },
                    { id: 'as-vezes', emoji: '🤔', label: 'Às vezes, quando trava', desc: 'Casos difíceis ou fora da minha área' },
                    { id: 'nao', emoji: '📚', label: 'Não uso IA ainda', desc: 'Prefiro literatura e colegas' }
                  ].map((opt) => {
                    const isSel = answers.useIA === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handlePick(2, opt.id, 'i1')}
                        className={`bg-[#F7F7FB] border-[1.5px] rounded-[16px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${isSel ? 'border-[#6B4EFF] bg-[#6B4EFF]/[0.08]' : 'border-[#F7F7FB]'}`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm transition-colors ${isSel ? 'bg-[#F0EDFF]' : ''}`}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[15px] text-[#1A1A2E] leading-tight">{opt.label}</div>
                          <div className="font-normal text-[13px] text-[#9B9BB5] mt-1 leading-snug">{opt.desc}</div>
                        </div>
                        <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-[#6B4EFF] border-[#6B4EFF]' : 'border-[#EEEEF5]'}`}>
                          {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* INSIGHT 1 SCREEN */}
            {cur === 'i1' && (
              <motion.div 
                key="si1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <h2 className="text-[24px] font-extrabold leading-[1.25] text-[#1A1A2E] tracking-tight mb-3">
                  {insight1.title}
                </h2>
                <p className="text-[15px] text-[#9B9BB5] leading-[1.6] mb-[28px] font-normal" dangerouslySetInnerHTML={{ __html: insight1.body }} />
                
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 bg-[#F0EDFF] rounded-full px-4 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6B4EFF]" />
                    <span className="text-[13px] font-semibold text-[#6B4EFF]">{insight1.stat}</span>
                  </div>
                </div>

                {/* SVG Balance Scale from HTML */}
                <div className="flex-1 flex items-center justify-center py-4 min-h-[200px]">
                  <svg className="block mx-auto" width="220" height="190" viewBox="0 0 220 190" fill="none">
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#8B72FF"/>
                        <stop offset="100%" stopColor="#6B4EFF"/>
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#FF6B9D"/>
                        <stop offset="100%" stopColor="#FF4080"/>
                      </linearGradient>
                    </defs>
                    <polygon points="110,150 85,185 135,185" fill="url(#g1)" opacity=".25"/>
                    <rect x="105" y="115" width="10" height="38" rx="5" fill="url(#g1)" opacity=".5"/>
                    <rect x="30" y="110" width="160" height="8" rx="4" fill="url(#g1)"/>
                    <circle cx="55" cy="78" r="32" fill="url(#g1)" opacity=".85"/>
                    <text x="55" y="85" textAnchor="middle" fontSize="22" fill="white">🤔</text>
                    <circle cx="165" cy="60" r="32" fill="url(#g2)" opacity=".85"/>
                    <text x="165" y="67" textAnchor="middle" fontSize="22" fill="white">✓</text>
                    <text x="55" y="127" textAnchor="middle" fontFamily="Inter" fontSize="10" fontWeight="600" fill="#9B9BB5">Dúvida</text>
                    <text x="165" y="127" textAnchor="middle" fontFamily="Inter" fontSize="10" fontWeight="600" fill="#9B9BB5">Confiança</text>
                  </svg>
                </div>
              </motion.div>
            )}

            {/* S3: TRUST IA SCREEN */}
            {cur === '3' && (
              <motion.div 
                key="s3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <p className="text-[11px] font-semibold text-[#9B9BB5] uppercase tracking-wider mb-2">Diagnóstico</p>
                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">Quando a IA<br />responde, você<br />confia 100%?</h2>
                
                <div className="flex flex-col gap-2.5 pt-4">
                  {[
                    { id: 'nao', emoji: '😬', label: 'Não. Fico com aquela dúvida', desc: 'Inventou? É protocolo humano?' },
                    { id: 'mais-ou-menos', emoji: '😐', label: 'Mais ou menos', desc: 'Uso como ponto de partida, mas verifico' },
                    { id: 'sim', emoji: '😎', label: 'Confio bastante', desc: 'Raramente questiono o resultado' }
                  ].map((opt) => {
                    const isSel = answers.trustIA === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handlePick(3, opt.id, '4')}
                        className={`bg-[#F7F7FB] border-[1.5px] rounded-[16px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${isSel ? 'border-[#6B4EFF] bg-[#6B4EFF]/[0.08]' : 'border-[#F7F7FB]'}`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm transition-colors ${isSel ? 'bg-[#F0EDFF]' : ''}`}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[15px] text-[#1A1A2E] leading-tight">{opt.label}</div>
                          <div className="font-normal text-[13px] text-[#9B9BB5] mt-1 leading-snug">{opt.desc}</div>
                        </div>
                        <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-[#6B4EFF] border-[#6B4EFF]' : 'border-[#EEEEF5]'}`}>
                          {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* S4: HAS SPECIALIST SCREEN */}
            {cur === '4' && (
              <motion.div 
                key="s4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <p className="text-[11px] font-semibold text-[#9B9BB5] uppercase tracking-wider mb-2">Sua rotina</p>
                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">Você tem<br />especialista para<br />consultar às 22h?</h2>
                
                <div className="flex flex-col gap-2.5 pt-4">
                  {[
                    { id: 'nao', emoji: '🏝️', label: 'Não — estou por conta própria', desc: 'Interior, clínica solo, sem rede' },
                    { id: 'as-vezes', emoji: '📱', label: 'Às vezes, mas não gosto de incomodar', desc: 'Reservo para emergências reais' },
                    { id: 'sim', emoji: '🤝', label: 'Sim, tenho boa rede de apoio', desc: 'Clínica com especialistas ou equipe' }
                  ].map((opt) => {
                    const isSel = answers.hasSpecialist === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handlePick(4, opt.id, '5')}
                        className={`bg-[#F7F7FB] border-[1.5px] rounded-[16px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${isSel ? 'border-[#6B4EFF] bg-[#6B4EFF]/[0.08]' : 'border-[#F7F7FB]'}`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm transition-colors ${isSel ? 'bg-[#F0EDFF]' : ''}`}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[15px] text-[#1A1A2E] leading-tight">{opt.label}</div>
                          <div className="font-normal text-[13px] text-[#9B9BB5] mt-1 leading-snug">{opt.desc}</div>
                        </div>
                        <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-[#6B4EFF] border-[#6B4EFF]' : 'border-[#EEEEF5]'}`}>
                          {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* S5: INSOMNIA SCREEN */}
            {cur === '5' && (
              <motion.div 
                key="s5"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <p className="text-[11px] font-semibold text-[#9B9BB5] uppercase tracking-wider mb-2">Confiança</p>
                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">Já ficou sem<br />dormir por dúvida<br />num diagnóstico?</h2>
                
                <div className="flex flex-col gap-2.5 pt-4">
                  {[
                    { id: 'frequente', emoji: '😩', label: 'Sim, acontece com frequência', desc: 'Faz parte da rotina, mas pesa' },
                    { id: 'raro', emoji: '😓', label: 'Sim, em casos graves ou complexos', desc: 'Fora da minha especialidade' },
                    { id: 'nao', emoji: '😴', label: 'Não, consigo desligar', desc: 'Deixo o trabalho no trabalho' }
                  ].map((opt) => {
                    const isSel = answers.insomnia === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handlePick(5, opt.id, 'i2')}
                        className={`bg-[#F7F7FB] border-[1.5px] rounded-[16px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${isSel ? 'border-[#6B4EFF] bg-[#6B4EFF]/[0.08]' : 'border-[#F7F7FB]'}`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm transition-colors ${isSel ? 'bg-[#F0EDFF]' : ''}`}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[15px] text-[#1A1A2E] leading-tight">{opt.label}</div>
                          <div className="font-normal text-[13px] text-[#9B9BB5] mt-1 leading-snug">{opt.desc}</div>
                        </div>
                        <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-[#6B4EFF] border-[#6B4EFF]' : 'border-[#EEEEF5]'}`}>
                          {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* INSIGHT 2 SCREEN */}
            {cur === 'i2' && (
              <motion.div 
                key="si2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <h2 className="text-[24px] font-extrabold leading-[1.25] text-[#1A1A2E] tracking-tight mb-3">
                  Ter fonte rastreável<br />muda tudo
                </h2>
                <p className="text-[15px] text-[#9B9BB5] leading-[1.60] mb-[28px] font-normal">
                  Quando cada diagnóstico vem com <strong>artigo, diretriz ou manual citado</strong>, você para de gastar tempo verificando e começa a confiar de verdade.
                </p>
                
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 bg-[#E6FAF4] rounded-full px-4 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
                    <span className="text-[13px] font-bold text-[#00C48C]">WSAVA · ACVIM · Nelson & Couto</span>
                  </div>
                </div>

                {/* SVG Brain/Docs from HTML */}
                <div className="flex-1 flex items-center justify-center py-4 min-h-[200px]">
                  <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                    <defs>
                      <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F0EDFF"/>
                        <stop offset="100%" stopColor="#E6FAF4"/>
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" fill="url(#bg-grad)"/>
                    {/* Doc 1 */}
                    <rect x="48" y="58" width="52" height="66" rx="8" fill="white" className="shadow"/>
                    <rect x="56" y="72" width="36" height="4" rx="2" fill="#E0DBFF"/>
                    <rect x="56" y="82" width="28" height="4" rx="2" fill="#E0DBFF"/>
                    <rect x="56" y="92" width="32" height="4" rx="2" fill="#E0DBFF"/>
                    <rect x="56" y="102" width="24" height="4" rx="2" fill="#E0DBFF"/>
                    <circle cx="68" cy="64" r="6" fill="#6B4EFF" opacity=".2"/>
                    <text x="68" y="68" textAnchor="middle" fontSize="8" fill="#6B4EFF" fontWeight="700">✓</text>
                    {/* Doc 2 */}
                    <rect x="100" y="76" width="52" height="66" rx="8" fill="white" className="shadow"/>
                    <rect x="108" y="90" width="36" height="4" rx="2" fill="#D0F5E8"/>
                    <rect x="108" y="100" width="28" height="4" rx="2" fill="#D0F5E8"/>
                    <rect x="108" y="110" width="32" height="4" rx="2" fill="#D0F5E8"/>
                    <rect x="108" y="120" width="20" height="4" rx="2" fill="#D0F5E8"/>
                    <circle cx="114" cy="84" r="6" fill="#00C48C" opacity=".2"/>
                    <text x="114" y="88" textAnchor="middle" fontSize="8" fill="#00C48C" fontWeight="700">✓</text>
                    {/* Checkmark badge */}
                    <circle cx="140" cy="68" r="18" fill="#00C48C"/>
                    <text x="140" y="75" textAnchor="middle" fontSize="18" fill="white">✓</text>
                  </svg>
                </div>
              </motion.div>
            )}

            {/* S6: FINAL Q SCREEN */}
            {cur === '6' && (
              <motion.div 
                key="s6"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <p className="text-[11px] font-semibold text-[#9B9BB5] uppercase tracking-wider mb-2">Última pergunta</p>
                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">Se cada hipótese<br />viesse com fonte<br />rastreável...</h2>
                
                <div className="flex flex-col gap-2.5 pt-4">
                  {[
                    { id: 'sim', emoji: '💡', label: 'Mudaria tudo para mim', desc: 'É exatamente o que falta para confiar' },
                    { id: 'talvez', emoji: '🤷', label: 'Talvez — preciso ver funcionando', desc: 'Só acredito testando' },
                    { id: 'nao', emoji: '😑', label: 'Não muito — tenho meu fluxo', desc: 'Prefiro verificar do meu jeito' }
                  ].map((opt) => {
                    const isSel = answers.willTrustIfCited === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => handlePick(6, opt.id, 'R')}
                        className={`bg-[#F7F7FB] border-[1.5px] rounded-[16px] p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${isSel ? 'border-[#6B4EFF] bg-[#6B4EFF]/[0.08]' : 'border-[#F7F7FB]'}`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm transition-colors ${isSel ? 'bg-[#F0EDFF]' : ''}`}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[15px] text-[#1A1A2E] leading-tight">{opt.label}</div>
                          <div className="font-normal text-[13px] text-[#9B9BB5] mt-1 leading-snug">{opt.desc}</div>
                        </div>
                        <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-[#6B4EFF] border-[#6B4EFF]' : 'border-[#EEEEF5]'}`}>
                          {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* RESULTS SCREEN */}
            {cur === 'R' && (
              <motion.div 
                key="sR"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="px-5 pt-5 pb-8 flex flex-col min-h-full"
              >
                <div className="flex justify-center mb-[24px]">
                  <div className="w-[80px] h-[80px] bg-[#F0EDFF] rounded-full flex flex-col items-center justify-center relative">
                    <div className="w-14 h-14 bg-[#6B4EFF]/10 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🐾</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start mb-4">
                  <div className="inline-flex items-center gap-1.5 bg-[#E6FAF4] rounded-full px-4 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
                    <span className="text-[11px] font-extrabold text-[#00C48C] tracking-wider uppercase">Perfil identificado</span>
                  </div>
                </div>

                <h2 className="text-[26px] font-extrabold leading-[1.2] text-[#1A1A2E] tracking-tight mb-2">
                  {results.title}
                </h2>
                
                <p className="text-[15px] text-[#9B9BB5] leading-[1.55] mb-[24px] font-normal" id="r-sub">
                  {results.sub}
                </p>

                {/* Social proof initial circles and total */}
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="flex -space-x-1.5 shrink-0">
                    <div className="w-[26px] h-[26px] rounded-full bg-[#F0EDFF] text-[#6B4EFF] text-[9px] font-bold flex items-center justify-center border-2 border-white">MF</div>
                    <div className="w-[26px] h-[26px] rounded-full bg-[#EBF3FB] text-[#185FA5] text-[9px] font-bold flex items-center justify-center border-2 border-white">RC</div>
                    <div className="w-[26px] h-[26px] rounded-full bg-[#FEF0E6] text-[#C45C0A] text-[9px] font-bold flex items-center justify-center border-2 border-white">PL</div>
                    <div className="w-[26px] h-[26px] rounded-full bg-[#F5EBF7] text-[#8B3A9E] text-[9px] font-bold flex items-center justify-center border-2 border-white">TA</div>
                  </div>
                  <span className="text-[13px] text-[#9B9BB5] leading-none font-normal">
                    <strong className="text-[#1A1A2E] font-semibold">38 veterinários</strong> já garantiram acesso
                  </span>
                </div>

                {/* CHECKOUT CARD */}
                <div className="bg-[#F7F7FB] rounded-[20px] p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-[#F0EDFF] text-[#6B4EFF] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      ⚡ Early access · 12 vagas
                    </span>
                    <span className="bg-[#FFF0F5] text-[#D4267A] text-[11px] font-bold px-3 py-1 rounded-full">
                      −34%
                    </span>
                  </div>

                  <div className="text-[44px] font-extrabold text-[#1A1A2E] tracking-tight leading-none mb-1">
                    <sup className="text-lg font-bold">R$</sup>97<span className="text-[20px] font-medium text-[#9B9BB5]">/mês</span>
                  </div>

                  <p className="text-[13px] text-[#9B9BB5] font-normal mb-5">
                    Era <s className="text-[#9B9BB5]">R$147/mês</s> — preço travado para sempre
                  </p>

                  <ul className="space-y-3.5 text-[#3D3D5C] text-[13px] font-medium">
                    {[
                      'Casos ilimitados com diferenciais ranqueados',
                      'Fontes clínicas rastreáveis em cada resposta',
                      'Análise de imagens e PDFs de exames',
                      'Memória de pacientes entre consultas',
                      'Preço travado para sempre'
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="text-[#00C48C] font-extrabold text-sm leading-none shrink-0">✓</span>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Email submission input and verification inside simulator container */}
                {!emailSubmitted ? (
                  <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3">
                    <input 
                      type="email" 
                      placeholder="seu@email.com" 
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                      className={`w-full p-[14.5px] bg-[#F7F7FB] border-[1.5px] rounded-xl text-[15px] text-[#1A1A2E] placeholder-[#9B9BB5] outline-none transition-all ${emailError ? 'border-red-400 bg-red-50/20' : 'border-[#EEEEF5] focus:border-[#6B4EFF] focus:bg-white'}`}
                    />
                    <button 
                      type="submit"
                      className="w-full py-4.5 bg-gradient-to-r from-[#00C48C] to-[#00956A] text-white rounded-xl text-center font-bold text-sm tracking-wide shadow-lg shadow-[#00C48C]/15 active:scale-[0.98] transition-all"
                    >
                      Garantir minha vaga →
                    </button>
                    <p className="text-[12px] text-[#9B9BB5] text-center leading-[1.5] mt-1">
                      🔒 Cancele quando quiser · Sem contrato · Sem taxa de saída
                    </p>
                  </form>
                ) : (
                  <div className="bg-[#E6FAF4] border border-[#00C48C]/15 rounded-2xl p-5 text-center flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                    <div className="w-[44px] h-[44px] bg-[#00C48C] text-white rounded-full flex items-center justify-center text-xl shadow shadow-[#00C48C]/40">
                      ✓
                    </div>
                    <h4 className="text-[13px] font-black text-[#1A1A2E] uppercase tracking-wider">Vaga Assegurada!</h4>
                    <p className="text-[12px] text-[#3D3D5C] leading-[1.6]">
                      O link de acesso especial para o onboarding da <b>Voa.Vet</b> foi despachado para <span className="font-semibold text-[#1A1A2E]">{email}</span>.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* STICKY BOTTOM BUTTON */}
        {cur !== 'R' && (
          <div className="flex-shrink-0 p-5 bg-white border-t border-[#EEEEF5] relative z-10">
            <button 
              onClick={handleBtn}
              className="w-full py-[17px] bg-gradient-to-r from-[#6B4EFF] to-[#4B2FC7] hover:scale-[1.01] active:scale-[0.99] transition-all text-white border-none rounded-xl font-bold text-[16px] tracking-tight shadow-xl shadow-[#6B4EFF]/20"
            >
              {BTN_LABELS[cur] || 'Continuar →'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
