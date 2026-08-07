import { ClinicalSession, Patient, CarePlan, ClinicalDocument, AttachmentItem } from '../types';

type SessionSubscriber = (session: ClinicalSession) => void;

class ClinicalSessionStore {
  private currentSession: ClinicalSession | null = null;
  private subscribers: Set<SessionSubscriber> = new Set();
  private saveTimeout: any = null;
  private isFetching: boolean = false;

  constructor() {
    this.fetchInitialSession();
  }

  public async fetchInitialSession(): Promise<ClinicalSession> {
    if (this.currentSession) return this.currentSession;
    if (this.isFetching) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.currentSession!;
    }
    this.isFetching = true;
    try {
      const res = await fetch('/api/clinical-session/current');
      if (res.ok) {
        const data = await res.json();
        this.currentSession = data;
        this.notifySubscribers();
      }
    } catch (err) {
      console.error('Failed to fetch initial session from backend:', err);
    } finally {
      this.isFetching = false;
    }
    return this.currentSession!;
  }

  public getSession(): ClinicalSession | null {
    return this.currentSession;
  }

  public subscribe(callback: SessionSubscriber): () => void {
    this.subscribers.add(callback);
    if (this.currentSession) {
      callback(this.currentSession);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    if (this.currentSession) {
      this.subscribers.forEach(cb => cb({ ...this.currentSession! }));
    }
  }

  private scheduleAutoSave(updates: Partial<ClinicalSession>) {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(async () => {
      if (!this.currentSession) return;
      try {
        const caseId = this.currentSession.case_id || 'current';
        const res = await fetch(`/api/clinical-session/${caseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          const updatedSession = await res.json();
          this.currentSession = updatedSession;
          this.notifySubscribers();
        }
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 400); // 400ms debounce
  }

  public updatePatient(patientData: Partial<Patient>) {
    if (!this.currentSession) return;
    
    this.currentSession = {
      ...this.currentSession,
      patient: {
        ...this.currentSession.patient,
        ...patientData
      },
      metadata: {
        ...this.currentSession.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    if (patientData.tutorName) {
      this.currentSession.owner.name = patientData.tutorName;
    }
    if (patientData.tutorPhone) {
      this.currentSession.owner.phone = patientData.tutorPhone;
    }

    this.notifySubscribers();
    this.scheduleAutoSave({ patient: this.currentSession.patient });
  }

  public updateAnamnesis(chiefComplaint: string, history?: string) {
    if (!this.currentSession) return;

    this.currentSession = {
      ...this.currentSession,
      anamnesis: {
        ...this.currentSession.anamnesis,
        chiefComplaint,
        history: history !== undefined ? history : this.currentSession.anamnesis.history
      },
      metadata: {
        ...this.currentSession.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.notifySubscribers();
    this.scheduleAutoSave({ anamnesis: this.currentSession.anamnesis });
  }

  public addAttachment(fileItem: AttachmentItem) {
    if (!this.currentSession) return;

    const exists = this.currentSession.attachments.some(a => a.name === fileItem.name);
    if (!exists) {
      const updatedAttachments = [...this.currentSession.attachments, fileItem];
      
      const nowStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const newTimelineEvent = {
        timeline_id: `timeline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: nowStr,
        time: timeStr,
        type: 'exam' as const,
        title: `Exame Anexado: ${fileItem.name}`,
        summary: `Arquivo ${fileItem.name} (${fileItem.size}) integrado ao prontuário.`,
        details: 'Análise RAG e cruzamento com literatura acionados.'
      };

      this.currentSession = {
        ...this.currentSession,
        attachments: updatedAttachments,
        timeline: [newTimelineEvent, ...this.currentSession.timeline]
      };

      this.notifySubscribers();
      this.scheduleAutoSave({ attachments: updatedAttachments });
    }
  }

  public setActiveHypothesis(hypothesisId: string) {
    if (!this.currentSession) return;

    this.currentSession = {
      ...this.currentSession,
      reasoning: {
        ...this.currentSession.reasoning,
        activeHypothesisId: hypothesisId,
        updatedAt: new Date().toISOString()
      }
    };

    this.notifySubscribers();
    this.scheduleAutoSave({ reasoning: this.currentSession.reasoning });
  }

  public updateCarePlan(carePlan: CarePlan) {
    if (!this.currentSession) return;

    this.currentSession = {
      ...this.currentSession,
      carePlan,
      metadata: {
        ...this.currentSession.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.notifySubscribers();
    this.scheduleAutoSave({ carePlan });
  }

  public updateDocuments(documents: ClinicalDocument[]) {
    if (!this.currentSession) return;

    this.currentSession = {
      ...this.currentSession,
      documents,
      metadata: {
        ...this.currentSession.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.notifySubscribers();
    this.scheduleAutoSave({ documents });
  }

  public addTimelineEvent(title: string, summary: string, type: any = 'evolution', details?: string) {
    if (!this.currentSession) return;

    const nowStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newEv = {
      timeline_id: `timeline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: nowStr,
      time: timeStr,
      type,
      title,
      summary,
      details
    };

    this.currentSession = {
      ...this.currentSession,
      timeline: [newEv, ...this.currentSession.timeline]
    };

    this.notifySubscribers();
    this.scheduleAutoSave({ timeline: this.currentSession.timeline } as any);
  }
}

export const clinicalSessionStore = new ClinicalSessionStore();
