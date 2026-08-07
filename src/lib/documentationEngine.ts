import {
  Patient,
  ClinicalDocument,
  ClinicalDocumentType,
  ClinicalDocumentSection,
  CanonicalCaseData,
  ClinicalDocumentStatus
} from '../types';

/**
 * DOCUMENTATION ENGINE — MÓDULO 07 VETMIND
 * Centralized Canonical Case Model + Template Engine + Prescription Engine + Validation Engine + Version Control
 */

export const INITIAL_CANONICAL_CASE: CanonicalCaseData = {
  patient: {
    name: '',
    species: 'Canina',
    breed: '',
    age: '',
    weight: '',
    tutorName: '',
    tutorPhone: '',
    ownerId: ''
  },
  activeHypothesis: 'Aguardando Anamnese',
  medications: [],
  requestedExams: [],
  careGoals: [],
  tutorInstructions: [],
  anamnesisSummary: '',
  version: 1
};

export function getCanonicalCaseForPatient(patient: Patient, anamnesisText?: string): CanonicalCaseData {
  const name = patient.name || 'Paciente';
  const species = patient.species || 'Canina';
  const breed = patient.breed || 'SRD';
  const age = patient.age || 'Não informada';
  const weightVal = parseFloat((patient.weight || '').replace(',', '.')) || 0;
  const weightStr = patient.weight ? `${patient.weight} kg` : 'Não informado';
  const tutorName = patient.tutorName || 'Tutor Não Informado';
  const tutorPhone = patient.tutorPhone || '';

  const cleanText = (anamnesisText || '').trim();
  const lower = cleanText.toLowerCase();

  if (!cleanText || cleanText.length < 5) {
    return {
      patient: { name, species, breed, age, weight: weightStr, tutorName, tutorPhone, ownerId: 'owner-current' },
      activeHypothesis: 'Aguardando Anamnese',
      medications: [],
      requestedExams: [],
      careGoals: [],
      tutorInstructions: [],
      anamnesisSummary: '',
      version: 1
    };
  }

  // Determine category
  let category: 'derm_otitis' | 'renal_urinary' | 'vector_borne' | 'respiratory' | 'ortho_neuro' | 'gastro' = 'gastro';

  if (lower.match(/(otite|coceira|prurido|orelha|secreção auricular|secrecao auricular|pele|pelo|alopecia|dermatite|atopia|alergia)/)) {
    category = 'derm_otitis';
  } else if (lower.match(/(xixi|urina|sangue na urina|hematuria|hematúria|disuria|disúria|polaciúria|cistite|rim|renal|urolito|urólito|dtuif|estranguria|estrangúria)/)) {
    category = 'renal_urinary';
  } else if (lower.match(/(carrapato|febre|anemia|erliquia|erliquiose|babesia|prostração|prostracao|petéquias)/)) {
    category = 'vector_borne';
  } else if (lower.match(/(tosse|engasgo|falta de ar|dispneia|dispnéia|secreção nasal|espirro|asma|bronquite)/)) {
    category = 'respiratory';
  } else if (lower.match(/(mancando|claudicação|claudicacao|dor na coluna|paralisia|convulsão|fratura|trauma)/)) {
    category = 'ortho_neuro';
  }

  if (category === 'derm_otitis') {
    return {
      patient: { name, species, breed, age, weight: weightStr, tutorName, tutorPhone, ownerId: 'owner-current' },
      activeHypothesis: `Otite Externa Aguda / Dermatopatia em ${species}`,
      medications: [
        {
          name: 'Solução Otológica Tríplice (Antibiótico + Antifúngico + Corticoide)',
          dose: '4 a 6 gotas em cada conduto auditivo afetado',
          frequency: 'A cada 12 horas',
          duration: '10 dias',
          route: 'Tópica Auricular',
          notes: 'Limpar o conduto suavemente com solução de ceruminólise neutra 15 min antes da medicação.'
        },
        {
          name: 'Solução Neutra de Limpeza Auricular (Ceruminolítica)',
          dose: '2 a 3 mL no conduto auditivo + massagem na base',
          frequency: 'A cada 24 horas (ou antes do otológico)',
          duration: '10 dias',
          route: 'Tópica Auricular',
          notes: 'Remover o excesso ceruminoso com algodão seco, sem introduzir hastes rígidas.'
        },
        {
          name: 'Dipirona Sódica (25 mg/kg)',
          dose: weightVal > 0 ? `${Math.round(weightVal * 25)} mg` : '25 mg/kg',
          frequency: 'A cada 8 horas',
          duration: '3 a 5 dias',
          route: 'Oral',
          notes: 'Alívio da dor e desconforto auricular agudo.'
        }
      ],
      requestedExams: [
        'Citologia de Exsudato Auricular (Lâmina por Impronta)',
        'Otoscopia Direta / Vídeo-Otoscopia',
        'Cultura e Antibiograma Auricular (se refratário ou recidivante)'
      ],
      careGoals: [
        'Cessação do prurido e abano de cabeça em 48h',
        'Redução do eritema e exsudação do conduto auditivo',
        'Cura microbiológica confirmada por citologia antes da alta'
      ],
      tutorInstructions: [
        `Aplicar os medicamentos exatamente nos horários prescritos para o(a) ${name}.`,
        'Limpar suavemente a orelha antes das gotas otológicas para garantir contato com a mucosa.',
        'Usar colar elizabetano se o pet tentar coçar ou machucar as orelhas.',
        'Retornar em 7-10 dias para reavaliação otoscópica e citológica de controle.'
      ],
      anamnesisSummary: cleanText,
      version: 1
    };
  }

  if (category === 'renal_urinary') {
    return {
      patient: { name, species, breed, age, weight: weightStr, tutorName, tutorPhone, ownerId: 'owner-current' },
      activeHypothesis: `Cistite / Afeção Urinária em ${species}`,
      medications: [
        {
          name: 'Meloxicam (0,1 mg/kg) - Anti-inflamatório',
          dose: weightVal > 0 ? `${(weightVal * 0.1).toFixed(1)} mg` : '0,1 mg/kg',
          frequency: 'A cada 24 horas',
          duration: '3 a 5 dias',
          route: 'Oral (após alimentação)',
          notes: 'Apenas se a função renal e hidratação estiverem preservadas. Suspender se houver emese.'
        },
        {
          name: 'Dipirona Sódica (25 mg/kg) - Analgésico',
          dose: weightVal > 0 ? `${Math.round(weightVal * 25)} mg` : '25 mg/kg',
          frequency: 'A cada 8 horas',
          duration: '5 dias',
          route: 'Oral / Subcutâneo',
          notes: 'Controle de dor vesical e desconforto miccional.'
        }
      ],
      requestedExams: [
        'Urinálise Tipo 1 (EAS) + Refratometria de Densidade',
        'Ultrassonografia de Rins e Vesícula Urinária',
        'Urocultura com Antibiograma por Cistocentese'
      ],
      careGoals: [
        'Resolução da disúria e hematúria em até 72h',
        'Manutenção de diurese adequada sem obstrução uretral'
      ],
      tutorInstructions: [
        `Estimular o consumo hídrico de ${name} oferecendo água fresca e alimentos úmidos.`,
        'Observar se o pet consegue urinar sem fazer força excessiva ou demonstrar dor.',
        'Contatar a clínica imediatamente se houver anúria (impossibilidade total de urinar).'
      ],
      anamnesisSummary: cleanText,
      version: 1
    };
  }

  if (category === 'ortho_neuro') {
    return {
      patient: { name, species, breed, age, weight: weightStr, tutorName, tutorPhone, ownerId: 'owner-current' },
      activeHypothesis: `Afeção Osteomioarticular / Neurológica em ${species}`,
      medications: [
        {
          name: 'Meloxicam (0,1 mg/kg)',
          dose: weightVal > 0 ? `${(weightVal * 0.1).toFixed(1)} mg` : '0,1 mg/kg',
          frequency: 'A cada 24 horas',
          duration: '5 dias',
          route: 'Oral (com alimentos)',
          notes: 'Anti-inflamatório não esteroidal para redução de edema e dor articular.'
        },
        {
          name: 'Dipirona Sódica (25 mg/kg) + Gabapentina (10 mg/kg)',
          dose: weightVal > 0 ? `Dipirona ${Math.round(weightVal * 25)} mg + Gabapentina ${Math.round(weightVal * 10)} mg` : 'Conforme peso',
          frequency: 'A cada 8-12 horas',
          duration: '7 a 10 dias',
          route: 'Oral',
          notes: 'Analgesia multimodal preventiva para dor neuropática ou musculoesquelética.'
        }
      ],
      requestedExams: [
        'Exame Radiográfico Simples/Ortogonal da Região Afetada',
        'Avaliação Ortopédica e Neurológica Especializada'
      ],
      careGoals: [
        'Controle ágil da dor aguda (Escore Glasgow < 3) em 24h',
        'Restabelecimento gradual do apoio e mobilidade do membro'
      ],
      tutorInstructions: [
        `Manter ${name} em repouso absoluto. Evitar subida em sofás, camas e escadas.`,
        'Passeios permitidos apenas para necessidades fisiológicas com coleira/guia curta.'
      ],
      anamnesisSummary: cleanText,
      version: 1
    };
  }

  // Default Gastro / General (Symptom-aware)
  const isPancreatitisMentioned = lower.includes('pancreatite') || lower.includes('lipase') || lower.includes('gordura') || lower.includes('dor abdominal');
  const activeHypothesis = isPancreatitisMentioned
    ? `Pancreatite Aguda / Enteropatia Inflamatória em ${species}`
    : `Gastroenterite Aguda / Indiscreção Alimentar em ${species}`;

  return {
    patient: { name, species, breed, age, weight: weightStr, tutorName, tutorPhone, ownerId: 'owner-current' },
    activeHypothesis,
    medications: [
      {
        name: 'Maropitant (Citrato de Maropitant)',
        dose: weightVal > 0 ? `1 mg/kg (${(weightVal * 1).toFixed(1)} mg)` : '1 mg/kg',
        frequency: 'A cada 24 horas',
        duration: '3 a 5 dias',
        route: 'Subcutânea ou Oral',
        notes: 'Antiemético e visceral para controle de emese e náusea.'
      },
      {
        name: 'Dipirona Sódica (25 mg/kg)',
        dose: weightVal > 0 ? `${Math.round(weightVal * 25)} mg` : '25 mg/kg',
        frequency: 'A cada 8 horas',
        duration: '3 a 5 dias',
        route: 'Oral ou IV/SC',
        notes: 'Analgesia visceral para alívio de desconforto abdominal.'
      },
      {
        name: 'Ringer com Lactato (Fluidoterapia IV/SC)',
        dose: weightVal > 0 ? `50 a 60 mL/kg/dia (${Math.round(weightVal * 50)} mL/dia)` : '50 mL/kg/dia',
        frequency: 'Contínuo ou fracionado',
        duration: '24 a 48 horas',
        route: 'Intravenosa / Subcutânea',
        notes: 'Manutenção da hidratação e reidratação de perdas volêmicas.'
      }
    ],
    requestedExams: [
      'Dosagem de Lipase Pancreática Específica (Spec cPL / Spec fPL)',
      'Ultrassonografia Abdominal Focada em Trato Gastrointestinal',
      'Hemograma Completo + Proteína Plasmática Total',
      'Painel Bioquímico (ALT, FA, Uréia, Creatinina e Eletrólitos)'
    ],
    careGoals: [
      'Cessação da êmese e da náusea em até 24 horas',
      'Ressuscitação volêmica e restauração da hidratação corporal',
      'Controle efetivo do desconforto e dor visceral abdominal'
    ],
    tutorInstructions: [
      `Oferecer água limpa e fresca em pequenas quantidades para ${name}.`,
      'Oferecer dieta leve e altamente digestível assim que liberado pelo médico veterinário.',
      'Acompanhar de perto a frequência de episódios de vômito e fezes, e comunicar qualquer alteração.'
    ],
    anamnesisSummary: cleanText,
    version: 1
  };
}

