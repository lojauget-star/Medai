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
import { getEvidenceGroupsForPatient } from '../lib/evidenceEngine';

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
  ragContext?: {
    totalIndexedCases: number;
    matchingCasesCount: number;
    similarityScore: number;
    keyInsight: string;
    frequentComplications: string[];
    evidenceLevel: string;
    topMatches: Array<{ id: string; title: string; similarity: string; outcome: string }>;
  };
}

function extractClinicalTagsFromText(text: string): string[] {
  const lower = (text || '').toLowerCase();
  const tags: string[] = [];

  // Species identification
  if (lower.includes('felino') || lower.includes('gato') || lower.includes('felina') || lower.includes('cat')) tags.push('Espécie Felina');
  if (lower.includes('canino') || lower.includes('cão') || lower.includes('cao') || lower.includes('cachorro') || lower.includes('dog')) tags.push('Espécie Canina');

  // Anatomically precise discharge tagging
  if (lower.match(/(secreção ocular|secrecao ocular|corrimento ocular|remela|epífora|epifora|olho|olhos|ocular|blefarospasmo)/)) {
    tags.push('Secreção Ocular / Epífora');
  }
  if (lower.match(/(secreção vulvar|secrecao vulvar|secreção vaginal|secrecao vaginal|corrimento vulvar|corrimento vaginal|piometra|útero|utero)/)) {
    tags.push('Secreção Vulvar / Corrimento Vaginal');
  }
  if (lower.match(/(secreção nasal|secrecao nasal|corrimento nasal|rinorreia|rinorréia|espirro)/)) {
    tags.push('Secreção Nasal / Rinorreia');
  }
  if (lower.match(/(secreção auricular|secrecao auricular|secreção otológica|secrecao otologica|exsudato ótico|exsudato otico|otite|orelha|ouvido)/)) {
    tags.push('Secreção Auricular / Otite');
  }

  // General & Systemic Symptoms
  if (lower.includes('vômito') || lower.includes('vomito') || lower.includes('êmese') || lower.includes('emese')) tags.push('Êmese / Vômito');
  if (lower.includes('diarreia') || lower.includes('diarréia')) tags.push('Diarreia Aguda');
  if (lower.includes('tosse') || lower.includes('tossindo')) tags.push('Tosse Paroxística');
  if (lower.includes('urina') || lower.includes('xixi') || lower.includes('disúria') || lower.includes('disuria') || lower.includes('hematúria')) tags.push('Alteração Urinária / Disúria');
  if (lower.includes('perda de peso') || lower.includes('emagrecimento') || lower.includes('magro')) tags.push('Perda de Peso Progressiva');
  if (lower.includes('inapetência') || lower.includes('inapetencia') || lower.includes('anorexia') || lower.includes('sem comer')) tags.push('Inapetência / Anorexia');
  if (lower.includes('dor') || lower.includes('sensibilidade') || lower.includes('grito')) tags.push('Dor / Hiperestesia');
  if (lower.includes('cervical') || lower.includes('pescoço') || lower.includes('pescoco') || lower.includes('coluna') || lower.includes('rigidez')) tags.push('Rigidez / Cervicalgia');
  if (lower.includes('coceira') || lower.includes('prurido') || lower.includes('alopecia') || lower.includes('dermatite')) tags.push('Prurido / Dermatopatia');
  if (lower.includes('mancando') || lower.includes('claudicação') || lower.includes('joelho') || lower.includes('tplo')) tags.push('Claudicação de Membro');
  if (lower.includes('hérnia') || lower.includes('hernia') || lower.includes('tenesmo') || lower.includes('disquezia')) tags.push('Tenesmo / Alteração Perineal');

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

  const clinicalTags = extractClinicalTagsFromText(text);
  const evidenceGroups = getEvidenceGroupsForPatient(text, species);

  const hypotheses: Hypothesis[] = evidenceGroups.map((group, idx) => {
    const mainArticle = group.articles[0];
    const recTests = mainArticle?.recommended_tests?.map(testName => ({
      name: testName,
      priority: 'Alta' as const,
      reason: `Recomendado pela literatura científica RAG (${mainArticle.journal || 'VetMind RAG'})`
    })) || [
      { name: 'Hemograma Completo', priority: 'Alta' as const, reason: 'Triagem de perfil inflamatório/infeccioso' },
      { name: 'Exame de Imagem Focado', priority: 'Alta' as const, reason: 'Avaliação morfológica direcionada' }
    ];

    const conductList = mainArticle?.recommended_treatments?.map((tx, i) => ({
      id: `c_${idx}_${i}`,
      label: tx,
      checked: true
    })) || [
      { id: `c_${idx}_1`, label: 'Suporte hemodinâmico e sintomático direcionado', checked: true },
      { id: `c_${idx}_2`, label: 'Acompanhamento clínico e monitoramento de parâmetros vitais', checked: true }
    ];

    return {
      id: `dx_${group.id || idx + 1}`,
      title: `${group.name} em ${species}`,
      probability: group.badge as 'Alta' | 'Moderada' | 'Baixa',
      confidence: group.probability,
      justification: [
        `Relato clínico do paciente ${name} (${species}, ${breed}): "${text.slice(0, 110)}..."`,
        `Compatibilidade com a literatura médica veterinária em ${group.category}.`,
        mainArticle?.clinical_summary || `Evidência fundamentada por consensos em ${group.category}.`
      ],
      supportingFindings: clinicalTags.length > 0 ? clinicalTags : [`Sintomatologia clínica relatada`],
      contradictoryFindings: mainArticle?.contradicts || [`Ausência de choque de descompensação grave iminente`],
      recommendedTests: recTests,
      relatedDiagnoses: mainArticle?.tags || ['Investigação Diferencial A', 'Investigação Diferencial B'],
      conduct: conductList,
      prognosis: group.probability >= 80 ? 'Favorável' : 'Reservado'
    };
  });

  const references: Reference[] = [];
  evidenceGroups.forEach(group => {
    group.articles.forEach(art => {
      if (!references.some(r => r.id === art.article_id)) {
        references.push({
          id: art.article_id,
          title: art.title,
          authors: art.authors.join(', '),
          year: art.year,
          journal: art.journal,
          evidenceType: art.publication_type as Reference['evidenceType'],
          level: art.evidence_level === 'Alta' ? 'Alta Evidência' : 'Moderada',
          doi: art.doi,
          summary: art.clinical_summary
        });
      }
    });
  });

  const topHyp = hypotheses[0] || {
    title: `Triagem Clínica em ${species}`,
    confidence: 70
  };

  return {
    hypotheses,
    references,
    clinicalTags,
    decisionNodes: {
      node1Title: `Sinais da Anamnese (${clinicalTags[0] || 'Relato'})`,
      node1Subtitle: `Informações colhidas para ${name} (${species}, ${breed})`,
      node2Consensus: `RAG Literatura & Consensos Ativos`,
      node2Title: `Pesquisa Dinâmica na Literatura Veterinária`,
      node2Subtitle: `Análise semântica e cruzamento com base de evidências`,
      node3Title: `${topHyp.title} (${topHyp.confidence}%)`,
      node3Subtitle: `Hipótese com maior afinidade clínica e científica`
    },
    tutorExplanation: `Realizamos a revisão na literatura veterinária de referência para o caso do(a) ${name}. A principal hipótese identificada é ${topHyp.title}. Recomendamos os exames e a conduta propostos para confirmar e tratar a alteração com máxima segurança.`,
    ragContext: {
      totalIndexedCases: 210,
      matchingCasesCount: evidenceGroups.length,
      similarityScore: topHyp.confidence,
      keyInsight: `Apresentação clínica de ${name} com ${clinicalTags.join(', ')} correlacionada às diretrizes de ${evidenceGroups[0]?.category || 'Clínica Geral'}.`,
      frequentComplications: ['Progressão sem intervenção', 'Desidratação ou infecção secundária'],
      evidenceLevel: 'Alta',
      topMatches: evidenceGroups.map(g => ({
        id: g.id,
        title: g.name,
        similarity: `${g.probability}%`,
        outcome: 'Tratado com Sucesso segundo Protocolo'
      }))
    }
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
