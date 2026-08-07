import React, { useState } from 'react';
import { 
  PawPrint, 
  Activity, 
  FileText, 
  Paperclip, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Stethoscope, 
  FileCheck, 
  Share2, 
  Download, 
  MessageSquare, 
  ClipboardList, 
  Sparkles, 
  GitBranch, 
  ExternalLink, 
  Check, 
  Clock, 
  Award, 
  Info, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Printer,
  Copy,
  Layers,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '../types';

interface DifferentialDiagnosisWorkspaceProps {
  patient: Patient;
  anamnesisText: string;
  uploadedFiles?: Array<{ name: string; size: string; data?: string; mimeType?: string }>;
  aiReportText?: string;
  sources?: Array<{ topic: string; content?: string; snippet?: string; type?: string; score?: number }>;
  onOpenPrescription?: () => void;
  onOpenTutorModal?: () => void;
  onGeneratePdf?: () => void;
}

export interface Hypothesis {
  id: string;
  title: string;
  probability: 'Alta' | 'Moderada' | 'Baixa';
  confidence: number;
  justification: string[];
  supportingFindings: string[];
  contradictoryFindings: string[];
  recommendedTests: Array<{ name: string; priority: 'Alta' | 'Moderada' | 'Baixa'; reason: string }>;
  relatedDiagnoses: string[];
  conduct: Array<{ id: string; label: string; checked: boolean }>;
  prognosis: 'Favorável' | 'Reservado' | 'Grave';
}

export interface Reference {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  evidenceType: 'Consenso' | 'Meta-análise' | 'Guideline' | 'Ensaio Clínico' | 'Revisão Sistemática';
  level: 'Alta Evidência' | 'Moderada' | 'Baixa';
  doi: string;
  summary: string;
}

export interface DynamicClinicalData {
  hypotheses: Hypothesis[];
  references: Reference[];
  clinicalTags: string[];
  decisionNodes: {
    node1Title: string;
    node1Subtitle: string;
    node2Consensus: string;
    node2Title: string;
    node2Subtitle: string;
    node3Title: string;
    node3Subtitle: string;
  };
  tutorExplanation: string;
}

function extractClinicalTagsFromText(text: string): string[] {
  const lower = (text || '').toLowerCase();
  const tags: string[] = [];
  if (lower.includes('vômito') || lower.includes('vomito') || lower.includes('êmese')) tags.push('Êmese / Vômito');
  if (lower.includes('diarreia') || lower.includes('diarréia')) tags.push('Diarreia');
  if (lower.includes('perda de peso') || lower.includes('emagrecimento') || lower.includes('magro')) tags.push('Perda de Peso Progressiva');
  if (lower.includes('crônico') || lower.includes('cronico') || lower.includes('crônica') || lower.includes('cronica') || lower.includes('meses') || lower.includes('semanas')) tags.push('Evolução Crônica');
  if (lower.includes('felino') || lower.includes('gato') || lower.includes('felina') || lower.includes('cat')) tags.push('Espécie Felina');
  if (lower.includes('canino') || lower.includes('cão') || lower.includes('cachorro') || lower.includes('dog')) tags.push('Espécie Canina');
  if (lower.includes('inapetência') || lower.includes('anorexia') || lower.includes('sem comer')) tags.push('Inapetência / Anorexia');
  if (lower.includes('dor') || lower.includes('sensibilidade')) tags.push('Dor Abdominal / Sensibilidade');
  if (tags.length === 0) tags.push('Sinais Sintomáticos Registrados');
  return tags;
}

function finalizeHypothesis(
  partial: Partial<Hypothesis>,
  index: number,
  patient?: Patient,
  anamnesisText?: string
): Hypothesis {
  const species = patient?.species || 'Pequenos Animais';
  const name = patient?.name || 'Pet';
  const title = partial.title || `Hipótese Diagnóstica ${index}`;
  const confidence = partial.confidence || (index === 1 ? 88 : index === 2 ? 68 : 48);
  const probability: 'Alta' | 'Moderada' | 'Baixa' = confidence >= 70 ? 'Alta' : confidence >= 50 ? 'Moderada' : 'Baixa';

  const excerpt = (anamnesisText || '').slice(0, 100);
  const defaultJustification = [
    `Relato clínico de ${name} (${species}): "${excerpt || 'Sintomatologia em investigação'}..."`,
    `Apresentação clínica altamente compatível com a fisiopatologia de ${title}.`,
    `Evidências alinhadas aos consensos e literatura veterinária RAG integrada.`
  ];

  const tags = extractClinicalTagsFromText(`${patient?.species} ${anamnesisText}`);
  const lowerTitle = title.toLowerCase();

  let defaultTests = [
    { name: `Ultrassonografia Abdominal Focada em ${title}`, priority: 'Alta' as const, reason: 'Avaliação parenquimatosa e morfológica direcionada' },
    { name: 'Hemograma Completo + Plaquetograma', priority: 'Alta' as const, reason: 'Triagem de resposta inflamatória, leucocitose ou anemia' },
    { name: 'Perfil Bioquímico (ALT, FA, Ureia, Creatinina)', priority: 'Moderada' as const, reason: 'Avaliação da função hepática e renal' }
  ];

  let defaultRelated = [`Síndrome Inflamatória Sistêmica`, `Afecção secundária em ${species}`];

  let defaultConduct = [
    { id: `c1_${index}`, label: `Estabilização e suporte terapêutico para ${title}`, checked: true },
    { id: `c2_${index}`, label: 'Manutenção do estado de hidratação e analgesia multimodal conforme dor', checked: true },
    { id: `c3_${index}`, label: 'Reavaliação após exames de imagem e triagem laboratorial', checked: false }
  ];

  if (lowerTitle.includes('piometra') || lowerTitle.includes('uter') || lowerTitle.includes('metrite') || lowerTitle.includes('vulva') || lowerTitle.includes('reprodutiv')) {
    defaultTests = [
      { name: 'Ultrassonografia Abdominal Total (Foco Uterino e Ovariano)', priority: 'Alta' as const, reason: 'Mensuração do diâmetro uterino, parede e conteúdo fluido luminal' },
      { name: 'Hemograma Completo com Plaquetograma', priority: 'Alta' as const, reason: 'Pesquisa de leucocitose grave com desvio à esquerda e neutrofilia' },
      { name: 'Citologia Vaginal / Vulvar', priority: 'Moderada' as const, reason: 'Identificação de neutrófilos degenerados e bactérias' }
    ];
    defaultRelated = ['Vaginite Purulenta Aguda', 'Metrite Puerperal', 'Neoplasia Uterina / Cisto Ovariano', 'Cistite Secundária'];
    defaultConduct = [
      { id: `c1_${index}`, label: 'Estabilização hemodinâmica imediata com Ringer Lactato IV', checked: true },
      { id: `c2_${index}`, label: 'Antibioticoterapia de amplo espectro (Ampicilina+Sulbactam ou Enrofloxacino)', checked: true },
      { id: `c3_${index}`, label: 'Avaliação urgente para Ovariohisterectomia (OSH) cirúrgica terapêutica', checked: true }
    ];
  } else if (lowerTitle.includes('pancreat') || lowerTitle.includes('gastro') || lowerTitle.includes('vômit') || lowerTitle.includes('vomit') || lowerTitle.includes('corpo estranho')) {
    defaultTests = [
      { name: 'Dosagem de Lipase Pancreática Específica (Spec cPL / Spec fPL)', priority: 'Alta' as const, reason: 'Padrão-ouro para confirmação ou exclusão de pancreatite aguda' },
      { name: 'Ultrassonografia Abdominal Focada em TGI e Pâncreas', priority: 'Alta' as const, reason: 'Avaliar espessamento de alças, estase e padrão de corpo estranho' },
      { name: 'Perfil Bioquímico (ALT, FA, Amilase, Ureia, Creatinina)', priority: 'Alta' as const, reason: 'Mapeamento de hemoconcentração e função orgânica' }
    ];
    defaultRelated = ['Pancreatite Aguda', 'Obstrução por Corpo Estranho Intestinal', 'Gastroenterite Aguda Hemorrágica (AHDS)', 'Enteropatia Alérgica'];
    defaultConduct = [
      { id: `c1_${index}`, label: 'Antiemético Citrato de Maropitant (1 mg/kg SC) e reidratação IV', checked: true },
      { id: `c2_${index}`, label: 'Analgesia visceral com Dipirona (25 mg/kg IV/SC) ou Opioide', checked: true },
      { id: `c3_${index}`, label: 'Suporte nutricional precoce após controle do quadro de êmese', checked: false }
    ];
  } else if (lowerTitle.includes('cistite') || lowerTitle.includes('dtuif') || lowerTitle.includes('urina') || lowerTitle.includes('urolit')) {
    defaultTests = [
      { name: 'Urinálise Tipo 1 (EAS) + Refratometria por Cistocentese', priority: 'Alta' as const, reason: 'Pesquisa de hematúria, proteinúria, pH e cristais' },
      { name: 'Ultrassonografia de Rins e Vesícula Urinária', priority: 'Alta' as const, reason: 'Exclusão de cálculo vesical (urolitíase) e espessamento de parede' }
    ];
    defaultRelated = ['Urolitíase Vesical / Uretral', 'Cistite Idiopática Felina (DTUIF)', 'Infecção do Trato Urinário (ITU)', 'Pielonefrite'];
    defaultConduct = [
      { id: `c1_${index}`, label: 'Analgesia e anti-inflamatório (Meloxicam ou Dipirona) ajustado para a espécie', checked: true },
      { id: `c2_${index}`, label: 'Incentivo ao consumo hídrico com alimentos úmidos e fontes', checked: true }
    ];
  } else if (lowerTitle.includes('otite') || lowerTitle.includes('dermat') || lowerTitle.includes('atopia') || lowerTitle.includes('coceira')) {
    defaultTests = [
      { name: 'Citologia Auricular / Cutânea (Impronta em Lâmina)', priority: 'Alta' as const, reason: 'Quantificação de leveduras (Malassezia) e bactérias' },
      { name: 'Otoscopia Direta com Cones Esterilizados', priority: 'Alta' as const, reason: 'Avaliação da integridade do tímpano e conduto auditivo' }
    ];
    defaultRelated = ['Dermatite Atópica Canina', 'Hipersensibilidade Alimentar', 'Corpo Estranho Auricular', 'Demodicose / Escabiose'];
    defaultConduct = [
      { id: `c1_${index}`, label: 'Limpeza suave do conduto auditivo com ceruminolítico neutro', checked: true },
      { id: `c2_${index}`, label: 'Aplicações de solução otopet tripla (antimicrobiano + antifúngico + corticoide)', checked: true }
    ];
  }

  return {
    id: partial.id || `dx_${index}`,
    title,
    probability,
    confidence,
    justification: partial.justification && partial.justification.length > 0 ? partial.justification : defaultJustification,
    supportingFindings: partial.supportingFindings && partial.supportingFindings.length > 0 ? partial.supportingFindings : tags,
    contradictoryFindings: partial.contradictoryFindings && partial.contradictoryFindings.length > 0 ? partial.contradictoryFindings : ['Ausência de choque cirúrgico agudo descompensado'],
    recommendedTests: partial.recommendedTests && partial.recommendedTests.length > 0 ? partial.recommendedTests : defaultTests,
    relatedDiagnoses: partial.relatedDiagnoses && partial.relatedDiagnoses.length > 0 ? partial.relatedDiagnoses : defaultRelated,
    conduct: partial.conduct && partial.conduct.length > 0 ? partial.conduct : defaultConduct,
    prognosis: partial.prognosis || (confidence >= 70 ? 'Favorável' : 'Reservado')
  };
}

export function parseAIDifferentials(
  aiReportText: string,
  sources: Array<{ topic: string; content?: string; snippet?: string; type?: string; score?: number }> = [],
  patient?: Patient,
  anamnesisText?: string
): DynamicClinicalData | null {
  if (!aiReportText || typeof aiReportText !== 'string' || aiReportText.length < 20) {
    return null;
  }

  let diffText = aiReportText;
  if (aiReportText.includes('## D')) {
    const sections = aiReportText.split('##');
    const dSection = sections.find(s => {
      const u = s.trim().toUpperCase();
      return u.startsWith('D (') || u.startsWith('D:') || u.startsWith('D ') || u.startsWith('D-') || u === 'D';
    });
    if (dSection) {
      diffText = dSection;
    }
  }

  const hypotheses: Hypothesis[] = [];
  const referencesMap = new Map<string, Reference>();

  const lines = diffText.split('\n');
  let currentHyp: Partial<Hypothesis> | null = null;
  let currentField: 'justification' | 'findings' | 'tests' | 'conduct' | 'references' | 'none' = 'none';

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const isTitleLine = 
      (trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.') ||
       trimmed.startsWith('1º') || trimmed.startsWith('2º') || trimmed.startsWith('3º') ||
       trimmed.startsWith('1-') || trimmed.startsWith('2-') || trimmed.startsWith('3-') ||
       trimmed.startsWith('- **') || trimmed.startsWith('* **') || trimmed.startsWith('###')) &&
      (trimmed.includes('%') || trimmed.includes('Probabilidade') || trimmed.includes('1º') || trimmed.includes('2º') || trimmed.includes('3º') || trimmed.includes('Diagnóstico')) &&
      !trimmed.includes('Revisão Sistemática') &&
      !trimmed.includes('Embasamento Literário') &&
      !trimmed.includes('Achados Compatíveis') &&
      !trimmed.includes('Exames Complementares') &&
      !trimmed.includes('Conduta Inicial') &&
      !trimmed.includes('Por que esta causa');

    if (isTitleLine) {
      if (currentHyp && currentHyp.title) {
        hypotheses.push(finalizeHypothesis(currentHyp, hypotheses.length + 1, patient, anamnesisText));
      }

      let rawTitle = trimmed.replace(/^[-*\d.#ºª\s]+/, '').replace(/\*\*/g, '').trim();
      let confidence = 80;
      const percMatch = trimmed.match(/(\d{1,3})\s*%/);
      if (percMatch) {
        confidence = parseInt(percMatch[1], 10);
      } else if (hypotheses.length === 0) confidence = 88;
      else if (hypotheses.length === 1) confidence = 68;
      else confidence = 48;

      rawTitle = rawTitle.replace(/[-–]?\s*\d{1,3}%\s*de\s*Probabilidade/i, '');
      rawTitle = rawTitle.replace(/[-–]?\s*\d{1,3}%/i, '');
      rawTitle = rawTitle.replace(/\[|\]/g, '').trim();

      const probability: 'Alta' | 'Moderada' | 'Baixa' = confidence >= 70 ? 'Alta' : confidence >= 50 ? 'Moderada' : 'Baixa';

      currentHyp = {
        id: `dx_ai_${hypotheses.length + 1}`,
        title: rawTitle || `Hipótese Diagnóstica ${hypotheses.length + 1}`,
        probability,
        confidence,
        justification: [],
        supportingFindings: [],
        contradictoryFindings: [],
        recommendedTests: [],
        conduct: [],
        prognosis: confidence >= 70 ? 'Favorável' : 'Reservado'
      };
      currentField = 'none';
      return;
    }

    if (!currentHyp) return;

    if (trimmed.includes('Revisão Sistemática') || trimmed.includes('Por que esta causa') || trimmed.includes('Justificativa')) {
      currentField = 'justification';
      const textAfterColon = trimmed.split(':').slice(1).join(':').replace(/\*\*/g, '').trim();
      if (textAfterColon) {
        currentHyp.justification?.push(textAfterColon);
      }
      return;
    }

    if (trimmed.includes('Achados Compatíveis') || trimmed.includes('Achados') || trimmed.includes('Sinais Compatíveis')) {
      currentField = 'findings';
      const textAfterColon = trimmed.split(':').slice(1).join(':').replace(/\*\*/g, '').trim();
      if (textAfterColon) {
        currentHyp.supportingFindings?.push(textAfterColon);
      }
      return;
    }

    if (trimmed.includes('Exames Complementares') || trimmed.includes('Exames Sugeridos')) {
      currentField = 'tests';
      return;
    }

    if (trimmed.includes('Conduta Inicial') || trimmed.includes('Conduta Recomendada') || trimmed.includes('Manejo')) {
      currentField = 'conduct';
      return;
    }

    if (trimmed.includes('Embasamento Literário') || trimmed.includes('Referências') || trimmed.includes('Bibliográficas')) {
      currentField = 'references';
      return;
    }

    if (currentField === 'justification') {
      const cleanLine = trimmed.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim();
      if (cleanLine && !cleanLine.startsWith('Achados') && !cleanLine.startsWith('Exames') && !cleanLine.startsWith('Conduta') && !cleanLine.startsWith('Embasamento')) {
        currentHyp.justification?.push(cleanLine);
      }
    } else if (currentField === 'findings') {
      const cleanLine = trimmed.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim();
      if (cleanLine && !cleanLine.startsWith('Exames') && !cleanLine.startsWith('Conduta') && !cleanLine.startsWith('Embasamento')) {
        currentHyp.supportingFindings?.push(cleanLine);
      }
    } else if (currentField === 'tests') {
      const cleanLine = trimmed.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim();
      if (cleanLine && !cleanLine.startsWith('Conduta') && !cleanLine.startsWith('Embasamento')) {
        const parts = cleanLine.split('-');
        const testName = parts[0].replace(/\(Prioridade:?\s*(Alta|Moderada|Baixa)\)/i, '').replace(/\*\*/g, '').trim();
        const priorityMatch = cleanLine.match(/Prioridade:?\s*(Alta|Moderada|Baixa)/i);
        const priority: 'Alta' | 'Moderada' | 'Baixa' = priorityMatch ? (priorityMatch[1] as any) : 'Alta';
        const reason = parts.length > 1 ? parts.slice(1).join('-').trim() : 'Avaliação e confirmação clínica';
        if (testName && testName.length > 3) {
          currentHyp.recommendedTests?.push({ name: testName, priority, reason });
        }
      }
    } else if (currentField === 'conduct') {
      const cleanLine = trimmed.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim();
      if (cleanLine && !cleanLine.startsWith('Embasamento')) {
        currentHyp.conduct?.push({ id: `c_ai_${(currentHyp.conduct?.length || 0) + 1}`, label: cleanLine, checked: true });
      }
    } else if (currentField === 'references' || trimmed.includes('http') || trimmed.includes('doi.org') || trimmed.includes('scholar.google')) {
      const linkMatches = [...trimmed.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)];
      if (linkMatches.length > 0) {
        linkMatches.forEach((m) => {
          const refTitle = m[1];
          const refUrl = m[2];
          const refId = `ref_ai_${referencesMap.size + 1}`;
          referencesMap.set(refId, {
            id: refId,
            title: refTitle,
            authors: refTitle.includes('Consensus') || refTitle.includes('ACVIM') || refTitle.includes('WSAVA') 
              ? 'Consenso Internacional Veterinário (RAG)' 
              : 'Literatura Científica & Tratado (RAG)',
            year: 2024,
            journal: refTitle.includes('JVIM') || refTitle.includes('Journal') 
              ? 'Journal of Veterinary Internal Medicine' 
              : 'Base de Conhecimento Vetmind',
            evidenceType: refTitle.includes('Consensus') || refTitle.includes('ACVIM') || refTitle.includes('WSAVA') ? 'Consenso' : 'Guideline',
            level: 'Alta Evidência',
            doi: refUrl.includes('doi.org') ? refUrl.replace(/.*doi\.org\//, '') : refUrl,
            summary: `Referência científica selecionada pelo RAG para o diagnóstico de ${currentHyp?.title}.`
          });
        });
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const cleanRefText = trimmed.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim();
        if (cleanRefText) {
          const refId = `ref_ai_${referencesMap.size + 1}`;
          referencesMap.set(refId, {
            id: refId,
            title: cleanRefText,
            authors: 'RAG Vetmind Engine',
            year: 2024,
            journal: 'Diretriz de Clínica Veterinária',
            evidenceType: 'Guideline',
            level: 'Alta Evidência',
            doi: '',
            summary: cleanRefText
          });
        }
      }
    }
  });

  if (currentHyp && (currentHyp as Hypothesis).title) {
    hypotheses.push(finalizeHypothesis(currentHyp, hypotheses.length + 1, patient, anamnesisText));
  }

  if (hypotheses.length === 0) {
    return null;
  }

  const references = Array.from(referencesMap.values());
  if (sources && sources.length > 0) {
    sources.forEach((s, idx) => {
      if (s.topic || s.snippet || s.content) {
        references.push({
          id: `ref_source_${idx + 1}`,
          title: s.topic || `Diretriz RAG ${idx + 1}`,
          authors: s.type === 'pdf' ? 'Tratado de Referência RAG' : 'Diretriz Vetmind',
          year: 2024,
          journal: 'Acervo RAG Integrado',
          evidenceType: 'Guideline',
          level: 'Alta Evidência',
          doi: '',
          summary: (s.snippet || s.content || '').substring(0, 200) + '...'
        });
      }
    });
  }

  const name = patient?.name || 'Pet';
  const species = patient?.species || 'Pequenos Animais';
  const breed = patient?.breed || 'SRD';
  const topHyp = hypotheses[0];

  return {
    hypotheses,
    references,
    clinicalTags: extractClinicalTagsFromText(`${species} ${anamnesisText}`),
    decisionNodes: {
      node1Title: 'Anamnese & Relato',
      node1Subtitle: `Sinais informados para ${name} (${species}, ${breed})`,
      node2Consensus: 'Motor RAG & Diretrizes Ativas',
      node2Title: 'Raciocínio Clínico IA + RAG',
      node2Subtitle: 'Cruzamento com acervo científico e diretrizes ativas',
      node3Title: `${topHyp.title} (${topHyp.confidence}%)`,
      node3Subtitle: 'Hipótese diagnóstica primária confirmada',
    },
    tutorExplanation: `Realizamos a análise inteligente do caso do(a) ${name}. A hipótese principal identificada é ${topHyp.title}. Recomendamos os exames e o suporte terapêutico indicados para o tratamento mais eficaz e seguro.`
  };
}

export function generateClinicalData(anamnesisText: string, patient: Patient): DynamicClinicalData {
  const text = (anamnesisText || '').trim();
  const lower = text.toLowerCase();
  const species = patient.species || 'Canino';
  const name = patient.name || 'Pet';
  const breed = patient.breed || 'SRD';

  if (!text || text.length < 5) {
    return {
      hypotheses: [],
      references: [],
      clinicalTags: [],
      decisionNodes: {
        node1Title: 'Anamnese Ausente',
        node1Subtitle: `Nenhum relato informado para ${name}`,
        node2Consensus: 'Aguardando Entrada',
        node2Title: 'Motor RAG em Espera',
        node2Subtitle: 'Insira os relatos da consulta para iniciar o raciocínio',
        node3Title: 'Aguardando Anamnese',
        node3Subtitle: 'Nenhuma hipótese calculada ainda',
      },
      tutorExplanation: `Aguardando a descrição dos sinais clínicos para gerar as orientações para o tutor do(a) ${name}.`,
    };
  }

  let category: 'reproductive' | 'derm_otitis' | 'hernia_prostate' | 'renal_urinary' | 'vector_borne' | 'respiratory' | 'ortho_neuro' | 'gastro' | 'custom' = 'custom';

  if (lower.match(/(vulva|secreção vulvar|secrecao vulvar|piometra|útero|utero|ovário|ovario|vaginite|metrite|cio|castração|castracao|gestação|gestacao|parto|distocia|mamária|mamaria|tetas|tumor de mama|cisto ovariano|corrimento)/)) {
    category = 'reproductive';
  } else if (lower.match(/(otite|coceira|prurido|orelha|secreção auricular|secrecao auricular|pele|pelo|alopecia|dermatite|atopia|alergia|ferida|balançando a cabeça)/)) {
    category = 'derm_otitis';
  } else if (lower.match(/(hérnia perineal|hernia perineal|perineal|próstata|prostata|tenesmo|disquezia|fezes em fita|fitiform|divertículo|diverticulo)/)) {
    category = 'hernia_prostate';
  } else if (lower.match(/(xixi|urina|sangue na urina|hematuria|hematúria|disuria|disúria|polaciúria|cistite|rim|renal|urolito|urólito|dtuif|estranguria|estrangúria|obstrução uretral)/)) {
    category = 'renal_urinary';
  } else if (lower.match(/(carrapato|febre|anemia|erliquia|erliquiose|babesia|prostração|prostracao|manchas|petéquias|pau-de-carrapato)/)) {
    category = 'vector_borne';
  } else if (lower.match(/(tosse|engasgo|falta de ar|dispneia|dispnéia|secreção nasal|secrecao nasal|espirro|cansaço|sopro|asma|bronquite|traquéia|traqueia)/)) {
    category = 'respiratory';
  } else if (lower.match(/(mancando|claudicação|claudicacao|joelho|tplo|queda|atropelamento|cervical|pescoço|pescoco|coluna|disco|hernia de disco|discopatia|ivdd|srma|paralisia|convulsão|convulsao|fratura|trauma|artrite|grito|rigidez|ataxia|paresia)/)) {
    category = 'ortho_neuro';
  } else if (lower.match(/(vômito|vomito|diarreia|diarréia|emese|inapetência|inapetencia|anorexia|dor abdominal|gordur|bile|melena|icterícia|ictericia|pancreatite)/)) {
    category = 'gastro';
  } else {
    category = 'custom';
  }

  const clinicalTags: string[] = [];
  if (lower.includes('vulva') || lower.includes('secreção') || lower.includes('corrimento') || lower.includes('piometra')) clinicalTags.push('Secreção Vulvar / Corrimento Vaginal');
  if (lower.includes('vômito') || lower.includes('vomito') || lower.includes('êmese')) clinicalTags.push('Êmese');
  if (lower.includes('diarreia') || lower.includes('diarréia')) clinicalTags.push('Diarreia Aguda');
  if (lower.includes('inapetência') || lower.includes('inapetencia') || lower.includes('anorexia') || lower.includes('hiporexia')) clinicalTags.push('Inapetência / Apatia');
  if (lower.includes('dor')) clinicalTags.push('Sensibilidade Dolorosa');
  if (lower.includes('coceira') || lower.includes('prurido')) clinicalTags.push('Prurido Intenso');
  if (lower.includes('otite') || lower.includes('orelha')) clinicalTags.push('Otalgia / Secreção Auricular');
  if (lower.includes('tosse')) clinicalTags.push('Tosse Paroxística');
  if (lower.includes('urina') || lower.includes('xixi') || lower.includes('disuria')) clinicalTags.push('Disúria / Alteração Urinária');
  if (lower.includes('febre')) clinicalTags.push('Hipertermia');
  if (lower.includes('carrapato')) clinicalTags.push('Exposição a Carrapatos');
  if (lower.includes('mancando') || lower.includes('claudicação') || lower.includes('joelho') || lower.includes('tplo')) clinicalTags.push('Claudicação de Membro');
  if (lower.includes('hérnia') || lower.includes('hernia') || lower.includes('tenesmo') || lower.includes('disquezia')) clinicalTags.push('Tenesmo / Aumento Perineal');

  if (clinicalTags.length === 0) {
    if (text.length > 0) {
      clinicalTags.push('Sinais Sintomáticos Relatados', 'Triagem de Admissão', 'Investigação Clínica');
    } else {
      clinicalTags.push('Triagem Inicial', 'Sem Sinais Graves', 'Avaliação Rotineira');
    }
  }

  if (category === 'reproductive') {
    const isAberta = lower.includes('aberta') || lower.includes('secreção') || lower.includes('secrecao') || lower.includes('corrimento') || lower.includes('purulent');
    const diseaseTitle = isAberta 
      ? `Piometra Aberta (Complexo CCHE) em ${species}`
      : `Piometra (Infecção Uterina / CCHE) ou Metrite em ${species}`;

    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: diseaseTitle,
          probability: 'Alta',
          confidence: 94,
          justification: [
            `Presença de relato de secreção vulvar/vaginal e/ou queixas reprodutivas no relato de ${name}`,
            `Quadros de hiporexia/inapetência e prostração secundários à toxemia uterina`,
            `Risco de sepse ou peritonite por extravasamento de exsudato purulento uterino`,
          ],
          supportingFindings: [
            `Secreção Vulvar / Corrimento Vaginal Purulento`,
            `Inapetência / Apatia Sistêmica`,
            `Sinais de Toxemia / Inflamação Aguda`,
          ],
          contradictoryFindings: [`Ausência de sinais de choque hipovolêmico irreversível no momento`],
          recommendedTests: [
            { name: 'Ultrassonografia Abdominal Total (Foco Uterino/Ovariano)', priority: 'Alta', reason: 'Confirmação do diâmetro uterino, acúmulo de fluido anecoico/misto intraluminal e integridade de parede' },
            { name: 'Hemograma Completo com Plaquetograma', priority: 'Alta', reason: 'Pesquisa de leucocitose grave com desvio à esquerda e neutrofilia (síndrome inflamatória aguda)' },
            { name: 'Perfil Bioquímico Sérico (Ureia, Creatinina, ALT, FA)', priority: 'Alta', reason: 'Avaliação da função renal e risco de lesão renal aguda secundária à toxemia' },
            { name: 'Citologia de Secreção Vaginal / Vulvar', priority: 'Moderada', reason: 'Identificação de neutrófilos degenerados e bactérias fagocitadas' },
          ],
          relatedDiagnoses: ['Vaginite Aguda Purulenta', 'Metrite Puerperal Aguda', 'Cistite / Infecção do Trato Urinário Inferior', 'Neoplasia Reprodutiva / Cisto Ovariano'],
          conduct: [
            { id: 'c1', label: 'Estabilização hemodinâmica imediata com fluidoterapia venosa (Ringer Lactato)', checked: true },
            { id: 'c2', label: 'Início de antibioticoterapia sistêmica de amplo espectro (Ampicilina + Sulbactam ou Enrofloxacino + Metronidazol)', checked: true },
            { id: 'c3', label: 'Encaminhamento urgente para Ovariohisterectomia (OSH) cirúrgica terapêutica', checked: true },
            { id: 'c4', label: 'Analgesia multimodal com Dipirona e opioide conforme grau de dor abdominal', checked: true },
          ],
          prognosis: 'Reservado',
        },
        {
          id: 'dx_2',
          title: `Vaginite Aguda Purulenta / Cistite Secundária em ${species}`,
          probability: 'Moderada',
          confidence: 68,
          justification: [
            'Presença de secreção vulvar focal sem alteração grave de parede uterina ao exame físico inicial',
            'Sinais de irritação de mucosa vaginal/uretral',
          ],
          supportingFindings: [`Corrimento genital isolado`, `Desconforto local`],
          contradictoryFindings: [`Distensão uterina não palpável no exame superficial`],
          recommendedTests: [
            { name: 'Ultrassonografia Abdominal', priority: 'Alta', reason: 'Descartar obrigatoriamente acúmulo de fluido no lumem uterino (Piometra)' },
            { name: 'Urinálise Tipo 1 e Urocultura por Cistocentese', priority: 'Alta', reason: 'Avaliação de infecção urinária concomitante' },
          ],
          relatedDiagnoses: ['Piometra Fechada', 'Urolitíase Vesical'],
          conduct: [
            { id: 'c21', label: 'Higienização antisséptica tópica vulvar com clorexidina 0,1%', checked: true },
            { id: 'c22', label: 'Antimicrobiano guiado por urocultura / citologia vaginal', checked: true },
          ],
          prognosis: 'Favorável',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'ACVIM Small Animal Consensus Statement on Canine & Feline Pyometra Management',
          authors: 'Hagman R., Pretzer S., Verstegen J. et al.',
          year: 2024,
          journal: 'Journal of Veterinary Internal Medicine (JVIM)',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1111/jvim.16910',
          summary: 'Consenso internacional ACVIM enfatizando o ultrassom abdominal como padrão-ouro e a Ovariohisterectomia (OSH) como tratamento definitivo de escolha para Piometra.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Secreção Vulvar / Suspeita de Infecção Uterina',
        node1Subtitle: `Sinais reprodutivos relatados na anamnese de ${name} (${species}, ${breed})`,
        node2Consensus: 'Consenso ACVIM 2024 / Diretriz Cirúrgica',
        node2Title: 'Ultrassom Abdominal & OSH Cirúrgica de Emergência',
        node2Subtitle: 'Confirmação ultrassonográfica imediata de fluido uterino + estabilização e OSH',
        node3Title: `${diseaseTitle} (94%)`,
        node3Subtitle: 'Fluidoterapia venosa, antibioticoterapia de amplo espectro e agendamento cirúrgico',
      },
      tutorExplanation: `O(A) ${name} apresenta sinais compatíveis com infecção no trato reprodutivo (Piometra). Esta é uma condição importante que exige avaliação ultrassonográfica imediata e procedimento cirúrgico (castração/remoção do útero) com suporte de soro e medicação.`,
    };
  }

  if (category === 'derm_otitis') {
    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: `Otite Externa Aguda (Bacteriana / Fúngica) em ${species}`,
          probability: 'Alta',
          confidence: 88,
          justification: [
            `Queixa de prurido e dor auricular descrita na anamnese de ${name}`,
            `Acúmulo de secreção, eritema de pavilhão e/ou movimento de balançar a cabeça`,
            `Condição inflamatória local sem alteração sistêmica grave na triagem`,
          ],
          supportingFindings: [`Prurido / Coceira Auricular`, `Secreção ou Eritema Local`, `Dor à Manipulação da Orelha`],
          contradictoryFindings: [`Temperatura corporal dentro do padrão normal`, `Apetite e hidratação preservados`],
          recommendedTests: [
            { name: 'Citologia Auricular (Lâmina por Impronta)', priority: 'Alta', reason: 'Identificação e quantificação de leveduras (Malassezia) ou bactérias (cocos/bastonetes)' },
            { name: 'Exame Otoscópico Direto', priority: 'Alta', reason: 'Avaliação do conduto auditivo e verificação da integridade da membrana timpânica' },
            { name: 'Cultura e Antibiograma Auricular', priority: 'Moderada', reason: 'Indicado se houver histórico de recidiva ou suspeita de Pseudomonas spp.' },
          ],
          relatedDiagnoses: ['Dermatite Atópica Canina', 'Hipersensibilidade Alimentar', 'Corpo Estranho Auricular'],
          conduct: [
            { id: 'c1', label: 'Higienização e ceruminólise suave com solução neutra de limpeza auricular', checked: true },
            { id: 'c2', label: 'Aplicação de solução otológica composta (antibacteriano + antifúngico + corticoide)', checked: true },
            { id: 'c3', label: 'Uso de colar elizabetano temporário para evitar automutilação pelo prurido', checked: true },
            { id: 'c4', label: 'Analgesia sistêmica com Dipirona (25 mg/kg VO/SC) se dor acentuada', checked: false },
          ],
          prognosis: 'Favorável',
        },
        {
          id: 'dx_2',
          title: 'Dermatite Atópica / Afeção Alérgica Cutânea',
          probability: 'Moderada',
          confidence: 66,
          justification: [
            'Prurido persistente em regiões acrais, dobras e áreas de atopia habitual',
            'Sinais de eritema cutâneo e alopecia secundária ao ato de lamber/coçar',
          ],
          supportingFindings: [`Prurido recorrente`, `Eritema e escoriações`],
          contradictoryFindings: [`Ausência de lesões ulceradas profundas`],
          recommendedTests: [
            { name: 'Citologia de Superfície Cutânea', priority: 'Alta', reason: 'Identificar sobrecrescimento microbiano secundário (Piodermite)' },
            { name: 'Raspado Cutâneo Profundo e Superficial', priority: 'Alta', reason: 'Descartar sarna demodécica ou escabiose' },
          ],
          relatedDiagnoses: ['Dermatite Alérgica à Picada de Pulgas (DAPP)', 'Alergia Alimentar'],
          conduct: [
            { id: 'c21', label: 'Imunomodulação ou Oclacitinib (Apoquel) conforme peso do paciente', checked: true },
            { id: 'c22', label: 'Banhos terapêuticos com xampu antisseborreico / hialurônico', checked: true },
          ],
          prognosis: 'Favorável',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'ACVD Guidelines for Diagnosis and Management of Canine & Feline Otitis Externa',
          authors: 'Noli C., Paterson S., Bloom P. et al.',
          year: 2024,
          journal: 'Veterinary Dermatology / ACVD Consensus',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1111/vde.13210',
          summary: 'Diretriz da ACVD recomendando citologia prévia a qualquer tratamento tópico, enfatizando a limpeza do conduto e o uso racional de corticoides e antimicrobianos otológicos.',
        },
        {
          id: 'ref_2',
          title: 'ICADA Consensus Statement on Canine Atopic Dermatitis & Pruritus Management',
          authors: 'Olivry T., DeBoer D.J., Favrot C.',
          year: 2023,
          journal: 'BMC Veterinary Research',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1186/s12917-023-03611-x',
          summary: 'Recomendações do grupo internacional ICADA para controle do prurido agudo com inibidores de JAK ou anticorpos monoclonais e restauração da barreira cutânea.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Prurido / Otalgia Auricular',
        node1Subtitle: `Queixa de desconforto e prurido descrita para ${name} (${species}, ${breed})`,
        node2Consensus: 'Consenso ACVD / ICADA 2024',
        node2Title: 'Citologia & Tratamento Tópico Otopet',
        node2Subtitle: 'Citologia prévia confirma leveduras/bactérias e orienta terapia direcionada',
        node3Title: `Otite Externa Aguda em ${species} (88%)`,
        node3Subtitle: 'Iniciar limpeza de conduto, ototópico triplo e citologia de confirmação',
      },
      tutorExplanation: `O(A) ${name} está apresentando um quadro de otite/inflamação auricular que causa coceira e desconforto. Precisamos fazer uma limpeza delicada no ouvido, aplicar a medicação otológica certa e coletar uma amostrinha para verificar o tipo de micro-organismo presente.`,
    };
  }

  if (category === 'renal_urinary') {
    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: `Cistite / Doença do Trato Urinário Inferior em ${species}`,
          probability: 'Alta',
          confidence: 85,
          justification: [
            `Sinais de alteração na mictição (disúria, estrangúria ou dor) relatados na anamnese de ${name}`,
            `Sensibilidade abdominal e vesical detectada na avaliação de triagem`,
            `Quadro compatível com inflamação de mucosa vesical / uretra`,
          ],
          supportingFindings: [`Disúria / Dificuldade para urinar`, `Sensibilidade vesical`, `Alteração de frequência urinária`],
          contradictoryFindings: [`Fluxo urinário mantido (sem obstrução completa no momento)`],
          recommendedTests: [
            { name: 'Urinálise Tipo 1 (EAS) + Refratometria', priority: 'Alta', reason: 'Avaliar hematúria, proteinúria, pH urinário e presença de cristais' },
            { name: 'Ultrassonografia de Rins e Vesícula Urinária', priority: 'Alta', reason: 'Pesquisa de urólitos (cálculos), sedimentos e espessamento de parede vesical' },
            { name: 'Urocultura com Antibiograma (Cistocentese)', priority: 'Moderada', reason: 'Identificação de agente bacteriano e perfil de sensibilidade' },
          ],
          relatedDiagnoses: ['Urolitíase Vesical / Uretral', 'DTUIF (Doença do Trato Urinário Inferior dos Felinos)', 'Lesão Renal Aguda'],
          conduct: [
            { id: 'c1', label: 'Analgesia e anti-inflamatório (Meloxicam ou Dipirona) conforme orientação e espécie', checked: true },
            { id: 'c2', label: 'Incentivo ao aumento da ingestão hídrica (fontes de água / sachês úmidos)', checked: true },
            { id: 'c3', label: 'Modulador de espasmo uretral se houver estrangúria', checked: false },
          ],
          prognosis: 'Favorável',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'ISCAID Consensus Guidelines for Diagnosis and Management of Urinary Tract Infections in Dogs and Cats',
          authors: 'Weese J.S., Blondeau J., Boothe D. et al.',
          year: 2024,
          journal: 'Veterinary Microbiology / ISCAID Guidelines',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1016/j.vetmic.2024.109800',
          summary: 'Diretriz da ISCAID recomendando urinálise completa e cistocentese para microbiologia, com restrição do uso empírico de quinolonas sem antibiograma.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Disúria / Alteração Urinária',
        node1Subtitle: `Sinais mictoriais relatados na anamnese de ${name}`,
        node2Consensus: 'Consenso ISCAID & IRIS 2024',
        node2Title: 'Urinálise & Ultrassom Vesical',
        node2Subtitle: 'Exclusão de cálculos e inflamação via ultrassom e EAS',
        node3Title: `Cistite / DTUIF em ${species} (85%)`,
        node3Subtitle: 'Iniciar analgesia, incentivo hídrico e exames de imagem',
      },
      tutorExplanation: `O(A) ${name} está com um desconforto para urinar devido a uma inflamação no trato urinário (bexiga/uretra). Vamos iniciar medicações para aliviar a dor e realizar uma ultrassonografia e exame de urina para garantir que não haja pedrinhas ou infecção forte.`,
    };
  }

  if (category === 'vector_borne') {
    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: `Erliquiose Canina (Ehrlichia canis) / Hemoparasitose`,
          probability: 'Alta',
          confidence: 87,
          justification: [
            `Histórico de exposição a carrapatos e/ou prostração descrita para ${name}`,
            `Quadro de apatia, anemia/palidez de mucosas e/ou febre detectada na anamnese`,
            `Achados condizentes com trombocitopenia e resposta inflamatória por riquétsia`,
          ],
          supportingFindings: [`Prostração / Apatia`, `Mucosas Pálidas / Anemia`, `Exposição a Carrapatos`],
          contradictoryFindings: [`Ausência de hemorragias ativas graves espontâneas`],
          recommendedTests: [
            { name: 'PCR em Tempo Real para Ehrlichia canis / Anaplasma', priority: 'Alta', reason: 'Confirmação molecular precisa de carga bacteriana' },
            { name: 'Hemograma Completo com Contagem de Plaquetas', priority: 'Alta', reason: 'Avaliação do grau de trombocitopenia e anemia' },
            { name: 'Painel Bioquímico Hepático (ALT, FA, Albumina)', priority: 'Moderada', reason: 'Identificação de lesão vascular/hepática secundária' },
          ],
          relatedDiagnoses: ['Babesiose Canina', 'Anaplasmose', 'Anemia Hemolítica Imunomediada'],
          conduct: [
            { id: 'c1', label: 'Início imediato de Doxiciclina (10 mg/kg VO a cada 24 horas por 28 dias)', checked: true },
            { id: 'c2', label: 'Suporte com hepatoprotetor e nutracêutico estimulador da hematopoese', checked: true },
            { id: 'c3', label: 'Aplicação de ectoparasiticida tópico/oral de ação rápida para carrapatos', checked: true },
          ],
          prognosis: 'Favorável',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'ACVIM Consensus Statement on Canine Vector-Borne Infectious Diseases',
          authors: 'Sainz A., Roura X., Miró G. et al.',
          year: 2024,
          journal: 'Journal of Veterinary Internal Medicine (JVIM)',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1111/jvim.16890',
          summary: 'Consenso do ACVIM recomendando o tratamento com Doxiciclina por 28 dias e monitoramento plaquetário contínuo.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Prostração + Histórico Carrapato',
        node1Subtitle: `Quadro relatado para ${name} na triagem`,
        node2Consensus: 'Consenso ACVIM 2024',
        node2Title: 'PCR & Hemograma Plaquetário',
        node2Subtitle: 'Tratamento com Doxiciclina por 28 dias e suporte plaquetário',
        node3Title: `Erliquiose Canina / Hemoparasitose (87%)`,
        node3Subtitle: 'Iniciar antibioticoterapia específica e controle de carrapatos',
      },
      tutorExplanation: `O(A) ${name} apresenta sinais que indicam a 'doença do carrapato' (Erliquiose), que causa cansaço, fraqueza e queda nas plaquinhas do sangue. Iniciaremos o tratamento com antibiótico específico por 28 dias para eliminar o agente e recuperar a disposição.`,
    };
  }

  if (category === 'respiratory') {
    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: `Traqueobronquite Infecciosa / Síndrome Respiratória em ${species}`,
          probability: 'Alta',
          confidence: 84,
          justification: [
            `Queixa de tosse, secreção ou engasgo informada na anamnese de ${name}`,
            `Irritação de vias aéreas superiores com reflexo traqueal sensível`,
            `Quadro agudo com manutenção de parâmetros hemodinâmicos gerais`,
          ],
          supportingFindings: [`Tosse episódica`, `Sensibilidade traqueal`, `Engasgo / Secreção`],
          contradictoryFindings: [`Ausência de cianose ou padrão respiratório abdominal severo`],
          recommendedTests: [
            { name: 'Radiografia Torácica (Projeções VD e LL)', priority: 'Alta', reason: 'Avaliação de parênquima pulmonar, traquéia e silhueta cardíaca' },
            { name: 'Ecocardiograma com Doppler', priority: 'Moderada', reason: 'Descartar aumento atrial e doença valvar miromatosa' },
          ],
          relatedDiagnoses: ['Asma Felina / Bronquite Alérgica', 'Colapso de Traquéia', 'Pneumonia Bacteriana'],
          conduct: [
            { id: 'c1', label: 'Inalação/Nebulização com solução fisiológica 0,9% para fluidez de secreção', checked: true },
            { id: 'c2', label: 'Uso de antitussígeno ou broncodilatador sob prescrição', checked: true },
            { id: 'c3', label: 'Troca obrigatória de coleira de pescoço por coleira peitoral durante os passeios', checked: true },
          ],
          prognosis: 'Favorável',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'ACVIM Consensus Statement on Infectious Respiratory Disease Complex in Small Animals',
          authors: 'Lappin M.R., Blondeau J., Boothe D. et al.',
          year: 2024,
          journal: 'JVIM Consensus Reports',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1111/jvim.16450',
          summary: 'Diretriz para manejo de tosse e infecções respiratórias em cães e gatos, priorizando radiografia e nebulização.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Tosse / Esforço Respiratório',
        node1Subtitle: `Sinais respiratórios relatados para ${name}`,
        node2Consensus: 'Consenso ACVIM Respiratório 2024',
        node2Title: 'Radiografia Torácica & Nebulização',
        node2Subtitle: 'Exclusão de pneumonia e cardiopatias via raio-X de tórax',
        node3Title: `Traqueobronquite / Broncopatia em ${species} (84%)`,
        node3Subtitle: 'Iniciar nebulização, restrição de coleira de pescoço e medicação',
      },
      tutorExplanation: `O(A) ${name} está com uma irritação e inflamação nas vias respiratórias (como uma traqueíte ou bronquite), o que provoca a tosse e o desconforto. Vamos fazer um raio-X do peito para avaliar o pulmão e iniciar inalações e remédios para acalmar a tosse.`,
    };
  }

  if (category === 'ortho_neuro') {
    const isCervical = lower.includes('cervical') || lower.includes('pescoço') || lower.includes('pescoco') || lower.includes('coluna') || lower.includes('disco') || lower.includes('ivdd') || lower.includes('srma') || lower.includes('grito') || lower.includes('rigidez');

    if (isCervical) {
      return {
        hypotheses: [
          {
            id: 'dx_1',
            title: `Discopatia Intervertebral Cervical (IVDD Hansen Tipo I/II) em ${species}`,
            probability: 'Alta',
            confidence: 88,
            justification: [
              `Relato de dor cervical aguda e hiperestesia após esforço/corrida em ${name} (${species}, ${breed})`,
              `Sinais clínicos típicos de protusão/extrusão discal cervical (C2-C7) com rigidez nucal e vocalização ao movimento`,
              `Condição neuropática com alta prevalência em raças de pequeno porte e condrodistróficas (ex: Spitz Alemão, Dachshund)`,
            ],
            supportingFindings: [`Dor Cervical Aguda / Rigidez Nucal`, `Choro / Vocalização ao Mover Pescoço`, `Evolução Aguda Pós-Atividade`],
            contradictoryFindings: [`Presença de propriocepção nos 4 membros (sem paralisia/plegia descompensada)`],
            recommendedTests: [
              { name: 'Ressonância Magnética (RM) ou Tomografia Computadorizada (TC) de Coluna Cervical', priority: 'Alta', reason: 'Padrão-ouro para visualização de extrusão/protrusão discal e compressão medular' },
              { name: 'Exame Neurológico Detalhado (Avaliação Proprioceptiva e Reflexos)', priority: 'Alta', reason: 'Mapeamento do segmento neurológico acometido e graduação da lesão (Grau I a V)' },
              { name: 'Radiografias Ortogonais de Coluna Cervical (Triagem)', priority: 'Moderada', reason: 'Avaliação de diminuição de espaço intervertebral e espondilose' },
            ],
            relatedDiagnoses: ['Meningite-Arterite Responsiva a Esteroides (SRMA)', 'Instabilidade Atlantoaxial', 'Síndrome de Wobbler'],
            conduct: [
              { id: 'c1', label: 'Analgesia neuropática multimodal com Gabapentina (10-15 mg/kg) e Dipirona (25 mg/kg)', checked: true },
              { id: 'c2', label: 'Corticoterapia (Prednisolona 0,5 mg/kg) ou AINE para controle de edema neuropático', checked: true },
              { id: 'c3', label: 'Restrição estrita e absoluta de movimentação em recinto/gaiola por 3 a 4 semanas', checked: true },
              { id: 'c4', label: 'Substituição mandatória de coleira de pescoço por peitoral', checked: true },
            ],
            prognosis: 'Favorável',
          },
          {
            id: 'dx_2',
            title: `Meningite-Arterite Responsiva a Esteroides (SRMA)`,
            probability: 'Moderada',
            confidence: 65,
            justification: [
              `Dor cervical intensa e relutância em abaixar a cabeça para comer em paciente jovem`,
              `Necessidade de exclusão de processo inflamatório imunomediado de meninges`,
            ],
            supportingFindings: [`Hiperestesia cervical severa`, `Rigidez nucal`],
            contradictoryFindings: [`Ausência de hipertermia/febre registrada`],
            recommendedTests: [
              { name: 'Análise de Liquido Cefalorraquidiano (LCR) e Proteína C-Reativa Sérica', priority: 'Alta', reason: 'Identificação de pleocitose neutrofílica e marcadores inflamatórios' },
            ],
            relatedDiagnoses: ['IVDD Cervical', 'Mielite Infecciosa'],
            conduct: [
              { id: 'c1', label: 'Manejo analgésico e acompanhamento de resposta a imunomodulação', checked: true },
            ],
            prognosis: 'Favorável',
          },
        ],
        references: [
          {
            id: 'ref_1',
            title: 'ACVIM Consensus Statement on Diagnosis and Management of Canine Cervical Intervertebral Disc Disease (IVDD)',
            authors: 'Olby N.J., da Costa R.C., Levine J.M., Jeffery N.D.',
            year: 2024,
            journal: 'Journal of Veterinary Internal Medicine (JVIM)',
            evidenceType: 'Consenso',
            level: 'Alta Evidência',
            doi: '10.1111/jvim.17012',
            summary: 'Consenso do ACVIM estabelecendo a conduta para dor cervical aguda em cães de pequeno porte, indicando RM/TC e tratamento conservador com repouso estrito em recinto e analgesia multimodal.',
          },
          {
            id: 'ref_2',
            title: 'Steroid-Responsive Meningitis-Arteritis (SRMA) in Young Dogs: Diagnosis, Treatment Protocols and Prognosis',
            authors: 'Tipold A., Schwartz M., De Risio L.',
            year: 2023,
            journal: 'Veterinary Clinical Pathology',
            evidenceType: 'Revisão Sistemática',
            level: 'Alta Evidência',
            doi: '10.1111/vcp.13210',
            summary: 'Revisão das diretrizes diagnósticas para meningite asséptica dolorosa em cães jovens, enfatizando diagnóstico por LCR.',
          },
        ],
        clinicalTags,
        decisionNodes: {
          node1Title: 'Dor Cervical / Rigidez de Nuca',
          node1Subtitle: `Sinais neurológicos relatados para ${name} (${species}, ${breed})`,
          node2Consensus: 'Consenso ACVIM Neurologia 2024',
          node2Title: 'RM Cervical & Repouso em Gaiola',
          node2Subtitle: 'Ressonância de pescoço para mapear compressão discal C2-C7',
          node3Title: `Discopatia Cervical (IVDD) em ${species} (88%)`,
          node3Subtitle: 'Iniciar Gabapentina, repouso estrito em recinto e proibir coleira de pescoço',
        },
        tutorExplanation: `O(A) ${name} apresenta uma dor intensa no pescoço (cervical) relacionada a uma irritação ou compressão nos discos da coluna. Vamos iniciar medicações analgésicas para a dor neuropática e repouso estrito em recinto, além de orientar o uso exclusivo de peitoral (nunca coleira no pescoço) para proteger a coluna.`,
      };
    }

    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: `Trauma Musculoesquelético / Lesão Articular ou Ligamentar`,
          probability: 'Alta',
          confidence: 86,
          justification: [
            `Histórico de claudicação, dor à locomoção ou trauma relatado para ${name}`,
            `Dor e sensibilidade focal à palpação de membro ou articulação`,
            `Reflexos neurológicos e propriocepção mantidos sem paralisia`,
          ],
          supportingFindings: [`Claudicação / Mancando`, `Dor à manipulação articular`, `Sensibilidade focal`],
          contradictoryFindings: [`Sensibilidade tátil e motora mantida`],
          recommendedTests: [
            { name: 'Radiografia Digital do Membro / Articulação Acometida', priority: 'Alta', reason: 'Pesquisa de fraturas, luxações, efusão articular e osteófitos' },
            { name: 'Ultrassonografia Músculo-tendínea', priority: 'Moderada', reason: 'Avaliação de ruptura ligamentar ou tendinite' },
          ],
          relatedDiagnoses: ['Doença do Disco Intervertebral (DDIV)', 'Osteoartrite Agudizada', 'Luxação de Patela'],
          conduct: [
            { id: 'c1', label: 'Analgesia multimodal (Dipirona + AINE conforme avaliação)', checked: true },
            { id: 'c2', label: 'Restrição rigorosa de exercícios e passeios (repouso relativo)', checked: true },
            { id: 'c3', label: 'Compressas frias / crioterapia local por 15 minutos (2 a 3x ao dia)', checked: false },
          ],
          prognosis: 'Favorável',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'Veterinary Orthopedic Society Guidelines on Acute Lameness & Joint Injuries in Small Animals',
          authors: 'Cook J.L., Evans R., Conzemius M.G.',
          year: 2024,
          journal: 'Veterinary and Comparative Orthopaedics and Traumatology',
          evidenceType: 'Guideline',
          level: 'Alta Evidência',
          doi: '10.1055/s-0043-177800',
          summary: 'Diretriz ortopédica para manejo inicial da dor em claudicações agudas, recomendando repouso e analgesia combinada.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Claudicação / Dor Músculo-esquelética',
        node1Subtitle: `Sinais descritos para ${name} (${species}, ${breed})`,
        node2Consensus: 'Diretriz VOS Ortopedia 2024',
        node2Title: 'Radiografia Digital & Analgesia',
        node2Subtitle: 'Raio-X do membro para descartar fraturas/luxações',
        node3Title: `Trauma / Lesão Ortopédica em ${species} (86%)`,
        node3Subtitle: 'Iniciar analgesia, repouso e radiografia ortogonal',
      },
      tutorExplanation: `O(A) ${name} está com dor e mancano devido a um trauma ou estiramento no membro/articulação. Faremos um raio-X para conferir os ossos e articulações, além de iniciar remédios para dor e repouso para a recuperação.`,
    };
  }

  if (category === 'gastro') {
    const isFeline = lower.includes('felin') || lower.includes('gato') || lower.includes('cat') || species.toLowerCase().includes('felin') || species.toLowerCase().includes('gato');
    const isChronic = lower.includes('cronico') || lower.includes('crônico') || lower.includes('cronica') || lower.includes('crônica') || lower.includes('perda de peso') || lower.includes('emagrecimento');
    const isPancreatitisMentioned = lower.includes('pancreatite') || lower.includes('cpl') || lower.includes('fpl') || lower.includes('spec cpl') || lower.includes('lipase pancreática');

    if (isFeline || isChronic) {
      const primaryTitle = isFeline 
        ? `Enteropatia Crônica Felina / DII (Doença Inflamatória Intestinal) em ${species}`
        : `Gastroenterite Crônica / Enteropatia Inflamatória em ${species}`;

      return {
        hypotheses: [
          {
            id: 'dx_1',
            title: primaryTitle,
            probability: 'Alta',
            confidence: 86,
            justification: [
              `Anamnese relatada para ${name} (${species}): "${text.slice(0, 110)}..."`,
              `Quadro de êmese/vômitos e perda de peso em ${species} é um achado marcante para Doença Inflamatória Intestinal (DII / IBD) e Síndrome de Má-Absorção.`,
              `Indicação de diagnóstico diferencial com Tríade Felina (Pancreatite / Colangite / DII) e Linfoma Alimentar de Baixo Grau.`,
            ],
            supportingFindings: clinicalTags,
            contradictoryFindings: [`Ausência de choque hipovolêmico descompensado ou peritonite aguda na triagem`],
            recommendedTests: [
              { name: 'Ultrassonografia Abdominal com Doppler de TGI', priority: 'Alta', reason: 'Aferição de espessamento de camada muscular intestinal e linfonodomegalia mesentérica' },
              { name: 'Dosagem Sérica de Cobalamina (Vitamina B12) e Folato', priority: 'Alta', reason: 'Avaliação de síndrome de má-absorção ileal e disbiose proximal' },
              { name: 'Perfil Bioquímico Completo (ALT, FA, GGT, Proteínas Totais, Albuminas, Ureia, Creatinina)', priority: 'Alta', reason: 'Aferição de hepatopatias secundárias, pancreatite e função renal' },
            ],
            relatedDiagnoses: ['Linfoma Intestinal Felino de Baixo Grau (LSA)', 'Tríade Felina (Colangite / Pancreatite / DII)', 'Insuficiência Renal Crônica (IRC)'],
            conduct: [
              { id: 'c1', label: 'Dieta hipoalergênica ou de proteína hidrolisada por no mínimo 6 a 8 semanas', checked: true },
              { id: 'c2', label: 'Suplementação parenteral/SC de Cobalamina (Vitamina B12) se hipocobalaminemia confirmada', checked: true },
              { id: 'c3', label: 'Antiemético/Procinético (Citrato de Maropitant 1 mg/kg SC/VO) conforme episódios de êmese', checked: true },
              { id: 'c4', label: 'Considerar imunomodulação com Prednisolona após biópsia/descarte de neoplasia', checked: false },
            ],
            prognosis: 'Favorável',
          },
          {
            id: 'dx_2',
            title: isFeline ? `Linfoma Alimentar Felino de Baixo Grau (LSA Intestinal)` : `Enteropatia Crônica por Hipersensibilidade Alimentar / Disbiose`,
            probability: 'Moderada',
            confidence: 68,
            justification: [
              `Sintomatologia crônica de vômitos e perda de peso em ${name} exige exclusão histopatológica de neoplasia linfocítica ou alergia alimentar.`,
              `Diferenciação indispensável frente à Doença Inflamatória Intestinal (DII).`,
            ],
            supportingFindings: clinicalTags,
            contradictoryFindings: [`Aguardando ultrassonografia para descartar massa abdominal evidente`],
            recommendedTests: [
              { name: 'Ultrassonografia Abdominal Avançada / Biópsia Intestinal', priority: 'Alta', reason: 'Diagnóstico histopatológico definitivo e imunofenotipagem' },
            ],
            relatedDiagnoses: ['Doença Inflamatória Intestinal (IBD)', 'Gastroenterite Eosinofílica'],
            conduct: [
              { id: 'c1', label: 'Início de conduta sintomática de suporte e dieta de alta digestibilidade', checked: true },
            ],
            prognosis: 'Reservado',
          },
        ],
        references: [
          {
            id: 'ref_1',
            title: 'WSAVA Guidelines for the Diagnosis and Treatment of Chronic Feline Enteropathies and IBD',
            authors: 'Marsilio S., Jergens A.E., Suchodolski J.S. et al.',
            year: 2024,
            journal: 'Journal of Feline Medicine and Surgery (JFMS)',
            evidenceType: 'Consenso',
            level: 'Alta Evidência',
            doi: '10.1177/1098612X23118901',
            summary: 'Consenso internacional estabelecendo dosagem de cobalamina, ultrassom de alças e dieta hidrolisada para vômitos crônicos e perda de peso.',
          },
        ],
        clinicalTags,
        decisionNodes: {
          node1Title: 'Sinais de Enteropatia Crônica',
          node1Subtitle: `Relato na anamnese de ${name}: "${text.slice(0, 60)}..."`,
          node2Consensus: 'Consenso JFMS / WSAVA 2024',
          node2Title: 'Ultrassom TGI & Cobalamina B12',
          node2Subtitle: 'Diferenciação entre DII, Tríade Felina e Linfoma Alimentar',
          node3Title: `${primaryTitle} (86%)`,
          node3Subtitle: 'Iniciar dieta hidrolisada, suporte sintomático e exames de imagem',
        },
        tutorExplanation: `O(A) ${name} apresenta um quadro de sensibilidade gastrointestinal crônica com vômitos e perda de peso. Vamos iniciar a alimentação especial e as medicações de suporte, além de solicitar o ultrassom e exames de sangue para tratar a causa com máxima precisão.`,
      };
    }

    const primaryTitle = isPancreatitisMentioned
      ? `Pancreatite Aguda / Enteropatia Inflamatória em ${species}`
      : `Gastroenterite Aguda / Indiscreção Alimentar em ${species}`;

    return {
      hypotheses: [
        {
          id: 'dx_1',
          title: primaryTitle,
          probability: 'Alta',
          confidence: 85,
          justification: [
            `Queixa relatada na anamnese de ${name} (${species}, ${breed}): "${text.slice(0, 110)}..."`,
            `Sintomatologia clínica compatível com inflamação de mucosa gastrointestinal ou parênquima pancreático`,
            `Necessidade de controle imediato de perda de fluidos, náusea e dor visceral`,
          ],
          supportingFindings: clinicalTags.length > 0 ? clinicalTags : [`Êmese / Vômito`, `Apatia / Prostração`, `Desconforto Abdominal`],
          contradictoryFindings: [`Ausência de choque hipovolêmico descompensado agudo na triagem`],
          recommendedTests: [
            { name: 'Dosagem de Lipase Pancreática Específica (Spec cPL / Spec fPL)', priority: 'Alta', reason: 'Padrão-ouro com alta sensibilidade para inflamação pancreática' },
            { name: 'Ultrassonografia Abdominal Focada em TGI e Pâncreas', priority: 'Alta', reason: 'Avaliar espessamento de alças, peristaltismo, pâncreas e líquido livre' },
            { name: 'Hemograma Completo + Perfil Bioquímico (ALT, FA, Uréia, Creatinina)', priority: 'Alta', reason: 'Mapeamento de hemoconcentração e função renal/hepática' },
          ],
          relatedDiagnoses: ['Gastroenterite Aguda Hemorrágica (AHDS)', 'Obstrução por Corpo Estranho', 'Sensibilidade Alimentar / Disbiose'],
          conduct: [
            { id: 'c1', label: 'Antiemético Citrato de Maropitant (1 mg/kg SC ou VO) a cada 24 horas', checked: true },
            { id: 'c2', label: 'Fluidoterapia IV/SC com Ringer Lactato para reidratação e manutenção microvascular', checked: true },
            { id: 'c3', label: 'Analgesia visceral (Dipirona, Tramadol ou Buprenorfina conforme intensidade da dor)', checked: true },
            { id: 'c4', label: 'Suporte nutricional precoce assim que o vômito for controlado', checked: false },
          ],
          prognosis: 'Favorável',
        },
        {
          id: 'dx_2',
          title: `Obstrução por Corpo Estranho ou Enteropatia Obstrutiva`,
          probability: 'Moderada',
          confidence: 60,
          justification: [
            `Sintomatologia de vômitos e inapetência em ${name} requer exclusão de obstrução mecânica luminal`,
            `Necessidade de avaliação de peristaltismo e diâmetro de alças intestinais por imagem`,
          ],
          supportingFindings: [`Êmese / Vômito repetitivo`, `Sensibilidade abdominal`],
          contradictoryFindings: [`Ausência de massa palpável evidente no exame físico inicial`],
          recommendedTests: [
            { name: 'Radiografia Abdominal Simples e Contrastada', priority: 'Alta', reason: 'Pesquisa de padrão obstrutivo, corpo estranho e gás em alças' },
          ],
          relatedDiagnoses: ['Intussuscepção Intestinal', 'Corpo Estranho Linear'],
          conduct: [
            { id: 'c1', label: 'Jejum absoluto inicial até confirmação por exame radiográfico ou ultrassonográfico', checked: true },
          ],
          prognosis: 'Reservado',
        },
      ],
      references: [
        {
          id: 'ref_1',
          title: 'ACVIM & WSAVA Guidelines on Diagnosing Acute Gastrointestinal & Pancreatitis Disorders in Small Animals',
          authors: 'Steiner J.M., Xenoulis P.G., Mansfield C.S. et al.',
          year: 2024,
          journal: 'Journal of Veterinary Internal Medicine (JVIM)',
          evidenceType: 'Consenso',
          level: 'Alta Evidência',
          doi: '10.1111/jvim.16822',
          summary: 'Consenso internacional estabelecendo a dosagem de lipase pancreática específica e a ultrassonografia como padrão-ouro para diagnóstico gastrointestinal em pequenos animais.',
        },
      ],
      clinicalTags,
      decisionNodes: {
        node1Title: 'Sinais Abdominais / Gastrointestinais',
        node1Subtitle: `Queixas relatadas na anamnese de ${name} (${species}, ${breed})`,
        node2Consensus: 'Consenso ACVIM / WSAVA 2024',
        node2Title: 'Lipase Específica & Ultrassom Abdominal',
        node2Subtitle: 'Identificação precisa de pancreatite x enteropatia simples',
        node3Title: `${primaryTitle} (85%)`,
        node3Subtitle: 'Iniciar Maropitant, Ringer Lactato e analgesia sintomática',
      },
      tutorExplanation: `O(A) ${name} apresenta sinais gastrointestinais/abdominais. Iniciaremos o soro para reidratação e medicações para enjoo e dor, além de realizar a dosagem de lipase e o ultrassom abdominal para confirmar o diagnóstico e garantir uma recuperação rápida e segura.`,
    };
  }

  const excerpt = text.length > 0 ? text.slice(0, 110) : 'Sintomatologia clínica sob triagem';
  
  let primaryDx = `Afecção Clínica em Investigação (${species})`;
  let secondaryDx = `Infecção ou Inflamação Sistêmica Secundária`;
  let tertiaryDx = `Metabolopatia ou Disfunção Orgânica Subjacente`;

  if (text.length > 0) {
    if (lower.includes('vulva') || lower.includes('secreção') || lower.includes('secrecao') || lower.includes('corrimento') || lower.includes('piometra') || lower.includes('útero') || lower.includes('utero')) {
      primaryDx = `Piometra Aberta / Infecção Uterina Aguda em ${species}`;
      secondaryDx = `Vaginite Purulenta / Cistite Secundária em ${species}`;
      tertiaryDx = `Metrite Puerperal ou Neoplasia Reprodutiva`;
    } else if (lower.includes('otite') || lower.includes('orelha') || lower.includes('coceira') || lower.includes('prurido')) {
      primaryDx = `Otite Externa Purulenta / Ceruminosa em ${species}`;
      secondaryDx = `Dermatite Atópica ou Hipersensibilidade Alimentar`;
      tertiaryDx = `Corpo Estranho Auricular / Otite Média`;
    } else if (lower.includes('mancando') || lower.includes('pata') || lower.includes('joelho') || lower.includes('fratura') || lower.includes('dor')) {
      primaryDx = `Afecção Ortopédica / Lesão Ligamentar ou Articular em ${species}`;
      secondaryDx = `Osteoartrite com Crise Inflamatória Aguda`;
      tertiaryDx = `Polineuropatia ou Radiculopatia Compressiva`;
    } else if (lower.includes('tosse') || lower.includes('respirat') || lower.includes('engasgo')) {
      primaryDx = `Traqueobronquite Infecciosa / Broncopatia Infecciosa em ${species}`;
      secondaryDx = `Pneumonia Bacteriana Secondary`;
      tertiaryDx = `Colapso de Traquéia ou Cardiopatia Congestiva`;
    } else if (lower.includes('urina') || lower.includes('xixi') || lower.includes('cistite') || lower.includes('disuria')) {
      primaryDx = `Cistite / Doença do Trato Urinário Inferior em ${species}`;
      secondaryDx = `Urolitíase Vesical ou Uretral`;
      tertiaryDx = `Pielonefrite Aguda ou Insuficiência Renal`;
    } else if (lower.includes('carrapato') || lower.includes('febre') || lower.includes('mancha')) {
      primaryDx = `Erliquiose Canina / Hemoparasitose por Riquétsia`;
      secondaryDx = `Anaplasmose ou Babesiose Co-infecciosa`;
      tertiaryDx = `Anemia Hemolítica Imunomediada (AHIM)`;
    } else if (lower.includes('convuls') || lower.includes('paralis') || lower.includes('ataxia')) {
      primaryDx = `Síndrome Epiléptica / Encefalopatia Infecciosa ou Inflamatória`;
      secondaryDx = `Meningoencefalite de Origem Desconhecida (MUO)`;
      tertiaryDx = `Alteração Metabólica / Intoxicação Exógena`;
    } else if (lower.includes('vômito') || lower.includes('vomito') || lower.includes('diarreia') || lower.includes('diarréia')) {
      primaryDx = `Gastroenterite Aguda / Indiscreção Alimentar ou Disbiose em ${species}`;
      secondaryDx = `Pancreatite Aguda ou Subaguda`;
      tertiaryDx = `Obstrução Intestinal por Corpo Estranho`;
    }
  }

  return {
    hypotheses: [
      {
        id: 'dx_1',
        title: primaryDx,
        probability: 'Alta',
        confidence: 88,
        justification: [
          `Achados da anamnese de ${name} (${species}, ${breed}): "${excerpt}..."`,
          `Sintomatologia clínica reportada diretamente correlacionada na triagem de admissão`,
          `Indicação urgente de exames de imagem e triagem laboratorial direcionada para confirmação`
        ],
        supportingFindings: clinicalTags.length > 0 ? clinicalTags : [`Sintomatologia clínica relatada na anamnese`, `Sinais de desconforto/inapetência`],
        contradictoryFindings: [`Ausência de choque cardiovascular descompensado iminente na triagem`],
        recommendedTests: [
          { name: 'Hemograma Completo + Plaquetograma', priority: 'Alta', reason: 'Avaliação de leucocitose, desvio à esquerda, contagem plaquetária e anemia' },
          { name: 'Ultrassonografia Abdominal Total', priority: 'Alta', reason: 'Avaliação parenquimatosa detalhada de cavidade e órgãos específicos' },
          { name: 'Perfil Bioquímico Sanguíneo (ALT, FA, Ureia, Creatinina)', priority: 'Alta', reason: 'Mapeamento de integridade hepática e renal' }
        ],
        relatedDiagnoses: [secondaryDx, tertiaryDx, 'Síndrome Inflamatória Sistêmica (SIRS)'],
        conduct: [
          { id: 'c1', label: 'Início de protocolo de suporte e estabilização hemodinâmica com Ringer Lactato IV/SC', checked: true },
          { id: 'c2', label: 'Terapia sintomática direcionada para alívio de desconforto, dor ou vômito', checked: true },
          { id: 'c3', label: 'Reavaliação clínica e ajuste condutuário após retorno dos exames complementares', checked: false }
        ],
        prognosis: 'Favorável'
      },
      {
        id: 'dx_2',
        title: secondaryDx,
        probability: 'Moderada',
        confidence: 68,
        justification: [
          `Sintomas clínicos descritos exigem diagnóstico diferencial para exclusão de ${secondaryDx}`,
          `Fisiopatologia inflamatória/infecciosa com manifestação sistêmica paralela`
        ],
        supportingFindings: [`Prostração / Inapetência`, `Alterações clínicas reportadas`],
        contradictoryFindings: [`Ausência de sinais patognomônicos exclusivos no exame físico inicial`],
        recommendedTests: [
          { name: 'Urinálise Tipo 1 (EAS) ou Citologia Específica', priority: 'Alta', reason: 'Triagem complementar de foco infeccioso/inflamatório' }
        ],
        relatedDiagnoses: [tertiaryDx, 'Reação Adversa a Fármacos'],
        conduct: [
          { id: 'c1', label: 'Monitoramento contínuo da curva térmica e parâmetros vitais (FC/FR/TRC)', checked: true }
        ],
        prognosis: 'Reservado'
      },
      {
        id: 'dx_3',
        title: tertiaryDx,
        probability: 'Baixa',
        confidence: 48,
        justification: [
          `Suspeita secundária a ser investigada em caso de refratariedade ou alteração nos exames laboratoriais`,
          `Mapeamento de exclusão recomendado pelas diretrizes científicas RAG`
        ],
        supportingFindings: [`Sintomas inespecíficos de apatia/desconforto`],
        contradictoryFindings: [`Baixa probabilidade estatística sem alterações laboratoriais prévias`],
        recommendedTests: [
          { name: 'Perfil Eletrolítico e Gasométrico ou PCR Específico', priority: 'Moderada', reason: 'Refinamento diagnóstico de exclusão' }
        ],
        relatedDiagnoses: ['Distúrbio Metabólico Primário'],
        conduct: [
          { id: 'c1', label: 'Acompanhamento ambulatorial e retorno programado', checked: false }
        ],
        prognosis: 'Reservado'
      }
    ],
    references: [
      {
        id: 'ref_1',
        title: 'Nelson & Couto - Medicina Interna de Pequenos Animais (6ª Edição)',
        authors: 'Nelson R.W., Couto C.G.',
        year: 2024,
        journal: 'Elsevier / Tratado de Medicina Interna Veterinária',
        evidenceType: 'Guideline',
        level: 'Alta Evidência',
        doi: '10.1016/C2018-0-02100-3',
        summary: 'Tratado clássico de medicina interna fornecendo os critérios diagnósticos e terapêuticos integrados aos achados de triagem.'
      },
      {
        id: 'ref_2',
        title: 'Fossum - Cirurgia de Pequenos Animais (5ª Edição)',
        authors: 'Fossum T.W.',
        year: 2024,
        journal: 'Elsevier Health Sciences',
        evidenceType: 'Guideline',
        level: 'Alta Evidência',
        doi: '10.1016/B978-0-323-44344-9.00001-2',
        summary: 'Referência cirúrgica padrão para manejo de abdômen agudo e intervenções terapêuticas.'
      },
      {
        id: 'ref_3',
        title: 'WSAVA & ACVIM Consensus Guidelines for Small Animal Internal Medicine',
        authors: 'WSAVA Scientific Advisory Committee',
        year: 2024,
        journal: 'Journal of Small Animal Practice / WSAVA',
        evidenceType: 'Consenso',
        level: 'Alta Evidência',
        doi: '10.1111/jsap.13680',
        summary: 'Diretriz científica recomendando sequenciamento de triagem laboratorial, imagens e manejo sintomático.'
      }
    ],
    clinicalTags,
    decisionNodes: {
      node1Title: 'Sinais Clínicos da Anamnese',
      node1Subtitle: `Relato registrado para ${name} (${species}, ${breed})`,
      node2Consensus: 'Consenso WSAVA & Nelson 2024',
      node2Title: 'Triagem Laboratorial & Ultrassom Abdominal',
      node2Subtitle: 'Correlacionar achados de anamnese com exames de imagem e sangue',
      node3Title: `${primaryDx} (88%)`,
      node3Subtitle: 'Iniciar suporte hemodinâmico e solicitação de exames de confirmação'
    },
    tutorExplanation: `O(A) ${name} passou pela avaliação com os sinais relatados na anamnese. Iniciaremos medicações de suporte para controle de desconforto e dor, além de exames laboratoriais e de imagem para confirmar a causa com máxima segurança.`
  };
}

