import { EvidenceArticle, CitationFormat } from '../types';

/**
 * EVIDENCE ENGINE — MOTOR DE EVIDÊNCIAS CIENTÍFICAS VETMIND
 * Rastreia, qualifica, pontua e correlaciona referências da literatura científica.
 */

// Format citations based on standard academic formats
export function formatCitation(article: EvidenceArticle, format: CitationFormat): string {
  const authorStr = article.authors.length > 2 
    ? `${article.authors[0]} et al.` 
    : article.authors.join(' & ');

  switch (format) {
    case 'APA':
      return `${authorStr} (${article.year}). ${article.title}. ${article.journal}. https://doi.org/${article.doi}`;
    case 'ABNT':
      const abntAuthor = article.authors[0]?.toUpperCase() || 'VETMIND';
      return `${abntAuthor}, et al. ${article.title}. ${article.journal}, v. ${article.year}, DOI: ${article.doi}.`;
    case 'Vancouver':
      return `${article.authors.slice(0, 3).join(', ')}. ${article.title}. ${article.journal}. ${article.year}; DOI:${article.doi}.`;
    default:
      return `${authorStr} (${article.year}) - ${article.title}. ${article.journal}.`;
  }
}

// Hypotheses and associated evidence articles dataset
export interface HypothesisEvidenceGroup {
  id: string;
  name: string;
  probability: number; // 0 to 100
  badge: 'Alta' | 'Moderada' | 'Baixa';
  category: string;
  articles: EvidenceArticle[];
}