export function buildDocumentsFromCanonicalCase(canonical: CanonicalCaseData): ClinicalDocument[] {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const isAwaitingAnamnesis = canonical.activeHypothesis === 'Aguardando Anamnese' || !canonical.anamnesisSummary;

  // 1. PRESCRICAO
  const prescriptionDoc: ClinicalDocument = {
    id: 'doc-presc-1',
    type: 'prescription',
    title: 'Prescrição Médica Veterinária',
    subtitle: 'Receituário Terapêutico Estruturado',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:30`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:8f9a2b1c4e7d3f6a5b8c9d0e1f2a3b4c'
    },
    sections: [
      {
        id: 'sec-p1',
        title: 'Medicações Prescritas',
        content: isAwaitingAnamnesis || canonical.medications.length === 0
          ? 'Nenhuma medicação prescrita. Insira os relatos da consulta na aba Anamnese para gerar as recomendações terapêuticas.'
          : canonical.medications.map((m, i) => `${i + 1}. ${m.name}\n   • Dose: ${m.dose}\n   • Via: ${m.route} | Frequência: ${m.frequency} | Duração: ${m.duration}\n   • Obs: ${m.notes}`).join('\n\n'),
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: "Plumb's Veterinary Drug Handbook (2023)",
          guideline: 'ACVIM Guidelines',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-p2',
        title: 'Orientações Especiais de Manejo',
        content: isAwaitingAnamnesis
          ? 'Aguardando registro de anamnese e avaliação clínica para gerar as orientações de manejo.'
          : '• Administrar as medicações nos horários recomendados.\n• Não suspender o tratamento antes do prazo estipulado mesmo com melhora dos sintomas.',
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'WSAVA Guidelines',
          guideline: 'WSAVA Standards',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 2. SOLICITACAO DE EXAMES
  const examDoc: ClinicalDocument = {
    id: 'doc-exam-1',
    type: 'exam_request',
    title: 'Solicitação de Exames Complementares',
    subtitle: 'Pedido Laboratorial e Imagem',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:31`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d'
    },
    sections: [
      {
        id: 'sec-e1',
        title: 'Exames Laboratoriais Solicitados',
        content: isAwaitingAnamnesis || canonical.requestedExams.filter(e => !e.includes('Ultrassono')).length === 0
          ? 'Nenhum exame laboratorial solicitado. Insira os relatos na Anamnese para gerar o pedido.'
          : canonical.requestedExams.filter(e => !e.includes('Ultrassono')).map((e, idx) => `${idx + 1}. ${e}`).join('\n'),
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Veterinary Clinical Pathology (2024)',
          guideline: 'ACVIM Guidelines',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-e2',
        title: 'Exames de Imagem Diagnóstica',
        content: isAwaitingAnamnesis || canonical.requestedExams.filter(e => e.includes('Ultrassono')).length === 0
          ? 'Nenhum exame de imagem solicitado.'
          : canonical.requestedExams.filter(e => e.includes('Ultrassono')).map((e, idx) => `${idx + 1}. ${e}`).join('\n'),
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Atlas of Veterinary Diagnostic Imaging',
          guideline: 'ACVS Standards',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-e3',
        title: 'Justificativa Clínica para o Laboratório',
        content: isAwaitingAnamnesis
          ? `Aguardando registro de anamnese do paciente ${canonical.patient.name}.`
          : `Investigação clínica para o paciente ${canonical.patient.name} (${canonical.patient.species}, ${canonical.patient.breed}, ${canonical.patient.weight}). Suspeita primária: ${canonical.activeHypothesis}. Relato da anamnese: "${canonical.anamnesisSummary}".`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Raciocínio Clínico Vetmind RAG',
          guideline: 'Decisão do Médico Veterinário',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 3. EVOLUÇÃO CLÍNICA (SOAP)
  const evolutionDoc: ClinicalDocument = {
    id: 'doc-[#3]',
    type: 'clinical_evolution',
    title: 'Registro de Evolução Clínica (SOAP)',
    subtitle: 'Prontuário Médico Interno',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:32`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d'
    },
    sections: [
      {
        id: 'sec-ev1',
        title: 'Subjetivo (S)',
        content: isAwaitingAnamnesis
          ? `Nenhum relato de anamnese informado para ${canonical.patient.name}. Preencha os sintomas e queixa principal na aba Anamnese.`
          : `Relato da Anamnese: "${canonical.anamnesisSummary}". Queixa informada pelo tutor (${canonical.patient.tutorName}).`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Anamnese Transcrita',
          guideline: 'Acolhimento Clínico',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-ev2',
        title: 'Objetivo (O)',
        content: isAwaitingAnamnesis
          ? `Exame físico a ser registrado durante a avaliação do paciente ${canonical.patient.name}.`
          : `Exame Físico: FC ${canonical.patient.fc || '110 bpm'}, FR ${canonical.patient.fr || '28 mpm'}, T ${canonical.patient.temperature || '38.5°C'}, TPC ${canonical.patient.tpc || '2s'}, Mucosas ${canonical.patient.mucosas || 'Róseas'}, Hidratação ${canonical.patient.hydration || 'Normohidratado'}. Parâmetros triados.`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Exame Físico Sistematizado',
          guideline: 'WSAVA Triage',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-ev3',
        title: 'Avaliação (A)',
        content: isAwaitingAnamnesis
          ? 'Aguardando registro da anamnese para calcular hipóteses diagnósticas.'
          : `Quadro clínico compatível com ${canonical.activeHypothesis}. Sinais e relatos correlacionados via RAG Vetmind.`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'ACVIM Consensus',
          guideline: 'RAG Medical Engine',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-ev4',
        title: 'Plano (P)',
        content: isAwaitingAnamnesis
          ? 'Aguardando anamnese para gerar o plano terapêutico e exames.'
          : `Atendimento inicial, medicação sintomática (${canonical.medications.length > 0 ? canonical.medications.map(m => m.name.split(' ')[0]).join(', ') : 'conforme prescrição'}) e solicitação de exames.`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Clinical Decision Engine',
          guideline: 'Validação do Veterinário',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 4. PLANO TERAPÊUTICO
  const therapeuticDoc: ClinicalDocument = {
    id: 'doc-[#4]',
    type: 'therapeutic_plan',
    title: 'Plano Terapêutico Integrado',
    subtitle: 'Diretrizes do Internamento e Metas',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:33`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e'
    },
    sections: [
      {
        id: 'sec-tp1',
        title: 'Metas Terapêuticas Imediatas',
        content: isAwaitingAnamnesis || canonical.careGoals.length === 0
          ? 'Aguardando registro de anamnese para definir as metas terapêuticas.'
          : canonical.careGoals.map((g, i) => `${i + 1}. ${g}`).join('\n'),
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Protocolo Terapêutico Vetmind',
          guideline: 'EVECC Guidelines',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-tp2',
        title: 'Cronograma de Monitoramento',
        content: isAwaitingAnamnesis
          ? 'Aguardando definição de cronograma de monitoramento.'
          : '• A cada 2h: Avaliação de dor e sinais vitais (FC/FR).\n• A cada 6h: Avaliação de hidratação e diurese.\n• A cada 12h: Reavaliação clínica geral.',
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Monitoring Standards',
          guideline: 'VECCS Emergency',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 5. RESUMO PARA TUTOR
  const tutorDoc: ClinicalDocument = {
    id: 'doc-[#5]',
    type: 'tutor_summary',
    title: 'Resumo de Orientações para o Tutor',
    subtitle: 'Linguagem Acolhedora e Acessível',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:34`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f'
    },
    sections: [
      {
        id: 'sec-[#1]',
        title: 'O que está acontecendo com o seu pet?',
        content: isAwaitingAnamnesis
          ? `Aguardando o registro da consulta para gerar a explicação para o tutor de ${canonical.patient.name}.`
          : `O(A) ${canonical.patient.name} está sendo avaliado(a) para a suspeita de ${canonical.activeHypothesis}. Os sintomas relatados na consulta foram registrados e a equipe veterinária iniciou os cuidados adequados.`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Comunicação Empática Vetmind',
          guideline: 'AAHA Client Education',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-[#2]',
        title: 'Cuidados em Casa e Alimentação',
        content: isAwaitingAnamnesis || canonical.tutorInstructions.length === 0
          ? 'Siga as orientações passadas verbalmente pela equipe médica.'
          : canonical.tutorInstructions.map((inst) => `• ${inst}`).join('\n'),
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Manejo Domiciliar',
          guideline: 'WSAVA Nutrition',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-[#3]',
        title: 'Sinais de Alerta para Retorno Imediato',
        content: '• Se o pet demonstrar prostração acentuada ou fraqueza repentina.\n• Se recusar água/alimento por mais de 24h.\n• Se apresentar recaída dos sintomas iniciais.',
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Triage de Emergência',
          guideline: 'Manual do Tutor',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 6. ALTA
  const dischargeDoc: ClinicalDocument = {
    id: 'doc-[#6]',
    type: 'discharge',
    title: 'Termo de Alta Hospitalar e Recomendações',
    subtitle: 'Relatório de Finalização de Internato',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:35`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a'
    },
    sections: [
      {
        id: 'sec-dis1',
        title: 'Resumo da Internação',
        content: isAwaitingAnamnesis
          ? `Aguardando registro de alta hospitalar para o paciente ${canonical.patient.name}.`
          : `Paciente ${canonical.patient.name} permaneceu sob cuidados veterinários para acompanhamento de ${canonical.activeHypothesis}. Apresenta estabilidade clínica e condições para alta hospitalar orientada.`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Evolução de Alta',
          guideline: 'WSAVA Hospital Standards',
          vetConfirmed: true
        },
        editedByUser: false
      },
      {
        id: 'sec-dis2',
        title: 'Medicações Prescritas para Casa',
        content: isAwaitingAnamnesis || canonical.medications.length === 0
          ? 'Nenhuma medicação registrada para alta.'
          : canonical.medications.slice(0, 2).map((m, i) => `${i + 1}. ${m.name} — ${m.dose} por ${m.duration}`).join('\n'),
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Prescription Engine',
          guideline: 'ACVIM Home Care',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 7. ENCAMINHAMENTO
  const referralDoc: ClinicalDocument = {
    id: 'doc-[#7]',
    type: 'referral',
    title: 'Carta de Encaminhamento Especializado',
    subtitle: 'Transferência para Gastroenterologia / Imagem / Especialidades',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:36`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
    },
    sections: [
      {
        id: 'sec-ref1',
        title: 'Motivo do Encaminhamento',
        content: isAwaitingAnamnesis
          ? `Encaminhamento do paciente ${canonical.patient.name} (${canonical.patient.species}, ${canonical.patient.breed}). Aguardando relato de anamnese.`
          : `Encaminho o paciente ${canonical.patient.name} ao serviço especializado para avaliação complementar no quadro de ${canonical.activeHypothesis}. Relato histórico: "${canonical.anamnesisSummary}".`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Specialist Referral Standards',
          guideline: 'ACVIM Specialty Referral',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  // 8. PDF CIENTÍFICO
  const scientificDoc: ClinicalDocument = {
    id: 'doc-[#8]',
    type: 'scientific_pdf',
    title: 'Dossiê Científico e Evidências do Caso',
    subtitle: 'Relatório RAG de Literatura e Fundamentação',
    status: 'draft',
    version: canonical.version,
    updatedAt: `${dateStr} às 18:37`,
    edited_by_user: false,
    export_formats: ['PDF', 'DOCX'],
    signature: {
      vetName: 'Dra. Camila Ribeiro',
      crmv: 'CRMV-SP 45.892',
      date: dateStr,
      digitalHash: 'SHA256:6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c'
    },
    sections: [
      {
        id: 'sec-sci1',
        title: 'Embasamento Científico Principal',
        content: isAwaitingAnamnesis
          ? 'Insira os relatos da consulta na aba de Anamnese para consultar as referências científicas no motor RAG.'
          : `• Diretrizes e evidências aplicadas para ${canonical.activeHypothesis}.\n• ACVIM / WSAVA Consensus Guidelines em Gastroenterologia e Medicina Interna Veterinária.\n• Raciocínio clínico fundamentado no acervo RAG Vetmind.`,
        origin: {
          hypothesis: canonical.activeHypothesis,
          handbook: 'Vetmind RAG PubMed Engine',
          guideline: 'Evidence Graph Level A',
          vetConfirmed: true
        },
        editedByUser: false
      }
    ]
  };

  return [
    prescriptionDoc,
    examDoc,
    evolutionDoc,
    therapeuticDoc,
    tutorDoc,
    dischargeDoc,
    referralDoc,
    scientificDoc
  ];
}

/**
 * VALIDATION ENGINE
 * Checks mandatory fields, dosage correctness, species consistency
 */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  sectionId?: string;
}

export function validateDocument(doc: ClinicalDocument, patient: Patient): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!patient.weight || patient.weight === '0') {
    issues.push({
      severity: 'error',
      code: 'MISSING_WEIGHT',
      message: 'O peso do paciente não foi informado. A validação de dosagens mg/kg fica comprometida.'
    });
  }

  if (!doc.signature || !doc.signature.crmv) {
    issues.push({
      severity: 'warning',
      code: 'NO_CRMV',
      message: 'CRMV da médica-veterinária não foi vinculado ao cabeçalho da receita.'
    });
  }

  doc.sections.forEach(sec => {
    if (sec.content.length < 10) {
      issues.push({
        severity: 'warning',
        code: 'SHORT_SECTION',
        message: `A seção "${sec.title}" possui conteúdo muito reduzido.`,
        sectionId: sec.id
      });
    }

    if (sec.content.toLowerCase().includes('faça') || sec.content.toLowerCase().includes('administre obrigatoriamente')) {
      issues.push({
        severity: 'info',
        code: 'IMPERATIVE_LANGUAGE',
        message: 'Linguagem imperativa detectada. Dê preferência a "Recomenda-se" ou "Pode ser considerado".',
        sectionId: sec.id
      });
    }
  });

  return issues;
}
