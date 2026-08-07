export interface Patient {
  id?: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  ownerId: string;
  sex?: string;
  weight?: string;
  tutorName?: string;
  tutorPhone?: string;
  ownerName?: string;
  ownerPhone?: string;
  fc?: string;
  fr?: string;
  temperature?: string;
  tpc?: string;
  mucosas?: string;
  hydration?: string;
}

export interface AttachmentItem {
  attachment_id: string;
  name: string;
  size: string;
  mimeType: string;
  type: 'pdf' | 'image' | 'audio' | 'ocr';
  url?: string;
  data?: string;
  uploadedAt: string;
}

export interface DifferentialHypothesis {
  id: string;
  title: string;
  confidence: number;
  probability: 'Alta' | 'Moderada' | 'Baixa';
  justification: string;
  favorableFindings: string[];
  unfavorableFindings: string[];
  status: 'active' | 'confirmed' | 'ruled_out';
}

export interface ClinicalReasoningStore {
  reasoning_id: string;
  activeHypothesisId: string;
  differentials: DifferentialHypothesis[];
  updatedAt: string;
}

export interface ClinicalSession {
  case_id: string;
  patient_id: string;
  patient: Patient;
  owner: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  anamnesis: {
    chiefComplaint: string;
    history: string;
    currentMedications?: string;
    vaccinationStatus?: string;
    environment?: string;
    diet?: string;
    evolutionTime?: string;
    painLevel?: string;
    clinicalSigns?: string[];
  };
  physicalExam: {
    temperature?: string;
    fc?: string;
    fr?: string;
    tpc?: string;
    mucosas?: string;
    hydration?: string;
    palpation?: string;
    neurological?: string;
    respiratory?: string;
    cardiovascular?: string;
    digestive?: string;
    locomotor?: string;
    dermatological?: string;
  };
  laboratory: {
    hemogram?: string;
    biochemical?: string;
    urinalysis?: string;
    otherExams?: string;
  };
  imaging: {
    xray?: string;
    ultrasound?: string;
    ctScan?: string;
  };
  attachments: AttachmentItem[];
  clinicalFindings: string[];
  reasoning: ClinicalReasoningStore;
  evidence: {
    evidence_id: string;
    articles: EvidenceArticle[];
  };
  carePlan: CarePlan;
  documents: ClinicalDocument[];
  timeline: {
    timeline_id: string;
    date: string;
    time: string;
    type: CaseEventType;
    title: string;
    summary: string;
    details?: string;
  }[];
  history: string[];
  notes: string;
  favorite: boolean;
  status: 'draft' | 'active' | 'closed';
  metadata: {
    createdAt: string;
    updatedAt: string;
    vetName: string;
    clinicName: string;
  };
}

export interface ClinicalKnowledgeLayer {
  patients: Patient[];
  tutors: { id: string; name: string; phone: string }[];
  cases: ClinicalCase[];
  diagnoses: { name: string; count: number }[];
  literature: EvidenceArticle[];
  protocols: CarePlan[];
  templates: ClinicalDocument[];
  statistics: ClinicalKnowledgeStats;
  favorites: string[];
}

export interface Appointment {
  id: string;
  patientName: string;
  ownerName: string;
  type: 'Consulta' | 'Retorno' | 'Vacina' | 'Cirurgia';
  time: string;
  date: string;
  status: 'confirmed' | 'pending' | 'finished';
  species: 'Canino' | 'Felino';
  ownerId: string;
}

export interface Report {
  id?: string;
  patientId: string;
  patientSpecies?: string;
  patientBreed?: string;
  patientAge?: string;
  patientSex?: string;
  patientWeight?: string;
  anamnesis: string;
  examData: string;
  soapContent: string;
  prescription?: string;
  marketingSource?: string;
  sources: string[];
  createdAt: number;
  ownerId: string;
  status: 'draft' | 'finalized';
  rating?: number;
  feedbackComment?: string;
  uploadedExamFiles?: { name: string; size: string }[];
  uploadedLiteratureFiles?: { name: string; size: string }[];
}

export interface GenerateReportRequest {
  patient: Partial<Patient>;
  anamnesis: string;
  examData: string;
}

export interface MedicalGuideline {
  title: string;
  content: string;
  source: string;
}

export interface EvidenceArticle {
  article_id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi: string;
  publication_type: 'Consenso' | 'Guideline' | 'Meta-análise' | 'Review' | 'Clinical Trial' | 'Case Series' | 'Case Report' | 'Expert Opinion';
  evidence_level: 'Alta' | 'Moderada' | 'Baixa';
  clinical_summary: string;
  quoted_excerpt: string;
  supports: string[];
  contradicts?: string[];
  recommended_tests?: string[];
  recommended_treatments?: string[];
  species: string[];
  tags: string[];
  impact_level: 'Baixo' | 'Moderado' | 'Alto';
  score?: {
    qualityScore: number;
    recencyScore: number;
    citationCount: number;
  };
}