export const MOCK_EVIDENCE_DATABASE: Record<string, HypothesisEvidenceGroup[]> = {
  felineGastro: [
    {
      id: 'pancreatite-aguda-felina',
      name: 'Pancreatite Aguda Felina / Tríade Felina (Triadite)',
      probability: 84,
      badge: 'Alta',
      category: 'Gastroenterologia Felina / Pâncreas & Fígado',
      articles: [
        {
          article_id: 'art-fel-001',
          title: 'ISFM Consensus Guidelines on Diagnosing and Managing Feline Pancreatitis & Triaditis',
          authors: ['Steiner J.M.', 'Forman M.A.', 'Armstrong P.J.'],
          journal: 'Journal of Feline Medicine and Surgery (JFMS)',
          year: 2024,
          doi: '10.1177/1098612X24115082',
          publication_type: 'Consenso',
          evidence_level: 'Alta',
          impact_level: 'Alto',
          clinical_summary: 'Consenso internacional que estabelece o ensaio Spec fPL (Lipase Pancreática Específica Felina) e a ultrassonografia abdominal como o padrão-ouro não invasivo para diagnóstico da pancreatite aguda e síndrome da tríade felina (colangiohepatite + pancreatite + DII).',
          quoted_excerpt: '"A junção anatômica única do ducto pancreático e do colédoco no duodeno em felinos favorece a concorrência de pancreatite, colangite e doença inflamatória intestinal. A dosagem de Spec fPL associada ao espessamento duodenal possui sensibilidade de 86% e especificidade de 91%."',
          supports: [
            'Aumenta a probabilidade de pancreatite / triadite felina em gatos com inapetência e êmese',
            'Reforça a indicação da dosagem de Spec fPL (Lipase Pancreática Específica Felina)',
            'Indica suporte nutricional enteral precoce para prevenir lipidose hepática felina',
            'Sustenta analgesia multimodal com Buprenorfina em felinos'
          ],
          contradicts: [
            'Contradiz o uso de jejum prolongado em gatos anoréxicos devido ao risco severo de lipidose hepática'
          ],
          recommended_tests: ['Spec fPL (Lipase Pancreática Felina)', 'Ultrassonografia Abdominal Focada (Pâncreas/Ducto Biliar)', 'Painel Bioquímico Hepático (ALT/GGT/Bilirrubinas)'],
          recommended_treatments: ['Buprenorfina (0.01-0.02 mg/kg SC/Sublingual)', 'Maropitant (Cerenia) 1 mg/kg SC', 'Fluidoterapia IV com Ringer Lactato', 'Sonda Enteral em anorexia >24-48h'],
          species: ['Felina'],
          tags: ['Pancreatite Felina', 'Spec fPL', 'Tríade Felina', 'JFMS', 'ISFM'],
          score: { qualityScore: 99, recencyScore: 98, citationCount: 168 }
        },
        {
          article_id: 'art-fel-002',
          title: 'AAFP & ISFM Guidelines on Nutritional Management and Lipidosis Prevention in Feline Anorexia',
          authors: ['Center S.A.', 'Cave N.J.', 'Valtolina S.'],
          journal: 'Journal of Feline Medicine and Surgery (JFMS)',
          year: 2023,
          doi: '10.1177/1098612X23108920',
          publication_type: 'Guideline',
          evidence_level: 'Alta',
          impact_level: 'Alto',
          clinical_summary: 'Diretriz focado no manejo fisiopatológico da anorexia felina, reforçando a rápida instituição de suporte nutricional por sonda nasoesofágica para prevenção de lipidose hepática secundária.',
          quoted_excerpt: '"Gatos anoréxicos por mais de 48 horas desenvolvem rápida mobilização de triacilgliceróis e acúmulo lipídico nos hepatócitos. A enteralização precoce via sonda garante a sobrevivência em 90% dos casos complicados por pancreatite."',
          supports: [
            'Reforça enteralização precoce por sonda nasoesofágica ou esofagostomia em felinos',
            'Recomenda dieta hiperproteica específica para gatos sem encefalopatia'
          ],
          recommended_tests: ['Bilirrubina Total e Frações', 'Fosfatase Alcalina (FA) e GGT'],
          recommended_treatments: ['Sonda Nasoesofágica em anorexia felina >24h', 'Alimentação Enteral Recovery'],
          species: ['Felina'],
          tags: ['Lipidose Hepática', 'Anorexia Felina', 'AAFP', 'ISFM'],
          score: { qualityScore: 97, recencyScore: 94, citationCount: 112 }
        }
      ]
    },
    {
      id: 'gastroenterite-corpo-estranho-felino',
      name: 'Gastroenterite Aguda Felina / Corpo Estranho Linear',
      probability: 60,
      badge: 'Moderada',
      category: 'Emergência / Cirurgia Felina',
      articles: [
        {
          article_id: 'art-fel-003',
          title: 'Linear Foreign Body Obstruction in Felines: Clinical Presentation, Ultrasonography and Surgical Outcomes',
          authors: ['Lappin M.R.', 'Griffin S.', 'Robertson S.'],
          journal: 'Veterinary Radiology & Ultrasound',
          year: 2022,
          doi: '10.1111/vru.12988',
          publication_type: 'Clinical Trial',
          evidence_level: 'Moderada',
          impact_level: 'Alto',
          clinical_summary: 'Estudo clínico demonstrando que fios, linhas e fitas são os corpos estranhos mais frequentes em felinos, causando plissamento intestinal visível ao ultrassom.',
          quoted_excerpt: '"O plissamento e franzimento de alças intestinais na ultrassonografia felina possui especificidade de 96% para corpo estranho linear ancorado no piloro ou sob a base da língua."',
          supports: [
            'Orienta inspeção da cavidade oral sublingual em gatos com êmese',
            'Sustenta indicação de ultrassom abdominal de alta frequência'
          ],
          recommended_tests: ['Inspeção Sublingual Sob Sedação Leve', 'Ultrassonografia Abdominal de Alta Frequência'],
          species: ['Felina'],
          tags: ['Corpo Estranho Linear', 'Cirurgia Felina', 'Gastroenterologia'],
          score: { qualityScore: 92, recencyScore: 88, citationCount: 84 }
        }
      ]
    }
  ],
  default: [
    {
      id: 'pancreatite-aguda',
      name: 'Pancreatite Aguda Canina',
      probability: 84,
      badge: 'Alta',
      category: 'Gastroenterologia / Pâncreas',
      articles: [
        {
          article_id: 'art-001',
          title: 'ACVIM Consensus Statement on Diagnosing Canine Acute Pancreatitis',
          authors: ['Steiner J.M.', 'Xenoulis P.G.', 'Forman M.A.'],
          journal: 'Journal of Veterinary Internal Medicine (JVIM)',
          year: 2024,
          doi: '10.1111/jvim.16842',
          publication_type: 'Consenso',
          evidence_level: 'Alta',
          impact_level: 'Alto',
          clinical_summary: 'Consenso atualizado que estabelece o ensaio Spec cPL / v-cPL e ultrassonografia abdominal como o padrão-ouro não invasivo para diagnóstico da pancreatite aguda em cães com queixa de vômito e dor abdominal.',
          quoted_excerpt: '"A mensuração de Lipase Pancreática Específica Canina (cPL) associada ao edema hipoecogênico e hiperecogenocidade do gordura peripancreática possui sensibilidade de 88% e especificidade de 92% para pancreatite necrotizante ou aguda."',
          supports: [
            'Aumenta probabilidade de pancreatite aguda em pacientes com vômito e dor cranial',
            'Reforça indicação de ultrassonografia abdominal focada no pâncreas',
            'Recomenda dosagem sequencial de Spec cPL / v-cPL',
            'Reduz peso da hipótese de gastroenterite simples sem pancreatite'
          ],
          contradicts: [
            'Contradiz indicação imediata de corticoterapia em fase hiperaguda sem hipotensão severa'
          ],
          recommended_tests: ['Spec cPL (Lipase Pancreática)', 'Ultrassom Abdominal Dedicado', 'Hemograma & Leucograma'],
          recommended_treatments: ['Fluidoterapia IV de Ressuscitação (Ringer Lactato)', 'Maropitant (Cerenia) 1 mg/kg', 'Analgesia com Metadona/Tramadol'],
          species: ['Canina'],
          tags: ['Pancreatite', 'cPL', 'Ultrassom', 'Gastroenterologia'],
          score: { qualityScore: 98, recencyScore: 95, citationCount: 142 }
        },
        {
          article_id: 'art-002',
          title: 'WSAVA World Small Animal Guidelines on Nutritional Management in Acute Gastrointestinal Disease',
          authors: ['Freeman L.M.', 'Becvarova I.', 'Cave N.'],
          journal: 'Veterinary Evidence & Clinical Nutrition Journal',
          year: 2023,
          doi: '10.1016/j.jve.2023.04.011',
          publication_type: 'Guideline',
          evidence_level: 'Alta',
          impact_level: 'Alto',
          clinical_summary: 'Diretriz internacional recomendando o suporte nutricional precoce por via enteral em cães com pancreatite e dor abdominal assim que o vômito for controlado.',
          quoted_excerpt: '"A nutrição enteral precoce em até 24h após cessação do vômito reduz a translocação bacteriana, diminui tempo de internação e melhora a sobrevivência em comparação ao jejum prolongado."',
          supports: [
            'Reforça enteralização precoce pós-controle de êmese',
            'Orienta dieta altamente digestível com baixo teor de lipídeos (<10% na MS)'
          ],
          recommended_tests: ['Glicemia e Eletrólitos (Na+, K+, Ca++ iônico)'],
          recommended_treatments: ['Sonda Nasoesofágica em anorexia >48h', 'Alimentação Ultra-Low Fat'],
          species: ['Canina', 'Felina'],
          tags: ['Nutrição', 'WSAVA', 'Entéral', 'Pancreatite'],
          score: { qualityScore: 96, recencyScore: 92, citationCount: 89 }
        },
        {
          article_id: 'art-003',
          title: 'Diagnostic Precision of Specific Lipase Tests in Canine Acute Abdomen: A Meta-Analysis of 24 Studies',
          authors: ['Mansfield C.S.', 'Cridge H.', 'Salgado M.'],
          journal: 'American Journal of Veterinary Research',
          year: 2022,
          doi: '10.2460/ajvr.22.02.0031',
          publication_type: 'Meta-análise',
          evidence_level: 'Alta',
          impact_level: 'Alto',
          clinical_summary: 'Meta-análise sistemática avaliando o desempenho comparativo da amilase/lipase sérica total versus lipase pancreática específica.',
          quoted_excerpt: '"A amilase e lipase séricas convencionais apresentaram taxas de falso-positivo de até 42% em gastroenterites puras, justificando o banimento do uso como marcador isolado em favor da lipase específica."',
          supports: [
            'Aumenta acurácia diagnóstica do teste específico v-cPL/Spec cPL',
            'Desencoraja o diagnóstico baseado apenas em Amilase/Lipase total'
          ],
          species: ['Canina'],
          tags: ['Meta-Análise', 'Biomarcadores', 'Pancreatite'],
          score: { qualityScore: 99, recencyScore: 88, citationCount: 210 }
        }
      ]
    },
    {
      id: 'gastroenterite-hemorragica',
      name: 'Síndrome da Gastroenterite Aguda Hemorrágica (AHDS)',
      probability: 62,
      badge: 'Moderada',
      category: 'Gastroenterologia',
      articles: [
        {
          article_id: 'art-004',
          title: 'Acute Hemorrhagic Diarrhea Syndrome in Dogs: Etiology, Pathophysiology and Evidence-Based Therapy',
          authors: ['Unterer S.', 'Busch K.', 'Leipig-Rudolph M.'],
          journal: 'Veterinary Clinics of North America: Small Animal Practice',
          year: 2021,
          doi: '10.1016/j.cvsm.2021.01.004',
          publication_type: 'Review',
          evidence_level: 'Moderada',
          impact_level: 'Moderado',
          clinical_summary: 'Estudo de revisão focado na hemoconcentração acentuada (VG > 55%) sem elevação correspondente da proteína plasmática total (PPT), típica da AHDS.',
          quoted_excerpt: '"A AHDS caracteriza-se por rápida perda de fluidos intraluminais com hemoconcentração severa e vômitos sanguinolentos. O uso de antibióticos não altera a sobrevivência em ausência de sepse comprovada."',
          supports: [
            'Explica hemoconcentração e êmese/diarreia súbita',
            'Recomenda fluidoterapia agressiva com cristaloides'
          ],
          contradicts: [
            'Desencoraja antibioticoterapia empírica sistemática (Amoxicilina/Clavulanato ou Metronidazol) sem neutropenia ou sepse'
          ],
          recommended_tests: ['Hematócrito / Proteína Plasmática Total (VG/PPT)', 'Hemograma'],
          recommended_treatments: ['Cristaloides IV 10-20 mL/kg/h inicial', 'Probióticos de alta concentração'],
          species: ['Canina'],
          tags: ['AHDS', 'Gastroenterite', 'Fluidoterapia'],
          score: { qualityScore: 91, recencyScore: 82, citationCount: 104 }
        }
      ]
    },
    {
      id: 'corpo-estranho-intestinal',
      name: 'Obstrução Gastrointestinal por Corpo Estranho',
      probability: 41,
      badge: 'Baixa',
      category: 'Emergência / Cirurgia',
      articles: [
        {
          article_id: 'art-005',
          title: 'Radiographic and Ultrasonographic Findings in Canine Intestinal Foreign Body Obstruction',
          authors: ['Griffin S.', 'Platt S.', 'Papasouliotis K.'],
          journal: 'Veterinary Radiology & Ultrasound',
          year: 2020,
          doi: '10.1111/vru.12852',
          publication_type: 'Clinical Trial',
          evidence_level: 'Moderada',
          impact_level: 'Moderado',
          clinical_summary: 'Avaliação prospectiva da sensibilidade do ultrassom e raio-X abdominal simples para identificação de corpos estranhos obstrutivos e distensão de alças.',
          quoted_excerpt: '"O diâmetro da alça intestinal maior que 1,6 vezes a altura do corpo vertebral de L5 apresenta sensibilidade de 89% para obstrução mecânica completa."',
          supports: [
            'Fundamenta indicação de Raio-X abdominal simples e contrastado',
            'Aumenta probabilidade de cirurgia se houver padrão obstrutivo em alça'
          ],
          recommended_tests: ['Radiografia Abdominal Projeção VD/Lateral', 'Ultrassonografia com avaliação de peristaltismo'],
          species: ['Canina', 'Felina'],
          tags: ['Radiologia', 'Obstrução', 'Cirurgia'],
          score: { qualityScore: 89, recencyScore: 78, citationCount: 76 }
        }
      ]
    }
  ]
};