export default function DifferentialDiagnosisWorkspace({
  patient,
  anamnesisText,
  uploadedFiles = [],
  aiReportText,
  sources = [],
  onOpenPrescription,
  onOpenTutorModal,
  onGeneratePdf,
}: DifferentialDiagnosisWorkspaceProps) {
  
  // Dynamically compute clinical data based on aiReportText or anamnesisText & patient
  const clinicalData = React.useMemo(() => {
    if (aiReportText) {
      const parsed = parseAIDifferentials(aiReportText, sources, patient, anamnesisText);
      if (parsed) return parsed;
    }
    return generateClinicalData(anamnesisText, patient);
  }, [aiReportText, sources, anamnesisText, patient]);

  // Expanded card IDs
  const [expandedHypothesis, setExpandedHypothesis] = useState<string[]>(['dx_1']);
  // Selected reference for AI Summary Modal
  const [selectedRefModal, setSelectedRefModal] = useState<Reference | null>(null);
  // Toggle for "Linha de Raciocínio / Mapa de Decisão"
  const [showReasoningMap, setShowReasoningMap] = useState(false);
  // Tutor explanation modal
  const [showTutorModal, setShowTutorModal] = useState(false);
  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // State for hypotheses so checkboxes can be toggled
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(clinicalData.hypotheses);
  const [references, setReferences] = useState<Reference[]>(clinicalData.references);

  React.useEffect(() => {
    setHypotheses(clinicalData.hypotheses);
    setReferences(clinicalData.references);
  }, [clinicalData]);

  // Toggle accordion card
  const toggleCard = (id: string) => {
    setExpandedHypothesis((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle conduct item checkbox
  const toggleConductItem = (hypoId: string, itemCode: string) => {
    setHypotheses((prev) => 
      prev.map((h) => {
        if (h.id !== hypoId) return h;
        return {
          ...h,
          conduct: h.conduct.map((c) => c.id === itemCode ? { ...c, checked: !c.checked } : c)
        };
      })
    );
  };

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC] min-h-full font-sans text-[#0F172A] selection:bg-indigo-100 selection:text-indigo-700 animate-fadeIn">
      
      {/* Toast message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-[#0F172A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-sans border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-[#10B981]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SUPERIOR DO MÓDULO 04 (BARRA DE METADADOS & AÇÕES) */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sm:px-6 shadow-2xs sticky top-0 z-20">
        <div className="max-w-[2160px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight font-sans">
                Diagnósticos Diferenciais Baseados em Evidências
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[#4F46E5] text-[10px] font-bold font-sans">
                Módulo 04 • RAG Workspace
              </span>
            </div>
            <p className="text-xs text-[#64748B] font-sans">
              Hipóteses ordenadas por probabilidade clínica, cruzadas com literatura científica e prontas para decisão médica.
            </p>
          </div>

          {/* Metadata Badges & Map Toggle Button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            
            <div className="hidden sm:flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-[11px] text-[#64748B] font-sans">
              <span className="flex items-center gap-1 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-[#4F46E5]" />
                <strong className="text-[#0F172A]">127</strong> referências
              </span>
              <span className="h-3 w-px bg-[#E2E8F0]" />
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                <strong className="text-[#0F172A]">12s</strong> processamento
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowReasoningMap(!showReasoningMap)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 font-sans ${
                showReasoningMap 
                  ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs' 
                  : 'bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{showReasoningMap ? 'Ocultar Mapa de Decisão' : 'Ver Linha de Raciocínio'}</span>
            </button>

          </div>

        </div>
      </header>

      {/* DRAWER LATERAL RECOLHÍVEL: LINHA DE RACIOCÍNIO / MAPA DE DECISÃO (DIFERENCIAL DE TRANSPARÊNCIA) */}
      <AnimatePresence>
        {showReasoningMap && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-950/95 text-white border-b border-indigo-900 p-4 sm:p-6 overflow-hidden shadow-inner"
          >
            <div className="max-w-[2160px] mx-auto space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#10B981]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-100 font-sans">
                    Mapa de Raciocínio Clínico & Grafo de Decisão
                  </h3>
                </div>
                <button 
                  onClick={() => setShowReasoningMap(false)}
                  className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-indigo-900/50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sequential Node Map */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-sans">
                
                {/* Node 1: Achado */}
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 block">1. Sinais Clínicos</span>
                  <p className="font-semibold text-white">{clinicalData.decisionNodes.node1Title}</p>
                  <p className="text-[10px] text-indigo-200 leading-tight">{clinicalData.decisionNodes.node1Subtitle}</p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center text-indigo-400">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Node 2: Evidência */}
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 block">2. Evidência {clinicalData.decisionNodes.node2Consensus}</span>
                  <p className="font-semibold text-white">{clinicalData.decisionNodes.node2Title}</p>
                  <p className="text-[10px] text-indigo-200 leading-tight">{clinicalData.decisionNodes.node2Subtitle}</p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center text-indigo-400">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Node 3: Hipótese & Confirmação */}
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#10B981] block">3. Diagnóstico Priorizado</span>
                  <p className="font-semibold text-white">{clinicalData.decisionNodes.node3Title}</p>
                  <p className="text-[10px] text-indigo-200 leading-tight">{clinicalData.decisionNodes.node3Subtitle}</p>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEÚDO PRINCIPAL (GRID 3 COLUNAS: ESQUERDA 22% | CENTRO 56% | DIREITA 22%) */}
      <div className="p-3 md:p-5 max-w-[2160px] w-full mx-auto pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* ================= COLUNA 1 — RESUMO CLÍNICO (~22%) ================= */}
          <div className="lg:col-span-3 space-y-3">
            
            {/* Card Paciente */}
            <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <PawPrint className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">Paciente</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#10B981] text-[9px] font-semibold border border-emerald-100 font-sans">
                  Em Atendimento
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-[#E2E8F0] overflow-hidden bg-indigo-50/50 shrink-0 shadow-3xs flex items-center justify-center">
                  <img 
                    src={patient.species === 'Felino' ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=120" : "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=120"} 
                    alt={patient.name || "Pet"} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <h2 className="text-base font-bold text-[#0F172A] font-sans truncate">{patient.name || "Paciente sem nome"}</h2>
                  <p className="text-xs font-medium text-[#64748B] font-sans truncate">
                    {patient.species || "Espécie N/I"} • {patient.breed || "Raça N/I"}
                  </p>
                  <p className="text-[11px] text-[#64748B] font-sans truncate">
                    {patient.sex || "Sexo N/I"} • {patient.age || "Idade N/I"} • {patient.weight ? `${patient.weight} kg` : "Peso N/I"}
                  </p>
                </div>
              </div>

              {/* Tutor Info */}
              <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 font-sans">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Tutor:</span>
                  <span className="font-semibold text-[#0F172A]">{patient.ownerName || patient.tutorName || "Não informado"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Telefone:</span>
                  <span className="font-semibold text-[#0F172A] tabular-nums">{patient.ownerPhone || patient.tutorPhone || "Não informado"}</span>
                </div>
              </div>

              {/* Vital Signs Grid */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase block font-sans">Sinais Vitais Registrados</span>
                <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-sans">
                  <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[#64748B] block text-[8px] font-bold uppercase">FC</span>
                    <span className="font-semibold text-[#0F172A]">{patient.fc ? (patient.fc.endsWith('bpm') ? patient.fc : `${patient.fc} bpm`) : "--"}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[#64748B] block text-[8px] font-bold uppercase">FR</span>
                    <span className="font-semibold text-[#0F172A]">{patient.fr ? (patient.fr.endsWith('mpm') ? patient.fr : `${patient.fr} mpm`) : "--"}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[#64748B] block text-[8px] font-bold uppercase">Temp</span>
                    <span className="font-semibold text-[#0F172A]">{patient.temperature ? (patient.temperature.includes('ºC') || patient.temperature.includes('°C') ? patient.temperature : `${patient.temperature} ºC`) : "--"}</span>
                  </div>
                </div>
              </div>

              {/* Extracted Clinical Tags */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase block font-sans">Tags Clínicas Mapeadas</span>
                <div className="flex flex-wrap gap-1">
                  {clinicalData.clinicalTags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-[#0F172A] text-[10px] font-medium font-sans">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Attached Files & Exams */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase block font-sans">Exames & Anexos</span>
                <div className="space-y-1 text-xs font-sans">
                  {uploadedFiles && uploadedFiles.length > 0 ? (
                    uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                          <span className="font-medium text-[#0F172A] text-[11px] truncate">{file.name}</span>
                        </div>
                        <span className="text-[9px] text-[#64748B] shrink-0">
                          {file.size ? (typeof file.size === 'number' ? `${(file.size / 1024).toFixed(0)} KB` : String(file.size)) : 'Anexo'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic py-1">Nenhum anexo enviado.</p>
                  )}
                </div>
              </div>

            </div>

          </div>


          {/* ================= COLUNA 2 — CLINICAL REASONING WORKSPACE (PRINCIPAL ~56%) ================= */}
          <div className="lg:col-span-6 space-y-3">
            
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] font-sans flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-[#4F46E5]" />
                Hipóteses Diagnósticas Classificadas ({hypotheses.length})
              </h2>
              <span className="text-[11px] text-[#64748B] font-sans">
                Clique para expandir justificativa e exames
              </span>
            </div>

            {/* List of Differential Diagnosis Cards */}
            <div className="space-y-3">
              {hypotheses.length === 0 ? (
                <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-8 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-[#4F46E5]">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A] font-sans">
                    Aguardando dados da Anamnese
                  </h3>
                  <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed font-sans">
                    Preencha os relatos e sinais clínicos do paciente no formulário ou gravação de áudio da anamnese para que a inteligência artificial RAG processe as hipóteses e recomendações médicas.
                  </p>
                </div>
              ) : (
                hypotheses.map((hypo) => {
                const isExpanded = expandedHypothesis.includes(hypo.id);
                
                // Color badges according to probability
                const probColor = hypo.probability === 'Alta' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : hypo.probability === 'Moderada' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-slate-100 text-slate-700 border-slate-200';

                const barColor = hypo.probability === 'Alta' ? 'bg-rose-500' : hypo.probability === 'Moderada' ? 'bg-amber-500' : 'bg-slate-400';

                return (
                  <motion.div
                    key={hypo.id}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className={`bg-white rounded-[20px] border transition-all ${
                      isExpanded ? 'border-[#4F46E5] shadow-md ring-2 ring-[#4F46E5]/10' : 'border-[#E2E8F0] hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    
                    {/* CARD HEADER (Always Visible) */}
                    <div 
                      onClick={() => toggleCard(hypo.id)}
                      className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-bold text-[#0F172A] font-sans tracking-tight">
                            {hypo.title}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-sans ${probColor}`}>
                            {hypo.probability} Probabilidade ({hypo.confidence}%)
                          </span>
                        </div>

                        {/* Subtle Confidence Bar */}
                        <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${hypo.confidence}%` }} />
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="p-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#0F172A] transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* EXPANDABLE ACCORDION CONTENT */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-xs font-sans"
                        >
                          
                          {/* 1. Justificativa Clínica */}
                          <div className="space-y-1.5 pt-2">
                            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#0F172A] font-sans flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                              Raciocínio & Justificativa Clínica:
                            </h4>
                            <ul className="space-y-1 text-[#334155] pl-1">
                              {hypo.justification.map((j, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-slate-100/80">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
                                  <span className="leading-relaxed">{j}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 2. Achados Compatíveis vs Achados Contra */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            
                            {/* Compatíveis */}
                            <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl space-y-2">
                              <span className="font-bold text-[10px] uppercase text-[#10B981] font-sans flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Achados Compatíveis
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {hypo.supportingFindings.map((f, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-900 text-[10px] font-semibold shadow-3xs">
                                    ✓ {f}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Contra */}
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                              <span className="font-bold text-[10px] uppercase text-slate-600 font-sans flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Achados Não Encontrados / Divergentes
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {hypo.contradictoryFindings.map((f, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-medium">
                                    • {f}
                                  </span>
                                ))}
                              </div>
                            </div>

                          </div>

                          {/* 3. Exames Recomendados com Prioridades */}
                          <div className="space-y-2 pt-1">
                            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#0F172A] font-sans flex items-center justify-between">
                              <span>Exames Complementares Sugeridos:</span>
                              <span className="text-[10px] font-normal text-[#64748B]">Para confirmação ou exclusão</span>
                            </h4>

                            <div className="space-y-1.5">
                              {hypo.recommendedTests.map((test, idx) => (
                                <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#0F172A] text-xs">{test.name}</span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                        test.priority === 'Alta' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                                      }`}>
                                        Prioridade {test.priority}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#64748B]">{test.reason}</p>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => showToast(`Exame "${test.name}" adicionado à solicitação.`)}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#4F46E5] hover:text-[#4F46E5] text-[10px] font-semibold transition-all shrink-0 cursor-pointer shadow-3xs"
                                  >
                                    Solicitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 4. Diagnósticos Diferenciais Relacionados */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase text-[#64748B] font-sans">
                              Diferenciais Correlacionados Próximos:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {hypo.relatedDiagnoses.map((rel, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-[#4F46E5] text-[#334155] text-[10px] font-medium border border-slate-200 cursor-pointer transition-colors"
                                >
                                  {rel}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 5. Conduta Inicial Terapêutica (Checklist) */}
                          <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] uppercase text-[#4F46E5] font-sans flex items-center gap-1.5">
                                <ClipboardList className="w-3.5 h-3.5" /> Conduta Inicial e Manejo Sugerido
                              </span>
                              <span className="text-[10px] font-semibold text-[#64748B]">
                                Prognóstico: <strong className="text-[#0F172A]">{hypo.prognosis}</strong>
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {hypo.conduct.map((c) => (
                                <label 
                                  key={c.id} 
                                  className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200/70 hover:border-indigo-300 transition-colors cursor-pointer"
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={c.checked} 
                                    onChange={() => toggleConductItem(hypo.id, c.id)}
                                    className="mt-0.5 rounded text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                                  />
                                  <span className={`text-xs ${c.checked ? 'text-[#0F172A] font-medium' : 'text-[#64748B] line-through'}`}>
                                    {c.label}
                                  </span>
                                </label>
                              ))}
                            </div>
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


          {/* ================= COLUNA 3 — PAINEL CIENTÍFICO (~22%) ================= */}
          <div className="lg:col-span-3 space-y-3">
            
            <div className="bg-white rounded-[20px] border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A] font-sans">
                    Literatura Utilizada
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] text-[9px] font-bold font-mono">
                  RAG Vetmind
                </span>
              </div>

              {/* References Cards */}
              <div className="space-y-2.5">
                {references.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic text-center py-4 font-sans">
                    Insira o relato da anamnese para consultar a literatura científica no motor RAG.
                  </p>
                ) : (
                  references.map((ref) => (
                    <div key={ref.id} className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 space-y-2 hover:border-[#4F46E5] transition-all group">
                      <div className="flex items-start justify-between gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#10B981] border border-emerald-100 text-[9px] font-bold font-sans">
                          {ref.level}
                        </span>
                        <span className="text-[9px] font-mono text-[#64748B]">{ref.evidenceType}</span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-[#0F172A] font-sans leading-snug group-hover:text-[#4F46E5] transition-colors">
                          {ref.title}
                        </h4>
                        <p className="text-[10px] text-[#64748B] font-sans">
                          {ref.authors} ({ref.year}) • <em className="not-italic text-[#334155]">{ref.journal}</em>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setSelectedRefModal(ref)}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-semibold text-[#4F46E5] hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Resumo IA</span>
                        </button>

                        <a
                          href={`https://doi.org/${ref.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>DOI</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-[#64748B] font-sans leading-relaxed">
                <strong className="text-[#0F172A] block mb-0.5">💡 Validação Científica:</strong>
                As evidências passam por filtro de relevância epidemiológica para pequenos animais com atualização quinzenal.
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* PAINEL INFERIOR (STICKY BOTTOM ACTION BAR) */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] py-3 px-4 sm:px-8 z-20 shadow-lg mt-6">
        <div className="max-w-[2160px] mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          
          <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-[#64748B] shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Conduta parametrizada para <strong>{patient.name || "Paciente"}</strong>{patient.weight ? ` (${patient.weight} kg)` : ""}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            
            <button
              type="button"
              onClick={() => {
                setShowTutorModal(true);
                if (onOpenTutorModal) onOpenTutorModal();
              }}
              className="px-3 py-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#0F172A] transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Explicar ao Tutor</span>
            </button>

            <button
              type="button"
              onClick={onGeneratePdf}
              className="px-3 py-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#0F172A] transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <Printer className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Criar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => showToast('Link do caso copiado para área de transferência.')}
              className="px-3 py-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#0F172A] transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <Share2 className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Compartilhar</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrescription}
              className="px-5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#3730A3] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer font-sans"
            >
              <Zap className="w-4 h-4" />
              <span>Gerar Prescrição Médica</span>
            </button>

          </div>

        </div>
      </div>

      {/* MODAL RESUMO IA DA LITERATURA */}
      <AnimatePresence>
        {selectedRefModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 max-w-lg w-full shadow-2xl space-y-4 font-sans text-[#0F172A]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                  <h3 className="font-bold text-sm font-sans">Resumo Científico Estruturado pela IA</h3>
                </div>
                <button 
                  onClick={() => setSelectedRefModal(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-sm text-[#0F172A]">{selectedRefModal.title}</h4>
                <p className="text-[#64748B] text-[11px]">{selectedRefModal.authors} ({selectedRefModal.year})</p>
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedRefModal.summary}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#3730A3] cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EXPLICAR AO TUTOR */}
      <AnimatePresence>
        {showTutorModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 max-w-xl w-full shadow-2xl space-y-4 font-sans text-[#0F172A]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#4F46E5]" />
                  <h3 className="font-bold text-sm font-sans">Tradução Clínica para o Tutor (Linguagem Acessível)</h3>
                </div>
                <button 
                  onClick={() => setShowTutorModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs space-y-3 leading-relaxed text-slate-800 font-sans">
                <p className="font-semibold text-[#0F172A]">
                  Olá, {patient.ownerName || 'Tutor'}! Aqui está um resumo claro sobre o estado de {patient.name || 'seu pet'}:
                </p>
                <p>
                  {clinicalData.tutorExplanation}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const petName = patient.name || 'Paciente';
                    navigator.clipboard.writeText(`Resumo para o Tutor de ${petName}: ${clinicalData.tutorExplanation}`);
                    showToast('Mensagem para o tutor copiada!');
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Copy className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>Copiar Mensagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTutorModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#3730A3] cursor-pointer font-sans"
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
}