export type CitationFormat = 'APA' | 'ABNT' | 'Vancouver';

export type ItemDecisionStatus = 'Aceito' | 'Editado' | 'Removido' | 'Pendente';

export interface ClinicalGoal {
  id: string;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  justification: string;
  status: ItemDecisionStatus;
}

export interface RecommendedTestItem {
  id: string;
  name: string;
  motive: string;
  confirmationGoal: string;
  urgency: 'Alta' | 'Moderada' | 'Baixa';
  guidelineSource: string;
  status: ItemDecisionStatus;
}

export interface RecommendedInterventionItem {
  id: string;
  description: string;
  justification: string;
  reference: string;
  guidelineSource: string;
  status: ItemDecisionStatus;
}

export interface MonitoringParamItem {
  id: string;
  parameter: string;
  frequency: string;
  reason: string;
  status: ItemDecisionStatus;
}

export interface ClinicalAlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'alerta' | 'atencao' | 'info';
}

export interface CarePlan {
  goals: ClinicalGoal[];
  recommended_tests: RecommendedTestItem[];
  recommended_interventions: RecommendedInterventionItem[];
  monitoring: MonitoringParamItem[];
  alerts: ClinicalAlertItem[];
  supporting_references: string[];
}

export type ClinicalDocumentType = 
  | 'prescription' 
  | 'exam_request' 
  | 'clinical_evolution' 
  | 'therapeutic_plan' 
  | 'discharge' 
  | 'referral' 
  | 'tutor_summary' 
  | 'scientific_pdf';

export type ClinicalDocumentStatus = 'draft' | 'finalized' | 'signed' | 'sent';

export interface DocumentSectionOrigin {
  hypothesis: string;
  handbook: string;
  guideline: string;
  vetConfirmed: boolean;
}

export interface ClinicalDocumentSection {
  id: string;
  title: string;
  content: string;
  origin: DocumentSectionOrigin;
  editedByUser: boolean;
  validationAlerts?: string[];
}

export interface ClinicalDocument {
  id: string;
  type: ClinicalDocumentType;
  title: string;
  subtitle: string;
  status: ClinicalDocumentStatus;
  version: number;
  updatedAt: string;
  edited_by_user: boolean;
  sections: ClinicalDocumentSection[];
  export_formats: ('PDF' | 'DOCX')[];
  signature?: {
    vetName: string;
    crmv: string;
    date: string;
    digitalHash: string;
  };
}

export interface CanonicalCaseData {
  patient: Patient;
  activeHypothesis: string;
  medications: {
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    notes: string;
  }[];
  requestedExams: string[];
  careGoals: string[];
  tutorInstructions: string[];
  anamnesisSummary?: string;
  version: number;
}

export type CaseEventType = 
  | 'consultation' 
  | 'exam' 
  | 'hypothesis_change' 
  | 'conduct' 
  | 'evolution' 
  | 'discharge' 
  | 'return';

export interface ClinicalCaseEvent {
  id: string;
  date: string;
  time: string;
  type: CaseEventType;
  title: string;
  summary: string;
  details?: string;
}

export interface LearnedLesson {
  id: string;
  text: string;
  favorited: boolean;
}

export interface ClinicalCase {
  id: string;
  patient: Patient;
  date: string;
  initialHypothesis: string;
  finalDiagnosis: string;
  outcome: 'Alta' | 'Cura' | 'Em Acompanhamento' | 'Reencaminhado' | 'Em Tratamento';
  followUpDuration: string;
  returnVisitsCount: number;
  tags: string[];
  clinicalFindings: string[];
  specialty: string;
  affectedSystem: string;
  procedure: string;
  vetName: string;
  summary: string;
  learnedLessons: LearnedLesson[];
  timeline: ClinicalCaseEvent[];
  documents: string[];
  references: string[];
  similarityScore?: number;
}

export interface ClinicalKnowledgeStats {
  totalCases: number;
  relatedArticles: number;
  generatedDocs: number;
  lastSync: string;
  frequentDiagnoses: { name: string; count: number; percentage: number }[];
  avgTimeToDiagnosis: string;
  outcomeDistribution: { outcome: string; count: number; percentage: number }[];
  frequentProcedures: { name: string; count: number }[];
  frequentGuidelines: { name: string; count: number }[];
}

export interface CaseComparisonResult {
  caseIds: string[];
  cases: ClinicalCase[];
  similarities: string[];
  differences: {
    category: string;
    description: string;
    detailsByCase: Record<string, string>;
  }[];
  examDifferences: string[];
  treatmentDifferences: string[];
  outcomeComparison: string;
  literatureComparison: string[];
}

