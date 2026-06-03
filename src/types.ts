export interface Patient {
  id?: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  ownerId: string;
}

export interface Report {
  id?: string;
  patientId: string;
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
