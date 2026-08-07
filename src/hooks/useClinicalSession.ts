import { useState, useEffect } from 'react';
import { ClinicalSession, Patient, CarePlan, ClinicalDocument, AttachmentItem } from '../types';
import { clinicalSessionStore } from '../lib/clinicalSessionStore';

export function useClinicalSession() {
  const [session, setSession] = useState<ClinicalSession | null>(() => clinicalSessionStore.getSession());

  useEffect(() => {
    // Subscribe to global store updates
    const unsubscribe = clinicalSessionStore.subscribe((updatedSession) => {
      setSession(updatedSession);
    });

    // Ensure session is fetched from backend if not already loaded
    if (!clinicalSessionStore.getSession()) {
      clinicalSessionStore.fetchInitialSession();
    }

    return () => unsubscribe();
  }, []);

  return {
    session,
    updatePatient: (patient: Partial<Patient>) => clinicalSessionStore.updatePatient(patient),
    updateAnamnesis: (chiefComplaint: string, history?: string) => clinicalSessionStore.updateAnamnesis(chiefComplaint, history),
    addAttachment: (fileItem: AttachmentItem) => clinicalSessionStore.addAttachment(fileItem),
    setActiveHypothesis: (hypothesisId: string) => clinicalSessionStore.setActiveHypothesis(hypothesisId),
    updateCarePlan: (carePlan: CarePlan) => clinicalSessionStore.updateCarePlan(carePlan),
    updateDocuments: (documents: ClinicalDocument[]) => clinicalSessionStore.updateDocuments(documents),
    addTimelineEvent: (title: string, summary: string, type?: any, details?: string) =>
      clinicalSessionStore.addTimelineEvent(title, summary, type, details)
  };
}