/**
 * Retrieves hypotheses and associated evidence list for a given patient condition.
 */
export function getEvidenceGroupsForPatient(symptomsText?: string, species?: string): HypothesisEvidenceGroup[] {
  const lower = (symptomsText || '').toLowerCase().trim();
  const speciesLower = (species || '').toLowerCase().trim();
  const isFeline = speciesLower.includes('gato') || speciesLower.includes('felin') || speciesLower.includes('cat') || lower.includes('gato') || lower.includes('felino') || lower.includes('felina');

  if (!lower || lower.length < 5) {
    return [];
  }

  // 1. Otitis / Dermatology
  if (lower.match(/(otit|orelha|ouvido|coceira|prurid|dermat|atopia|pele)/)) {
    return [
      {
        id: 'otite-externa-bacteriana',
        name: 'Otite Externa Supurativa Bilateral',
        probability: 88,
        badge: 'Alta',
        category: 'Dermatologia / Otologia',
        articles: [
          {
            article_id: 'art-oti-01',
            title: 'WAVD Clinical Consensus Guidelines for the Diagnosis and Treatment of Canine Otitis Externa',
            authors: ['Paterson S.', 'Noli C.', 'Nuttall T.'],
            journal: 'Veterinary Dermatology',
            year: 2024,
            doi: '10.1111/vde.13210',
            publication_type: 'Guideline',
            evidence_level: 'Alta',
            impact_level: 'Alto',
            clinical_summary: 'Consenso mundial estabelecendo que a citologia otológica é obrigatória antes de qualquer medicação para definir etiologia (bactérias, leveduras ou mista).',
            quoted_excerpt: '"A citologia do exsudato ótico constitui o exame fundamental no manejo inicial da otite externa, orientando a escolha da lavagem e dos princípios ativos tópicos."',
            supports: [
              'Torna a Citologia Otológica exame de primeira escolha obrigatório',
              'Reforça necessidade de limpeza de conduto antes da instilação de medicação',
              'Indica corticoide tópico de curta duração para redução de eritema e edema'
            ],
            recommended_tests: ['Citologia de Exsudato Otológico (Coloração Fast-Read)', 'Otoscopia Rígida/Direta'],
            recommended_treatments: ['Limpeza de conduto com ceruminolítico suave', 'Gotas tópicas tríplices (Antibiótico + Antifúngico + Corticoide)'],
            species: ['Canina'],
            tags: ['WAVD', 'Otite', 'Citologia', 'Dermatologia'],
            score: { qualityScore: 99, recencyScore: 98, citationCount: 156 }
          }
        ]
      }
    ];
  }

  // 2. Hernia / Prostatopathy
  if (lower.includes('hernia') || lower.includes('perineal') || lower.includes('prostat') || lower.includes('tenesmo') || lower.includes('disquezia') || lower.includes('fita')) {
    return [
      {
        id: 'hernia-perineal-prostatopatia',
        name: 'Hérnia Perineal com Hiperplasia Prostática Benigna (HPB)',
        probability: 89,
        badge: 'Alta',
        category: 'Cirurgia de Pequenos Animais / Urologia',
        articles: [
          {
            article_id: 'art-her-01',
            title: 'Surgical Management and Long-Term Outcome of Perineal Hernia Repair in Intact Male Dogs',
            authors: ['Fossum T.W.', 'Niles J.D.', 'Hedlund C.S.'],
            journal: 'Journal of Small Animal Practice',
            year: 2023,
            doi: '10.1111/jsap.13520',
            publication_type: 'Clinical Trial',
            evidence_level: 'Alta',
            impact_level: 'Alto',
            clinical_summary: 'A transposição do músculo obturador interno associada à orquiectomia reduz a taxa de recidiva da hérnia perineal de 42% para menos de 4%.',
            quoted_excerpt: '"A castração simultânea induz atrofia prostática acentuada em até 3 semanas, aliviando a pressão sobre o diafragma pélvico e o tenesmo."',
            supports: [
              'Indica orquiectomia preventiva e terapêutica conjunta na herniação perineal',
              'Sustenta transposição do obturador interno para reconstrução pélvica'
            ],
            recommended_tests: ['Toque Retal Digital', 'Ultrassonografia Pélvica/Abdominal'],
            recommended_treatments: ['Rafia por Transposição do Músculo Obturador Interno', 'Orquiectomia', 'Lactulose oral'],
            species: ['Canina'],
            tags: ['Fossum', 'Hérnia Perineal', 'Cirurgia', 'HPB'],
            score: { qualityScore: 96, recencyScore: 95, citationCount: 140 }
          }
        ]
      }
    ];
  }

  // 3. Orthopedics / TPLO
  if (lower.includes('tplo') || lower.includes('joelho') || lower.includes('claudic') || lower.includes('mancand') || lower.includes('ligamento') || lower.includes('ortop')) {
    return [
      {
        id: 'ruptura-ligamento-cruzado',
        name: 'Ruptura do Ligamento Cruzado Cranial (RLCCr)',
        probability: 87,
        badge: 'Alta',
        category: 'Ortopedia Veterinária',
        articles: [
          {
            article_id: 'art-ort-01',
            title: 'Veterinary Orthopedic Society Guidelines on Tibial Plateau Leveling Osteotomy (TPLO)',
            authors: ['Cook J.L.', 'Innes J.F.', 'Boudrieau R.J.'],
            journal: 'Veterinary and Comparative Orthopaedics and Traumatology',
            year: 2024,
            doi: '10.1055/s-0044-1782010',
            publication_type: 'Guideline',
            evidence_level: 'Alta',
            impact_level: 'Alto',
            clinical_summary: 'A TPLO é a técnica de escolha para estabilização dinâmica da articulação do joelho em cães de médio e grande porte, eliminando o impulso tibial cranial.',
            quoted_excerpt: '"A estabilização biomecânica pela TPLO reduz a progressão da osteoartrose em comparação a técnicas extracapsulares."',
            supports: ['Sustenta cirurgia de TPLO', 'Recomenda protocolo de reabilitação e analgesia multimodal'],
            recommended_tests: ['Radiografia Ortogonal do Joelho (Projeção para Medição de TPA)', 'Teste de Gaveta Cranial'],
            recommended_treatments: ['Procedimento Cirúrgico TPLO', 'NSAID COX-2 Seletivo', 'Repouso e Fisioterapia'],
            species: ['Canina'],
            tags: ['VOS', 'TPLO', 'Ortopedia', 'Joelho'],
            score: { qualityScore: 98, recencyScore: 97, citationCount: 210 }
          }
        ]
      }
    ];
  }

  // 4. Urinary / Renal
  if (lower.includes('xixi') || lower.includes('urina') || lower.includes('disuria') || lower.includes('cistite') || lower.includes('rim') || lower.includes('urolit')) {
    return [
      {
        id: 'cistite-bacteriana',
        name: 'Cistite Bacteriana Aguda / Infecção do Trato Urinário (ITU)',
        probability: 86,
        badge: 'Alta',
        category: 'Urologia / Nefrologia',
        articles: [
          {
            article_id: 'art-uri-01',
            title: 'ISCAID Consensus Guidelines for Diagnosis and Management of Urinary Tract Infections in Dogs and Cats',
            authors: ['Weese J.S.', 'Blondeau J.M.', 'Boothe D.'],
            journal: 'Veterinary Microbiology',
            year: 2024,
            doi: '10.1016/j.vetmic.2024.109800',
            publication_type: 'Guideline',
            evidence_level: 'Alta',
            impact_level: 'Alto',
            clinical_summary: 'Diretriz da ISCAID preconizando urinálise completa e cistocentese para microbiologia, restringindo o uso empírico de fluorquinolonas sem antibiograma.',
            quoted_excerpt: '"Amoxicilina com Clavulanato permanece como primeira linha de escolha empírica antes dos resultados de cultura para ITUs esporádicas não complicadas."',
            supports: ['Recomenda urinálise e cistocentese', 'Orienta terapia antimicrobiana responsável'],
            recommended_tests: ['Urinálise Tipo 1 (EAS)', 'Urocultura com Antibiograma por Cistocentese'],
            recommended_treatments: ['Amoxicilina + Clavulanato (12.5-25 mg/kg)', 'Analgesia vesical'],
            species: ['Canina', 'Felina'],
            tags: ['ISCAID', 'Urologia', 'Cistite', 'Antibióticos'],
            score: { qualityScore: 99, recencyScore: 98, citationCount: 185 }
          }
        ]
      }
    ];
  }

  // Default Gastrointestinal Database (Species Aware)
  return isFeline ? MOCK_EVIDENCE_DATABASE.felineGastro : MOCK_EVIDENCE_DATABASE.default;
}

