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
