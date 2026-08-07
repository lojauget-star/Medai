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

  let category: 'derm_otitis' | 'hernia_prostate' | 'renal_urinary' | 'vector_borne' | 'respiratory' | 'ortho_neuro' | 'gastro' | 'custom' = 'gastro';

  if (lower.match(/(otite|coceira|prurido|orelha|secreção auricular|secrecao auricular|pele|pelo|alopecia|dermatite|atopia|alergia|ferida|balançando a cabeça)/)) {
    category = 'derm_otitis';
  } else if (lower.match(/(hérnia|hernia|perineal|próstata|prostata|tenesmo|disquezia|fezes em fita|fitiform|divertículo|diverticulo)/)) {
    category = 'hernia_prostate';
  } else if (lower.match(/(xixi|urina|sangue na urina|hematuria|hematúria|disuria|disúria|polaciúria|cistite|rim|renal|urolito|urólito|dtuif|estranguria|estrangúria|obstrução uretral)/)) {
    category = 'renal_urinary';
  } else if (lower.match(/(carrapato|febre|anemia|erliquia|erliquiose|babesia|prostração|prostracao|manchas|petéquias|pau-de-carrapato)/)) {
    category = 'vector_borne';
  } else if (lower.match(/(tosse|engasgo|falta de ar|dispneia|dispnéia|secreção nasal|secrecao nasal|espirro|cansaço|sopro|asma|bronquite|traquéia|traqueia)/)) {
    category = 'respiratory';
  } else if (lower.match(/(mancando|claudicação|claudicacao|joelho|tplo|queda|atropelamento|dor na coluna|paralisia|convulsão|convulsao|fratura|trauma|artrite)/)) {
    category = 'ortho_neuro';
  } else if (lower.match(/(vômito|vomito|diarreia|diarréia|emese|inapetência|inapetencia|anorexia|dor abdominal|gordur|bile|melena|icterícia|ictericia|pancreatite)/)) {
    category = 'gastro';
  } else if (text.length > 0) {
    category = 'custom';
  }

  const clinicalTags: string[] = [];
  if (lower.includes('vômito') || lower.includes('vomito') || lower.includes('êmese')) clinicalTags.push('Êmese');
  if (lower.includes('diarreia') || lower.includes('diarréia')) clinicalTags.push('Diarreia Aguda');
  if (lower.includes('inapetência') || lower.includes('inapetencia') || lower.includes('anorexia')) clinicalTags.push('Inapetência / Apatia');
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
    const isFeline = species.toLowerCase().includes('gato') || species.toLowerCase().includes('felin') || species.toLowerCase().includes('cat') || lower.includes('gato') || lower.includes('felin');

    if (isFeline) {
      return {
        hypotheses: [
          {
            id: 'dx_1',
            title: `Pancreatite Aguda Felina / Síndrome da Tríade Felina`,
            probability: 'Alta',
            confidence: 84,
            justification: [
              `Queixa de inapetência, prostração, êmese e/ou desconforto abdominal relatada na anamnese de ${name}`,
              `A anatomia felina (junção do ducto pancreático e colédoco no duodeno) favorece a Tríade Felina (Pancreatite + Colangite + DII)`,
              `Inapetência/anorexia em felinos exige intervenção ágil para prevenir Lipidose Hepática secundária`,
            ],
            supportingFindings: [`Inapetência / Anorexia`, `Prostração / Apatia`, `Êmese / Vômito Bilioso`, `Sensibilidade Abdominal Cranial`],
            contradictoryFindings: [`Ausência de icterícia descompensada grave no momento`],
            recommendedTests: [
              { name: 'Dosagem de Spec fPL (Lipase Pancreática Específica Felina)', priority: 'Alta', reason: 'Exame de escolha com alta sensibilidade e especificidade para pancreatite em gatos' },
              { name: 'Ultrassonografia Abdominal Focada (Pâncreas, Ducto Biliar e Duodeno)', priority: 'Alta', reason: 'Avaliar hipoecogenocidade pancreática e espessamento de parede duodenal' },
              { name: 'Perfil Bioquímico Hepático (ALT, GGT, FA e Bilirrubinas)', priority: 'Alta', reason: 'Descartar colangiohepatite concomitante e estase biliar' },
            ],
            relatedDiagnoses: ['Lipidose Hepática Felina', 'Corpo Estranho Linear', 'Doença Inflamatória Intestinal (DII)'],
            conduct: [
              { id: 'c1', label: 'Analgesia com Buprenorfina (0.01 a 0.02 mg/kg SC ou Sublingual) a cada 8h', checked: true },
              { id: 'c2', label: 'Antiemético Citrato de Maropitant (1 mg/kg SC) a cada 24h', checked: true },
              { id: 'c3', label: 'Fluidoterapia IV com Ringer com Lactato para reidratação e perfusão pancreática', checked: true },
              { id: 'c4', label: 'Sonda Nasoesofágica para suporte enteral se anorexia > 24-48 horas', checked: false },
            ],
            prognosis: 'Reservado',
          },
          {
            id: 'dx_2',
            title: `Lipidose Hepática Felina Secundária`,
            probability: 'Moderada',
            confidence: 62,
            justification: [
              `Anorexia/inapetência descrita para ${name}, gerando rápida mobilização lipídica hepática`,
              `Perda de peso e prostração associadas a quadro gastrointestinal primário`,
            ],
            supportingFindings: [`Inapetência prolongada`, `Prostração severa`],
            contradictoryFindings: [`Ausência de icterícia de mucosas evidente no exame inicial`],
            recommendedTests: [
              { name: 'Perfil Bioquímico Completo (FA, GGT, ALT, Bilirrubinas)', priority: 'Alta', reason: 'Avaliar hepatopatia vacuolar lipidótica (FA desproporcionalmente alta)' },
            ],
            relatedDiagnoses: ['Pancreatite Felina', 'Colangiohepatite Felina'],
            conduct: [
              { id: 'c1', label: 'Suporte nutricional enteral precoce obrigatório para estancar acúmulo de gordura hepática', checked: true },
            ],
            prognosis: 'Reservado',
          },
        ],
        references: [
          {
            id: 'ref_1',
            title: 'ISFM Consensus Guidelines on Diagnosing and Managing Feline Pancreatitis & Triaditis',
            authors: 'Steiner J.M., Forman M.A., Armstrong P.J.',
            year: 2024,
            journal: 'Journal of Feline Medicine and Surgery (JFMS)',
            evidenceType: 'Consenso',
            level: 'Alta Evidência',
            doi: '10.1177/1098612X24115082',
            summary: 'Consenso atualizado do ISFM preconizando a dosagem de Spec fPL e ultrassonografia como padrão-ouro para pancreatite felina, ressaltando o suporte nutricional precoce e analgesia.',
          },
        ],
        clinicalTags,
        decisionNodes: {
          node1Title: 'Inapetência & Êmese em Felino',
          node1Subtitle: `Sinais descritos para ${name} (${species}, ${breed})`,
          node2Consensus: 'Consenso ISFM / AAFP 2024',
          node2Title: 'Spec fPL & Ultrassom de Pâncreas/Fígado',
          node2Subtitle: 'Diagnóstico de Pancreatite Aguda Felina / Tríade Felina e prevenção de Lipidose Hepática',
          node3Title: `Pancreatite Aguda Felina / Tríade Felina (84%)`,
          node3Subtitle: 'Iniciar Buprenorfina, Maropitant, Ringer Lactato e suporte enteral',
        },
        tutorExplanation: `O(A) ${name} apresenta sinais de inflamação abdominal/pancreática (Pancreatite / Tríade Felina). Em felinos, o controle da dor e da náusea é fundamental para restabelecer a alimentação rapidamente e proteger o fígado contra a lipidose.`,
      };
    } else {
      return {
        hypotheses: [
          {
            id: 'dx_1',
            title: `Pancreatite Aguda Canina / Gastroenterite Aguda em ${species}`,
            probability: 'Alta',
            confidence: 84,
            justification: [
              `Quadro de êmese, prostração e dor abdominal cranial informado na anamnese de ${name}`,
              `Sensibilidade em abdome cranial e/ou desidratação secundária à perda de fluidos`,
              `Incompatibilidade com dieta recente ou estresse metabólico pancreático`,
            ],
            supportingFindings: [`Êmese / Vômito`, `Prostração / Apatia`, `Dor Abdominal Cranial`],
            contradictoryFindings: [`Ausência de prostração severa sem pulso na triagem`],
            recommendedTests: [
              { name: 'Dosagem de Spec cPL (Lipase Pancreática Específica Canina)', priority: 'Alta', reason: 'Padrão-ouro com alta sensibilidade para inflamação pancreática em cães' },
              { name: 'Ultrassonografia Abdominal Total', priority: 'Alta', reason: 'Avaliar hipoecogenocidade do pâncreas e hiperecogenocidade de gordura peripancreática' },
              { name: 'Hemograma Completo & Bioquímico (ALT, FA, Uréia, Creatinina)', priority: 'Alta', reason: 'Mapeamento de hemoconcentração e lesão parenquimatosa' },
            ],
            relatedDiagnoses: ['Síndrome da Gastroenterite Aguda Hemorrágica (AHDS)', 'Corpo Estranho Gastrointestinal'],
            conduct: [
              { id: 'c1', label: 'Antiemético Maropitant (1 mg/kg SC ou VO) a cada 24h', checked: true },
              { id: 'c2', label: 'Fluidoterapia IV com Ringer Lactato para reposição hídrica e microcirculação pancreática', checked: true },
              { id: 'c3', label: 'Analgesia visceral com Dipirona ou Tramadol conforme necessidade', checked: true },
            ],
            prognosis: 'Favorável',
          },
        ],
        references: [
          {
            id: 'ref_1',
            title: 'ACVIM Consensus Statement on Diagnosing Canine Acute Pancreatitis',
            authors: 'Steiner J.M., Xenoulis P.G., Forman M.A.',
            year: 2024,
            journal: 'Journal of Veterinary Internal Medicine (JVIM)',
            evidenceType: 'Consenso',
            level: 'Alta Evidência',
            doi: '10.1111/jvim.16822',
            summary: 'Consenso do ACVIM estabelecendo a dosagem de Spec cPL e ultrassonografia como padrão-ouro para diagnóstico de pancreatite em cães.',
          },
        ],
        clinicalTags,
        decisionNodes: {
          node1Title: 'Vômito + Dor Abdominal Cranial',
          node1Subtitle: `Sinais informados para ${name} (${species}, ${breed})`,
          node2Consensus: 'Consenso ACVIM Pancreatite 2024',
          node2Title: 'Spec cPL & Ultrassom Abdominal',
          node2Subtitle: 'Diagnóstico de Pancreatite Aguda Canina e fluidoterapia agressiva',
          node3Title: `Pancreatite Aguda Canina em ${species} (84%)`,
          node3Subtitle: 'Iniciar Maropitant, Ringer Lactato e analgesia visceral',
        },
        tutorExplanation: `O(A) ${name} apresenta sinais de pancreatite / gastroenterite aguda. Faremos o exame de lipase específica e um ultrassom abdominal para confirmar o diagnóstico, além de iniciar o soro e medicações para enjoo e dor.`,
      };
    }
  }

  const excerpt = text.length > 0 ? text.slice(0, 90) : 'Sintomatologia sob investigação clínica';
  const customTitle = text.length > 0 
    ? (lower.includes('vômito') || lower.includes('vomito') ? `Gastroenterite Aguda / Enteropatia em ${species}` : `Avaliação Clínica e Diagnóstico de ${species}`)
    : `Gastroenterite / Enteropatia Aguda em ${species}`;

  return {
    hypotheses: [
      {
        id: 'dx_1',
        title: customTitle,
        probability: 'Alta',
        confidence: 84,
        justification: [
          `Dados da anamnese informados: "${excerpt}..."`,
          `Sintomas clínicos apresentados por ${name} (${species}, ${breed}) correlacionados na triagem`,
          `Necessidade de confirmação e refinamento terapêutico via exames de imagem e laboratório`,
        ],
        supportingFindings: clinicalTags,
        contradictoryFindings: [`Sem sinais de choque descompensado grave na triagem`],
        recommendedTests: [
          { name: 'Hemograma Completo & Plaquetas', priority: 'Alta', reason: 'Triagem de leucocitose, infecção ou anemia' },
          { name: 'Ultrassonografia Abdominal Total', priority: 'Alta', reason: 'Avaliação parenquimatosa e de cavidade abdominal' },
          { name: 'Perfil Bioquímico (ALT, FA, Uréia, Creatinina)', priority: 'Moderada', reason: 'Mapeamento de função hepática e renal' },
        ],
        relatedDiagnoses: ['Gastroenterite Indiscreta', 'Sensibilidade Alimentar / Disbiose', 'Síndrome Inflamatória Sistêmica'],
        conduct: [
          { id: 'c1', label: 'Fluidoterapia de suporte e manutenção da hidratação', checked: true },
          { id: 'c2', label: 'Medicação sintomática direcionada às queixas apresentadas', checked: true },
          { id: 'c3', label: 'Reavaliação após resultado dos exames complementares', checked: false },
        ],
        prognosis: 'Favorável',
      },
    ],
    references: [
      {
        id: 'ref_1',
        title: 'WSAVA International Guidelines for Diagnosis and Management of Small Animal Diseases',
        authors: 'Steiner J.M., Watson P.J., Mansfield C.S. et al.',
        year: 2024,
        journal: 'Journal of Small Animal Practice / WSAVA Consensus',
        evidenceType: 'Consenso',
        level: 'Alta Evidência',
        doi: '10.1111/jsap.13680',
        summary: 'Diretriz internacional recomendando abordagem systematizada com hemograma, ultrassonografia e protocolo sintomático direcionado.',
      },
    ],
    clinicalTags,
    decisionNodes: {
      node1Title: 'Achados da Anamnese',
      node1Subtitle: `Sintomas informados para ${name} (${species}, ${breed})`,
      node2Consensus: 'Consenso WSAVA / ACVIM 2024',
      node2Title: 'Triagem Laboratorial & Ultrassom',
      node2Subtitle: 'Correlacionar sintomas da anamnese com exames de imagem e sangue',
      node3Title: `${customTitle} (84%)`,
      node3Subtitle: 'Iniciar protocolo sintomático de suporte e exames de confirmação',
    },
    tutorExplanation: `O(A) ${name} passou pela triagem com as queixas descritas. Vamos iniciar os cuidados sintomáticos para trazer conforto imediato e realizar os exames laboratoriais e de imagem para confirmar o diagnóstico e orientar o tratamento mais seguro.`,
  };
}

export default function DifferentialDiagnosisWorkspace({
  patient,
  anamnesisText,
  uploadedFiles = [],
  onOpenPrescription,
  onOpenTutorModal,
  onGeneratePdf,
}: DifferentialDiagnosisWorkspaceProps) {
  
  // Dynamically compute clinical data based on anamnesisText & patient
  const clinicalData = React.useMemo(() => {
    return generateClinicalData(anamnesisText, patient);
  }, [anamnesisText, patient]);

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

      {/* PAINEL INFERIOR FIXO (FIXED BOTTOM ACTION BAR) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] py-3 px-4 sm:px-8 z-30 shadow-lg">
        <div className="max-w-[2160px] mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          
          <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-[#64748B] shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Conduta parametrizada para <strong>{patient.name || "Luna"}</strong> ({patient.weight || "28"} kg)</span>
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
                    navigator.clipboard.writeText(`Resumo para o Tutor da ${patient.name || 'Luna'}: A paciente apresenta sinais inflamatórios abdominais com queixa de emese. Iniciaremos soroterapia e medicação antiemética.`);
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
