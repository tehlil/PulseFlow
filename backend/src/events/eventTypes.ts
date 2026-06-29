export enum DomainEvents {
  PATIENT_CREATED = 'PatientCreated',
  PATIENT_UPDATED = 'PatientUpdated',
  ASSESSMENT_CREATED = 'AssessmentCreated',
  ASSESSMENT_UPDATED = 'AssessmentUpdated',
  ASSESSMENT_DELETED = 'AssessmentDeleted',
  PREDICTION_GENERATED = 'PredictionGenerated',
  CRITICAL_RISK_DETECTED = 'CriticalRiskDetected',
  NOTIFICATION_CREATED = 'NotificationCreated',
  USER_CREATED = 'UserCreated',
  HOSPITAL_CREATED = 'HospitalCreated',
}

export interface PatientCreatedPayload {
  patientId: string;
  hospitalId: string;
  mrn: string;
}

export interface AssessmentCreatedPayload {
  assessmentId: string;
  patientId: string;
  hospitalId: string;
}

export interface AssessmentUpdatedPayload {
  assessmentId: string;
  patientId: string;
  hospitalId: string;
}

export interface AssessmentDeletedPayload {
  assessmentId: string;
  patientId: string;
  hospitalId: string;
}

export interface PredictionGeneratedPayload {
  predictionId: string;
  patientId: string;
  hospitalId: string;
  riskCategory: string;
  riskScore: number;
}

export interface CriticalRiskDetectedPayload {
  patientId: string;
  hospitalId: string;
  predictionId: string;
  riskCategory: string;
  riskScore: number;
}

export interface NotificationCreatedPayload {
  notificationId: string;
  userId: string;
  type: string;
}