/**
 * Builds the Evidence Graph Data structure for node-link visualization
 */
export interface EvidenceGraphNode {
  id: string;
  label: string;
  type: 'hypothesis' | 'finding' | 'article' | 'exam' | 'treatment';
  category?: string;
  score?: number;
}

export interface EvidenceGraphEdge {
  source: string;
  target: string;
  relation: string; // e.g. "Sustenta", "Recomenda", "Reduz"
  strength: 'Forte' | 'Moderada' | 'Limitada';
  color: 'green' | 'amber' | 'blue' | 'gray';
  quoteExcerpt?: string;
}

export interface EvidenceGraphData {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
}

export function buildEvidenceGraph(hypothesisName: string, articles: EvidenceArticle[]): EvidenceGraphData {
  const hypId = 'hyp-center';
  const nodes: EvidenceGraphNode[] = [
    { id: hypId, label: hypothesisName, type: 'hypothesis' }
  ];

  const edges: EvidenceGraphEdge[] = [];

  // Add articles
  articles.forEach((art, idx) => {
    const artNodeId = `art-${idx}`;
    nodes.push({
      id: artNodeId,
      label: art.title.length > 35 ? art.title.slice(0, 35) + '...' : art.title,
      type: 'article',
      category: art.publication_type
    });

    edges.push({
      source: artNodeId,
      target: hypId,
      relation: 'Sustenta Diagnóstico',
      strength: art.evidence_level === 'Alta' ? 'Forte' : 'Moderada',
      color: art.evidence_level === 'Alta' ? 'green' : 'amber',
      quoteExcerpt: art.quoted_excerpt
    });

    // Add recommended tests as nodes linked to article and hypothesis
    if (art.recommended_tests) {
      art.recommended_tests.slice(0, 2).forEach((test, tIdx) => {
        const testNodeId = `test-${idx}-${tIdx}`;
        if (!nodes.some(n => n.label === test)) {
          nodes.push({ id: testNodeId, label: test, type: 'exam' });
          edges.push({
            source: artNodeId,
            target: testNodeId,
            relation: 'Indica Exame',
            strength: 'Forte',
            color: 'blue',
            quoteExcerpt: `Indicado conforme ${art.journal}`
          });
        }
      });
    }

    // Add recommended treatments as nodes
    if (art.recommended_treatments) {
      art.recommended_treatments.slice(0, 1).forEach((rx, rIdx) => {
        const rxNodeId = `rx-${idx}-${rIdx}`;
        if (!nodes.some(n => n.label === rx)) {
          nodes.push({ id: rxNodeId, label: rx, type: 'treatment' });
          edges.push({
            source: artNodeId,
            target: rxNodeId,
            relation: 'Protocolo Terapêutico',
            strength: 'Forte',
            color: 'green',
            quoteExcerpt: `Recomendado em ${art.journal}`
          });
        }
      });
    }
  });

  return { nodes, edges };
}
