import { Patient, CarePlan, ClinicalGoal, RecommendedTestItem, RecommendedInterventionItem, MonitoringParamItem, ClinicalAlertItem } from '../types';

/**
 * CLINICAL DECISION ENGINE — MÓDULO 06 VETMIND
 * Pipeline:
 * Hipótese Selecionada -> Clinical Guidelines Engine -> Evidence Matcher -> Recommendation Engine -> Priority Engine -> Monitoring Engine -> Documentation Engine
 */

export interface ClinicalDecisionContext {
  hypothesisId: string;
  hypothesisName: string;
  probability: number;
  confidenceLevel: 'Alta' | 'Moderada' | 'Baixa';
  patient: Patient;
  anamnesisText?: string;
}

export function generateCarePlanForHypothesis(context: ClinicalDecisionContext): CarePlan {
  const anamnesisText = (context.anamnesisText || '').trim();
  if (!anamnesisText || anamnesisText.length < 5 || context.hypothesisId === 'empty') {
    return {
      goals: [],
      recommended_tests: [],
      recommended_interventions: [],
      monitoring: [],
      alerts: [],
      supporting_references: []
    };
  }

  const hypLower = context.hypothesisName.toLowerCase();
  const idLower = context.hypothesisId.toLowerCase();
  const anamnesisLower = anamnesisText.toLowerCase();
  const combined = `${hypLower} ${idLower} ${anamnesisLower}`;

  const isOtitis = combined.includes('otit') || combined.includes('auricular') || combined.includes('coceira') || combined.includes('prurid');
  const isHerniaProstate = combined.includes('hernia') || combined.includes('prostat') || combined.includes('tenesmo') || combined.includes('disquezia') || combined.includes('fezes em fita') || combined.includes('fitiform') || combined.includes('diverticul');
  const isOrtho = combined.includes('tplo') || combined.includes('joelho') || combined.includes('claudic') || combined.includes('mancand') || combined.includes('ligamento') || combined.includes('ortop') || combined.includes('fratur') || combined.includes('luxac') || combined.includes('trauma');
  const isRenal = combined.includes('cistit') || combined.includes('renal') || combined.includes('urin') || combined.includes('urolit') || combined.includes('dtuif') || combined.includes('azotem') || combined.includes('bexiga') || combined.includes('disuria');
  const isVector = combined.includes('erliqu') || combined.includes('babes') || combined.includes('carrap') || combined.includes('hemopar') || combined.includes('trombocit');
  const isRespiratory = combined.includes('toss') || combined.includes('traqu') || combined.includes('bronq') || combined.includes('pneumon') || combined.includes('respirat');
  const isPancreatitis = hypLower.includes('pancreat') || idLower.includes('pancreat');

  if (isOtitis) {
    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Cessação do Processo Inflamatório Otológico', priority: 'Alta', justification: 'Reduzir eritema, edema e exsudação do conduto auditivo para aliviar dor agudo.', status: 'Aceito' },
      { id: 'goal-2', title: 'Erradicação do Agente Infeccioso Secundário', priority: 'Alta', justification: 'Eliminar supercrescimento bacteriano ou fúngico direcionado por citologia prévia.', status: 'Aceito' },
      { id: 'goal-3', title: 'Identificação e Controle do Fator Primário', priority: 'Média', justification: 'Investigar dermatite atópica ou alergia alimentar para prevenir recidivas crônicas.', status: 'Pendente' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'Citologia Otológica com Coloração Fast-Read', motive: 'Diferenciar infecção bacteriana (cocos/bacilos), fúngica (Malassezia) ou inflamação estéril.', confirmationGoal: 'Confirma etiologia infecciosa secundária antes da prescrição de tópicos.', urgency: 'Alta', guidelineSource: 'WAVD Guidelines 2024', status: 'Aceito' },
      { id: 'test-2', name: 'Otoscopia Rígida / Vídeo-Otoscopia', motive: 'Avaliar integridade da membrana timpânica e presença de cerumenólitos ou estenose.', confirmationGoal: 'Excluir otite média concomitante e rupturas timpânicas.', urgency: 'Moderada', guidelineSource: 'ACVD Guidelines', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Lavagem e limpeza do conduto auditivo com solução ceruminolítica neutra antes da medicação.', justification: 'O excesso de cerúmen impede o contato direto dos fármacos tópicos com o epitélio atingido.', reference: 'Paterson S. et al. WAVD Consensus 2024', guidelineSource: 'WAVD 2024', status: 'Aceito' },
      { id: 'rx-2', description: 'Uso de otológico de associação (Antibiótico + Antifúngico + Corticoide tópico) por 7 a 14 dias.', justification: 'Combate a infecção mista enquanto reduz o prurido e estenose do conduto.', reference: 'DeBoer D.J. BMC Vet Res 2022', guidelineSource: 'ACVD Consensus', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Prurido e Abano de Cabeça', frequency: 'Diariamente', reason: 'Avaliar resposta sintomática imediata', status: 'Aceito' },
      { id: 'mon-2', parameter: 'Reavaliação Otoscópica e Citológica', frequency: 'A cada 7-10 dias', reason: 'Garantir cura microbiológica antes de suspender terapia', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Risco de Ototoxicidade', message: 'Evitar aminoglicosídeos tópicos se houver suspeita de perfuração de membrana timpânica.', severity: 'alerta' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['WAVD Guidelines 2024', 'ACVD Otology Consensus 2023'] };
  }

  if (isHerniaProstate) {
    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Reconstrução do Diafragma Pélvico e Redução do Tenesmo', priority: 'Alta', justification: 'Corrigir o defeito anatômico muscular para restaurar o diâmetro do canal retal e eliminar a dor evacuatória.', status: 'Aceito' },
      { id: 'goal-2', title: 'Prevenção de Encarceramento Visceral / Retroflexão de Bexiga', priority: 'Alta', justification: 'Evitar disúria, anúria e necrose de alça por encarceramento na herniação perineal.', status: 'Aceito' },
      { id: 'goal-3', title: 'Facilitação do Trânsito Fecal e Amolecimento do Bolo', priority: 'Alta', justification: 'Reduzir esforço de defecação enquanto aguarda a conduta cirúrgica definitiva.', status: 'Aceito' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'Ultrassonografia Pélvica e Abdominal Total', motive: 'Avaliar volume e ecogenicidade prostática, estenose do canal retal e posição vesicular.', confirmationGoal: 'Identifica hiperplasia prostática benigna ou cistos e confirma herniação perineal.', urgency: 'Alta', guidelineSource: 'Fossum - Cirurgia de Pequenos Animais, Cap. 19', status: 'Aceito' },
      { id: 'test-2', name: 'Toque Retal Digital e Exame Físico Específico', motive: 'Avaliar profundidade da musculatura do diafragma pélvico e saculação retal.', confirmationGoal: 'Confirma atenuação do músculo elevador do ânus e coccígeo.', urgency: 'Alta', guidelineSource: 'Manual de Cirurgia de Pequenos Animais', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Rafia Cirúrgica de Diafragma Pélvico (Transposição de Músculo Obturador Interno) + Orquiectomia.', justification: 'A restauração cirúrgica muscular resolve a hérnia e a castração induz atrofia prostática preventiva.', reference: 'Fossum T.W. Small Animal Surgery 5th Ed', guidelineSource: 'Fossum Cap. 19, p. 480-492', status: 'Aceito' },
      { id: 'rx-2', description: 'Uso de Lactulose (0.5 mL/kg VO a cada 12h) e Dieta Úmida Rica em Fibras Solúveis.', justification: 'Umidifica as fezes prevenindo a formação de fecaloma em saculações do reto.', reference: 'Nelson & Couto - Medicina Interna', guidelineSource: 'Nelson & Couto Cap. 38', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Frequência Evacuatória e Formato das Fezes', frequency: 'A cada 12 horas', reason: 'Acompanhar alívio da tenesmo e eliminação sem dor', status: 'Aceito' },
      { id: 'mon-2', parameter: 'Débito Urinário e Palpação de Bexiga', frequency: 'A cada 6 horas', reason: 'Detectar precocemente retenção urinária ou encarceramento vesical', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Alerta de Emergência Urinária', message: 'Se o paciente apresentar anúria ou dor aguda no volume perineal, realizar sondagem vesical imediata devido à retroflexão de bexiga.', severity: 'alerta' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['Fossum - Cirurgia de Pequenos Animais, Capítulo 19 (Hérnia Perineal)', 'Nelson & Couto - Medicina Interna de Pequenos Animais'] };
  }

  if (isOrtho) {
    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Restabelecimento da Estabilidade Articular e Biomecânica', priority: 'Alta', justification: 'Eliminar a gaveta/instabilidade focal e conter o avanço de osteoartrose secundária.', status: 'Aceito' },
      { id: 'goal-2', title: 'Controle Efetivo da Dor Ortopédica Aguda e Inflamação', priority: 'Alta', justification: 'Garantir conforto para apoio precoce do membro sem sobrecarga contralateral.', status: 'Aceito' },
      { id: 'goal-3', title: 'Reabilitação Funcional e Preservação da Massa Muscular', priority: 'Média', justification: 'Prevenir atrofia por desuso no quadríceps e musculatura pélvica/torácica.', status: 'Pendente' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'Radiografia Digital Ortogonal (Projeções AP e Lateral com Estresse)', motive: 'Mensurar o ângulo do platô tibial (TPA) e pesquisar osteófitos, efusão e subluxação.', confirmationGoal: 'Planejamento cirúrgico para TPLO / estabilização ortopédica.', urgency: 'Alta', guidelineSource: 'Veterinary Orthopedic Society Guidelines 2024', status: 'Aceito' },
      { id: 'test-2', name: 'Exame Ortopédico Específico (Teste de Gaveta e Compressão Tibial)', motive: 'Diferenciar ruptura de ligamento cruzado cranial de luxação patelar ou osteoartrite.', confirmationGoal: 'Confirmação clínica de frouxidão ligamentar.', urgency: 'Alta', guidelineSource: 'VOS Clinical Consensus', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Tratamento Cirúrgico Corretivo (Ex: TPLO - Osteotomia de Nivelamento do Platô Tibial).', justification: 'Promove a estabilização mecânica ativa da articulação do joelho eliminando o empuxo tibial cranial.', reference: 'Cook J.L. et al. Vet Comp Orthop Traumatol 2024', guidelineSource: 'VOS 2024 Guidelines', status: 'Aceito' },
      { id: 'rx-2', description: 'Analgesia Multimodal: Dipirona (25 mg/kg) + Anti-inflamatório COX-2 Seletivo (Meloxicam 0,1 mg/kg) + Condroprotetor.', justification: 'Combate o componente inflamatório e dor articular sem comprometer a mucosa digestiva.', reference: 'AAHA Pain Management Protocols', guidelineSource: 'AAHA 2023', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Grau de Claudicação e Apoio do Membro', frequency: 'Diariamente', reason: 'Acompanhar ganho de carga e evolução do apoio', status: 'Aceito' },
      { id: 'mon-2', parameter: 'Avaliação de Edema e Ferida Cirúrgica/Implantar', frequency: 'A cada 12 horas', reason: 'Detectar seroma ou deiscência precocemente', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Restrição Estrita de Movimentação', message: 'Manter o paciente em repouso absoluto em piso antiderrapante sem saltos por 6 a 8 semanas pós-operatórias.', severity: 'alerta' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['Veterinary Orthopedic Society (VOS) TPLO Guidelines 2024', 'AAHA Pain Management Guidelines'] };
  }

  if (isRenal) {
    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Alívio do Espasmo Vesical e Eliminação do Agente Infectante', priority: 'Alta', justification: 'Reduzir disúria e hematúria promovendo conforto e micção desobstruída.', status: 'Aceito' },
      { id: 'goal-2', title: 'Preservação da Taxa de Filtração Glomerular e Perfusão Renal', priority: 'Alta', justification: 'Prevenir azotemia pós-renal ou ascensão do processo bacteriano aos rins (Pielonefrite).', status: 'Aceito' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'Urinálise Completa (EAS com Foco em Sedimento) + Urocultura com Antibiograma', motive: 'Identificar bacteriúria, piúria, cristalúria e sensibilidade antimicrobiana exata.', confirmationGoal: 'Confirma cistite bacteriana e guia a escolha do antibiótico.', urgency: 'Alta', guidelineSource: 'ISCAID Guidelines 2024', status: 'Aceito' },
      { id: 'test-2', name: 'Ultrassonografia Abdominal Focada em Bexiga e Rins', motive: 'Avaliar espessamento de parede vesical, urólitos, uraco persistente ou nefrite.', confirmationGoal: 'Descartar urolitíase vesical/uretral.', urgency: 'Alta', guidelineSource: 'ACVIM Consensus Urinary', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Antimicrobiano Guiado ou Empírico Inicial de Primeira Escolha (Ex: Amoxicilina com Clavulanato 12.5-25 mg/kg VO a cada 12h).', justification: 'Combate uropatógenos comuns (E. coli, Proteus spp.) nas vias urinárias inferiores.', reference: 'ISCAID Urinary Tract Guidelines 2024', guidelineSource: 'ISCAID 2024', status: 'Aceito' },
      { id: 'rx-2', description: 'Analgésico e Espasmolítico Vesical (Dipirona 25 mg/kg + Estimulação de Ingestão Hídrica).', justification: 'Reduz o espasmo do músculo detrusor e promove o diurese de lavagem.', reference: 'Plumb Veterinary Drug Handbook 9th Ed', guidelineSource: 'Plumb 2023', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Volume Urinário e Presença de Hematúria', frequency: 'A cada 6 horas', reason: 'Assegurar diurese mantida sem obstrução', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Atenção para Estrangúria / Anúria', message: 'Caso o paciente não consiga urinar por mais de 12h, passar sonda vesical de alívio imediatamente para afastar obstrução.', severity: 'alerta' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['ISCAID Consensus Guidelines for Urinary Tract Infections', 'Nelson & Couto - Medicina Interna, Cap. 38'] };
  }

  if (isVector) {
    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Eliminação da Riquetsiose / Erliquia e Controle da Trombocitopenia', priority: 'Alta', justification: 'Neutralizar a replicação bacteriana intracelular e estancar o consumo de plaquetas.', status: 'Aceito' },
      { id: 'goal-2', title: 'Prevenção de Sangramentos Espontâneos e Suporte Hematológico', priority: 'Alta', justification: 'Manter a integridade vascular e estancar petéquias ou epistaxe.', status: 'Aceito' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'PCR em Tempo Real para Ehrlichia canis e Anaplasma spp.', motive: 'Sensibilidade superior a 95% para detecção de DNA parasitário em fase aguda/subcrônica.', confirmationGoal: 'Confirmação etiológica definitiva da hemoparasitose.', urgency: 'Alta', guidelineSource: 'ACVIM Vector-Borne Consensus 2024', status: 'Aceito' },
      { id: 'test-2', name: 'Hemograma Completo com Contagem Manual de Plaquetas e Esfregaço Sangrento', motive: 'Quantificar o grau de trombocitopenia e verificar presença de mórulas em monócitos.', confirmationGoal: 'Guia necessidade de suporte e monitora recuperação.', urgency: 'Alta', guidelineSource: 'ACVIM Guidelines', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Tratamento com Doxiciclina (10 mg/kg VO a cada 24 horas durante 28 dias consecutivos).', justification: 'Fármaco de escolha para erradicação de Ehrlichia canis segundo diretrizes mundiais.', reference: 'Sainz A. et al. JVIM 2024', guidelineSource: 'ACVIM 2024', status: 'Aceito' },
      { id: 'rx-2', description: 'Suporte Hepático (Silimarina / S-Adenosilmetionina) + Ectoparasiticida de Ação Rápida.', justification: 'Protege a função hepática durante a terapia longa e impede reinfestações por carrapatos.', reference: 'Nelson & Couto Medicina Interna', guidelineSource: 'Nelson Cap. 45', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Contagem de Plaquetas e Hematócrito', frequency: 'A cada 7 dias', reason: 'Acompanhar a curva de recuperação plaquetária', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Cuidado com Adm. de Doxiciclina', message: 'Oferecer água ou alimento junto com o comprimido para evitar esofagite medicamentosa.', severity: 'info' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['ACVIM Consensus Statement on Canine Vector-Borne Infectious Diseases (2024)'] };
  }

  if (isRespiratory) {
    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Alívio da Tosse e Desobstrução das Vias Aéreas', priority: 'Alta', justification: 'Reduzir a inflamação traqueobronquial para prevenir exaustão física e síncope.', status: 'Aceito' },
      { id: 'goal-2', title: 'Prevenção de Broncopneumonia Secundária', priority: 'Alta', justification: 'Evitar a contaminação bacteriana descendente no parênquima pulmonar.', status: 'Aceito' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'Radiografia Torácica (Projeções VD, LL Esquerda e LL Direita)', motive: 'Avaliar padrão bronquial, intersticial, traquéia e silhueta cardíaca.', confirmationGoal: 'Exclui pneumonia bacteriana, colapso de traquéia e edema cardiogênico.', urgency: 'Alta', guidelineSource: 'ACVIM Respiratory Consensus 2024', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Nebulização com Solução Fisiológica 0,9% (15 minutos a cada 8 horas).', justification: 'Umidifica as vias aéreas facilitando a depuração mucociliar.', reference: 'Lappin M.R. JVIM 2024', guidelineSource: 'ACVIM Respiratory 2024', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Frequência e Padrão Respiratório', frequency: 'A cada 4 horas', reason: 'Detectar fadiga ou esforço respiratório abdominal', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Substituição da Coleira', message: 'Substituir coleiras de pescoço por peitorais para eliminar pressão mecânica na traquéia.', severity: 'info' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['ACVIM Consensus Statement on Respiratory Diseases in Dogs and Cats'] };
  }

  if (isPancreatitis) {
    const isFeline = context.patient?.species?.toLowerCase().includes('gato') || context.patient?.species?.toLowerCase().includes('felin') || context.patient?.species?.toLowerCase().includes('cat') || combined.includes('gato') || combined.includes('felin');

    if (isFeline) {
      const goals: ClinicalGoal[] = [
        { id: 'goal-1', title: 'Controlar Êmese e Prevenir Lipidose Hepática Felina', priority: 'Alta', justification: 'Gatos anoréxicos por mais de 24-48h desenvolvem rápida mobilização de gordura e lipidose hepática.', status: 'Aceito' },
        { id: 'goal-2', title: 'Restabelecer Volemia e Perfusão Pancreática / Ducto Biliar', priority: 'Alta', justification: 'A hipovolemia agrava a lesão parenquimatosa e diminui a circulação na Tríade Felina.', status: 'Aceito' },
        { id: 'goal-3', title: 'Analgesia Efetiva Multimodal (Buprenorfina)', priority: 'Alta', justification: 'Felinos mascaram a dor visceral, exigindo analgesia contínua para prevenir íleo paralítico.', status: 'Aceito' }
      ];

      const recommended_tests: RecommendedTestItem[] = [
        { id: 'test-1', name: 'Dosagem de Lipase Pancreática Específica Felina (Spec fPL / v-fPL)', motive: 'Padrão-ouro com alta sensibilidade e especificidade para inflamação pancreática em felinos.', confirmationGoal: 'Confirma pancreatite felina e diferencia de gastroenterite simples.', urgency: 'Alta', guidelineSource: 'ISFM Consensus Guidelines 2024', status: 'Aceito' },
        { id: 'test-2', name: 'Ultrassonografia Abdominal Focada (Pâncreas, Ducto Biliar e Duodeno)', motive: 'Identificar hipoecogenocidade pancreática e espessamento duodenal (Tríade Felina).', confirmationGoal: 'Avalia pâncreas e afasta corpo estranho linear.', urgency: 'Alta', guidelineSource: 'ISFM / AAFP Guidelines', status: 'Aceito' },
        { id: 'test-3', name: 'Perfil Bioquímico Hepático (ALT, FA, GGT e Bilirrubinas)', motive: 'Avaliar estase biliar ou colangiohepatite concomitante.', confirmationGoal: 'Mapeia a extensão da Tríade Felina.', urgency: 'Alta', guidelineSource: 'AAFP Guidelines', status: 'Aceito' }
      ];

      const recommended_interventions: RecommendedInterventionItem[] = [
        { id: 'rx-1', description: 'Analgesia com Buprenorfina (0.01-0.02 mg/kg sublingual/SC a cada 8h).', justification: 'Opioide de eleição para dor visceral em felinos com excelente tolerabilidade.', reference: 'ISFM Feline Pain Management Guidelines 2024', guidelineSource: 'ISFM 2024', status: 'Aceito' },
        { id: 'rx-2', description: 'Antiemético Citrato de Maropitant (1 mg/kg SC a cada 24h) + Fluidoterapia com Ringer Lactato.', justification: 'Cessa episódios de emese, combate a náusea e restaura o fluxo microvascular.', reference: 'Steiner J.M. et al. JFMS 2024', guidelineSource: 'ISFM Guidelines', status: 'Aceito' },
        { id: 'rx-3', description: 'Suporte Nutricional Enteral Precoce (Sonda Nasoesofágica em anorexia >24h).', justification: 'Interrompe a lipólise periférica prevenindo a lipidose hepática secundária.', reference: 'Center S.A. JFMS 2023', guidelineSource: 'AAFP Nutritional Guidelines', status: 'Aceito' }
      ];

      const monitoring: MonitoringParamItem[] = [
        { id: 'mon-1', parameter: 'Ingestão Calórica e Escore de Dor (Feline Grimace Scale)', frequency: 'A cada 4 horas', reason: 'Avaliar alívio da dor e aceitação alimentar espontânea', status: 'Aceito' }
      ];

      const alerts: ClinicalAlertItem[] = [
        { id: 'alert-1', title: 'Alerta de Anorexia Felina', message: 'Se o felino permanecer em anorexia por > 24 horas, passar sonda nasoesofágica para iniciar suporte enteral.', severity: 'alerta' }
      ];

      return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['ISFM Consensus Guidelines on Feline Pancreatitis and Triaditis (2024)', 'AAFP Guidelines on Feline Anorexia and Lipidosis'] };
    }

    const goals: ClinicalGoal[] = [
      { id: 'goal-1', title: 'Controlar Êmese e Prevenir Aspirativo', priority: 'Alta', justification: 'O vômito agrava desidratação e risco de pneumonia aspirativa.', status: 'Aceito' },
      { id: 'goal-2', title: 'Restabelecer Volemia e Perfusão Pancreática', priority: 'Alta', justification: 'A hipovolemia reduz a microcirculação pancreática acelerando necrose.', status: 'Aceito' },
      { id: 'goal-3', title: 'Alívio Efetivo da Dor Abdominal Cranial', priority: 'Alta', justification: 'A dor intensa induz resposta ao estresse simpático e íleo paralítico.', status: 'Aceito' }
    ];

    const recommended_tests: RecommendedTestItem[] = [
      { id: 'test-1', name: 'Dosagem de Lipase Pancreática Específica Canina (Spec cPL / v-cPL)', motive: 'Sensibilidade de 88% e especificidade de 92% para inflamação pancreática em cães.', confirmationGoal: 'Confirma pancreatite e diferencia de gastroenterite simples.', urgency: 'Alta', guidelineSource: 'ACVIM Consensus Statement 2024', status: 'Aceito' },
      { id: 'test-2', name: 'Ultrassonografia Abdominal Focada (Pâncreas e Duodeno)', motive: 'Identificar edema pancreático e afastar corpo estranho obstrutivo.', confirmationGoal: 'Avalia alteração pancreática e área adjacente.', urgency: 'Alta', guidelineSource: 'ACVIM / EVECC Guidelines', status: 'Aceito' }
    ];

    const recommended_interventions: RecommendedInterventionItem[] = [
      { id: 'rx-1', description: 'Fluidoterapia venosa de ressuscitação com Ringer Lactato (10-20 mL/kg/h).', justification: 'Ressuscita volemia e restaura fluxo microvascular pancreático.', reference: 'Steiner J.M. et al. JVIM 2024', guidelineSource: 'ACVIM 2024', status: 'Aceito' },
      { id: 'rx-2', description: 'Antiemético antagonista de receptores NK-1 (Maropitant 1 mg/kg IV/SC a cada 24h).', justification: 'Bloqueia centro do vômito e reduz dor visceral.', reference: 'Unterer S. et al. Vet Clin 2021', guidelineSource: 'WSAVA GI Guidelines', status: 'Aceito' }
    ];

    const monitoring: MonitoringParamItem[] = [
      { id: 'mon-1', parameter: 'Frequência de Vômitos e Escore de Dor Abdominal', frequency: 'A cada 4 horas', reason: 'Ajustar analgésicos e terapia antiemética', status: 'Aceito' }
    ];

    const alerts: ClinicalAlertItem[] = [
      { id: 'alert-1', title: 'Atenção para Resposta em 24 Horas', message: 'Reavaliar se persistirem vômitos ou dor acentuada após 24h de manejo intensivo.', severity: 'alerta' }
    ];

    return { goals, recommended_tests, recommended_interventions, monitoring, alerts, supporting_references: ['ACVIM Consensus Statement on Canine Pancreatitis (2024)'] };
  }

  // DEFAULT / GASTROENTERITE / GENERIC CASE SPECIFIC TO THE HYPOTHESIS
  const hypTitle = context.hypothesisName || 'Gastroenterite e Enteropatia Aguda';
  const goals: ClinicalGoal[] = [
    { id: 'goal-1', title: `Estabilização Sintomática e Controle de Vômitos/Diarréia`, priority: 'Alta', justification: `Reduzir perda de fluidos e restaurar o conforto digestivo do paciente.`, status: 'Aceito' },
    { id: 'goal-2', title: 'Reidratação e Manutenção de Volemia', priority: 'Alta', justification: 'Corrigir o déficit hídrico calculado para a condição clínica.', status: 'Aceito' },
    { id: 'goal-3', title: 'Restauração da Barreira Intestinal e Dieta Adequada', priority: 'Média', justification: 'Fornecer substrato para enterócitos e flora comutativa.', status: 'Aceito' }
  ];

  const recommended_tests: RecommendedTestItem[] = [
    { id: 'test-1', name: 'Ultrassonografia Abdominal Total', motive: 'Avaliar motilidade, espessamento de mucosa e descartar corpo estranho ou intussuscepção.', confirmationGoal: `Confirmar achados e afastar abdome agudo cirúrgico para ${hypTitle}.`, urgency: 'Alta', guidelineSource: 'Consenso de Gastroenterologia Veterinária', status: 'Aceito' },
    { id: 'test-2', name: 'Hemograma Completo + Painel Renal e Hepático (Uréia/Creatinina/ALT/FA)', motive: 'Avaliar grau de hemoconcentração e lesão orgânica secundária.', confirmationGoal: 'Guia reidratação e descarta complicações sistêmicas.', urgency: 'Alta', guidelineSource: 'Nelson & Couto - Medicina Interna', status: 'Aceito' }
  ];

  const recommended_interventions: RecommendedInterventionItem[] = [
    { id: 'rx-1', description: 'Fluidoterapia com Ringer com Lactato ajustada pelo déficit de desidratação.', justification: 'Restaura o equilíbrio hidroeletrolítico e volemia efetiva.', reference: 'AAHA Fluid Therapy Guidelines', guidelineSource: 'AAHA Guidelines', status: 'Aceito' },
    { id: 'rx-2', description: 'Citrato de Maropitant (1 mg/kg SC/VO a cada 24h) + Protetor Gástrico se indicado.', justification: 'Cessa episódios de êmese e reduz desconforto visceral.', reference: 'Plumb Veterinary Drug Handbook 9th Ed', guidelineSource: 'Plumb 2023', status: 'Aceito' }
  ];

  const monitoring: MonitoringParamItem[] = [
    { id: 'mon-1', parameter: 'Frequência de Vômitos e Fezes', frequency: 'A cada 4 horas', reason: 'Avaliar eficácia da resposta do tratamento', status: 'Aceito' },
    { id: 'mon-2', parameter: 'Parâmetros Fisiológicos (FC, FR, TPC e Turgor)', frequency: 'A cada 6 horas', reason: 'Monitorar estado hemodinâmico', status: 'Aceito' }
  ];

  const alerts: ClinicalAlertItem[] = [
    { id: 'alert-1', title: 'Acompanhamento do Caso', message: 'Acompanhar a ingestão hídrica e alimentar nas primeiras 24 horas.', severity: 'info' }
  ];

  return {
    goals,
    recommended_tests,
    recommended_interventions,
    monitoring,
    alerts,
    supporting_references: ['Nelson & Couto - Medicina Interna de Pequenos Animais', 'Guidelines de Gastroenterologia Veterinária (WSAVA 2023)']
  };
}

/**
 * SIMULADOR DE CENÁRIOS CLÍNICOS
 * Permite simular hipóteses alternativas sem alterar o caso original.
 */
export interface ScenarioSimulationResult {
  scenarioTitle: string;
  modifiedHypothesis: string;
  recalculatedProbability: number;
  recalculatedPlan: CarePlan;
  keyChangesDescription: string;
}

export function simulateClinicalScenario(scenarioType: 'lipase_normal' | 'foreign_body' | 'no_response_24h'): ScenarioSimulationResult {
  switch (scenarioType) {
    case 'lipase_normal':
      return {
        scenarioTitle: 'Resultado da Lipase Pancreática (Spec cPL) dentro da Normalidade',
        modifiedHypothesis: 'Gastroenterite Aguda Primária / Indiscreção Alimentar',
        recalculatedProbability: 76,
        keyChangesDescription: 'A normalidade da Lipase Específica reduz acentuadamente a suspeita de pancreatite ativa. O foco migra para protetores de mucosa, reidratação oral/enteral e dieta de fácil digestibilidade.',
        recalculatedPlan: {
          goals: [
            { id: 'sim-g1', title: 'Manejo Sintomático e Recomposição de Mucosa', priority: 'Alta', justification: 'Ausência de pancreatite indica gastroenterite por irritação direta.', status: 'Aceito' },
            { id: 'sim-g2', title: 'Suporte de Hidratação Oral e Dieta Branda', priority: 'Alta', justification: 'Perdas digestivas puras sem envolvimento pancreático.', status: 'Aceito' }
          ],
          recommended_tests: [
            { id: 'sim-t1', name: 'Exame Parasitológico de Fezes / Coprotest', motive: 'Descartar Giardíase ou Coccidiose aguda.', confirmationGoal: 'Identifica causas infecciosas primárias.', urgency: 'Moderada', guidelineSource: 'CAPC Guidelines', status: 'Aceito' }
          ],
          recommended_interventions: [
            { id: 'sim-rx1', description: 'Pode ser considerado o uso de probióticos concentrados e protetores de mucosa (Sufalcato/Montmorilonita).', justification: 'Auxilia na restauração do microbiota e revestimento luminal.', reference: 'Unterer S. et al. 2021', guidelineSource: 'WSAVA 2023', status: 'Aceito' }
          ],
          monitoring: [
            { id: 'sim-m1', parameter: 'Consistência de Fezes e Apetite', frequency: 'A cada 12 horas', reason: 'Avaliar resolução espontânea em 48h', status: 'Aceito' }
          ],
          alerts: [
            { id: 'sim-a1', title: 'Cenário Simulado: Reavaliação', message: 'Se o vômito reaparecer após introdução de alimentos, repetir ultrassom abdominal.', severity: 'atencao' }
          ],
          supporting_references: ['WSAVA Gastrointestinal Panel (2023)', 'CAPC Parasitology Recommendations']
        }
      };

    case 'foreign_body':
      return {
        scenarioTitle: 'Ultrassonografia com Imagem Compatível com Obstrução por Corpo Estranho',
        modifiedHypothesis: 'Obstrução Gastrointestinal Mecânica Completa',
        recalculatedProbability: 92,
        keyChangesDescription: 'Padrão obstrutivo altera prioridade de clínica médica para avaliação de cirurgia de emergência (Enterotomia / Gastrotomia).',
        recalculatedPlan: {
          goals: [
            { id: 'sim-fb-g1', title: 'Estabilização Hemodinâmica Pré-Operatória', priority: 'Alta', justification: 'Corrigir hipotensão e perdas antes da indução anestésica.', status: 'Aceito' },
            { id: 'sim-fb-g2', title: 'Descompressão e Intervenção Cirúrgica', priority: 'Alta', justification: 'Obstrução mecânica completa exige desobstrução rápida para prevenir isquemia de alça.', status: 'Aceito' }
          ],
          recommended_tests: [
            { id: 'sim-fb-t1', name: 'Perfil Anestésico Completo & Coagulograma', motive: 'Risco de procedimentos cirúrgicos de urgência.', confirmationGoal: 'Assegura segurança anestésica pré-operatória.', urgency: 'Alta', guidelineSource: 'AAHA Anesthesia Guidelines', status: 'Aceito' }
          ],
          recommended_interventions: [
            { id: 'sim-fb-rx1', description: 'Recomenda-se a avaliação cirúrgica emergencial para Gastrotomia/Enterotomia desobstrutiva.', justification: 'Remoção do artefato antes de necrose de alça.', reference: 'Griffin S. et al. Vet Radiol 2020', guidelineSource: 'ACVS Surgical Standards', status: 'Aceito' }
          ],
          monitoring: [
            { id: 'sim-fb-m1', parameter: 'Pressão Arterial Sistêmica e Lactato', frequency: 'Contínua no pré/pós-op', reason: 'Monitorar perfusão e perfuração intestinal', status: 'Aceito' }
          ],
          alerts: [
            { id: 'sim-fb-a1', title: 'Risco Elevado de Isquemia e Peritonite', message: 'Atrasos na remoção do corpo estranho aumentam o risco de enterectomia com anastomose.', severity: 'alerta' }
          ],
          supporting_references: ['ACVS Surgical Guidelines for GI Obstruction', 'AAHA Anesthesia and Monitoring Protocols']
        }
      };

    default: // no_response_24h
      return {
        scenarioTitle: 'Ausência de Resposta Clínica após 24 Horas de Suporte Sintomático',
        modifiedHypothesis: 'Pancreatite Necrotizante Complicada ou Sepse Secundária',
        recalculatedProbability: 88,
        keyChangesDescription: 'A refratariedade exige intensificação da analgesia, reinvestigação de fuso necrosante por tomografia/USG e avaliação de lavado peritoneal.',
        recalculatedPlan: {
          goals: [
            { id: 'sim-nr-g1', title: 'Reavaliação Intensiva e Suporte Hemodinâmico', priority: 'Alta', justification: 'Falta de resposta sugere complicação necrotizante ou volvo/SIRS.', status: 'Aceito' }
          ],
          recommended_tests: [
            { id: 'sim-nr-t1', name: 'Repetição de USG Abdominal + Centese Peritoneal se houver Efusão', motive: 'Investigar peritonite séptica ou abscesso pancreático.', confirmationGoal: 'Identifica exsudato exógeno ou contaminação.', urgency: 'Alta', guidelineSource: 'EVECC Critical Care Panel', status: 'Aceito' }
          ],
          recommended_interventions: [
            { id: 'sim-nr-rx1', description: 'Pode ser considerada a associação de analgesia contínua por infusão taxa fixa (MLK - Metadona/Lidocaína/Ketamina).', justification: 'A dor refratária necessita de infusão contínua em ambiente de UTI.', reference: 'AAHA Pain Standards 2022', guidelineSource: 'AAHA Pain', status: 'Aceito' }
          ],
          monitoring: [
            { id: 'sim-nr-m1', parameter: 'Pressão Arterial Média (PAM) e Débito Urinário', frequency: 'A cada 1 hora', reason: 'Monitorar choque refratário', status: 'Aceito' }
          ],
          alerts: [
            { id: 'sim-nr-a1', title: 'Alerta Crítico: Considerar Transferência para UTI', message: 'Pacientes refratários em 24h demandam monitoramento contínuo 24/7.', severity: 'alerta' }
          ],
          supporting_references: ['VECCS Critical Care Guidelines', 'EVECC Sepsis Consensus']
        }
      };
  }
}
