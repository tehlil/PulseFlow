import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { eventBus } from '../events/eventBus';
import { DomainEvents } from '../events/eventTypes';

interface FactorContribution {
  factor: string;
  weight: number;
}

interface PredictionResult {
  predictionType: 'DIABETES' | 'CARDIOVASCULAR' | 'HYPERTENSION' | 'READMISSION';
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  contributingFactors: FactorContribution[];
  recommendedActions: string[];
}

export class PredictionService {
  /**
   * Run the rule-based prediction engine on a given assessment.
   * Scans patient age, gender, vitals, biomarkers, symptoms, and visit history.
   */
  static async evaluateAssessment(assessmentId: string): Promise<PredictionResult[]> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        patient: {
          include: {
            visits: {
              where: { deletedAt: null },
              take: 5,
              orderBy: { visitDate: 'desc' },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found for prediction generation');
    }

    const patient = assessment.patient;
    const age = this.calculateAge(patient.dateOfBirth);
    const results: PredictionResult[] = [];

    // Parse symptoms & lab values safely
    const symptoms = (assessment.symptoms as any[]) || [];
    const labValues = (assessment.labValues as Record<string, any>) || {};

    // 1. EVALUATE DIABETES RISK
    results.push(this.predictDiabetes(assessment, age, symptoms, labValues));

    // 2. EVALUATE CARDIOVASCULAR RISK
    results.push(this.predictCardiovascular(assessment, age, symptoms, labValues));

    // 3. EVALUATE HYPERTENSION RISK
    results.push(this.predictHypertension(assessment, age, symptoms, labValues));

    // 4. EVALUATE READMISSION RISK
    results.push(this.predictReadmission(assessment, age, symptoms, patient.visits));

    return results;
  }

  /**
   * Generates and writes predictions to database.
   * Dispatches domain events upon completing calculations.
   */
  static async generateAndSave(assessmentId: string): Promise<any[]> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { patient: true },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    // Invalidate existing active predictions for this assessment
    await prisma.prediction.updateMany({
      where: { assessmentId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    const patient = assessment.patient;
    const evaluations = await this.evaluateAssessment(assessmentId);

    const savedPredictions = await prisma.$transaction(
      evaluations.map((evalData) =>
        prisma.prediction.create({
          data: {
            patientId: patient.id,
            assessmentId: assessment.id,
            modelName: `PulseFlowRiskEngine_v1.0`,
            riskScore: evalData.riskScore,
            riskCategory: evalData.riskCategory,
            confidenceScore: evalData.confidenceScore,
            predictionType: evalData.predictionType,
            contributingFactors: evalData.contributingFactors as any,
            recommendedActions: evalData.recommendedActions as any,
          },
        })
      )
    );

    logger.info(`Generated and saved ${savedPredictions.length} clinical predictions for Patient ID: ${patient.id}`);

    // Emit event for each prediction generated
    for (const pred of savedPredictions) {
      eventBus.publish(DomainEvents.PREDICTION_GENERATED, {
        predictionId: pred.id,
        patientId: patient.id,
        hospitalId: patient.hospitalId,
        riskCategory: pred.riskCategory,
        riskScore: pred.riskScore,
      });

      // If risk is High or Critical, emit CriticalRiskDetected domain event
      if (pred.riskCategory === 'HIGH' || pred.riskCategory === 'CRITICAL') {
        eventBus.publish(DomainEvents.CRITICAL_RISK_DETECTED, {
          patientId: patient.id,
          hospitalId: patient.hospitalId,
          predictionId: pred.id,
          riskCategory: pred.riskCategory,
          riskScore: pred.riskScore,
        });
      }
    }

    return savedPredictions;
  }

  // --- PRIVATE RULE ALGORITHMS ---

  private static predictDiabetes(
    assessment: any,
    age: number,
    symptoms: any[],
    lab: Record<string, any>
  ): PredictionResult {
    let score = 0;
    const factors: FactorContribution[] = [];
    const actions: string[] = [];

    // Age factor
    if (age > 45) {
      score += 10;
      factors.push({ factor: 'Age over 45', weight: 10 });
    }

    // BMI factor (Obesity)
    if (assessment.bmi) {
      if (assessment.bmi >= 30) {
        score += 20;
        factors.push({ factor: `Obesity (BMI: ${assessment.bmi})`, weight: 20 });
        actions.push('Refer to nutritionist for weight management consultation.');
      } else if (assessment.bmi >= 25) {
        score += 10;
        factors.push({ factor: `Overweight (BMI: ${assessment.bmi})`, weight: 10 });
      }
    }

    // Blood Sugar / HbA1c
    if (assessment.bloodSugar) {
      if (assessment.bloodSugar > 140) {
        score += 25;
        factors.push({ factor: `Elevated glucose (${assessment.bloodSugar} mg/dL)`, weight: 25 });
        actions.push('Request immediate HbA1c screening.');
      }
    }
    if (lab.hbA1c) {
      if (lab.hbA1c >= 6.5) {
        score += 30;
        factors.push({ factor: `Diabetic HbA1c level (${lab.hbA1c}%)`, weight: 30 });
        actions.push('Initiate standard diabetic endocrinology consultation.');
      } else if (lab.hbA1c >= 5.7) {
        score += 15;
        factors.push({ factor: `Prediabetic HbA1c level (${lab.hbA1c}%)`, weight: 15 });
        actions.push('Counsel patient on low glycemic index diet.');
      }
    }

    // Symptom matches (Polyuria/Polydipsia/Fatigue)
    const activeSymptoms = symptoms.map((s) => s.name.toLowerCase());
    if (activeSymptoms.includes('polyuria') || activeSymptoms.includes('frequent urination')) {
      score += 15;
      factors.push({ factor: 'Symptom: Frequent Urination (Polyuria)', weight: 15 });
    }
    if (activeSymptoms.includes('polydipsia') || activeSymptoms.includes('excessive thirst')) {
      score += 15;
      factors.push({ factor: 'Symptom: Excessive Thirst (Polydipsia)', weight: 15 });
    }

    // Cap score at 100
    score = Math.min(score, 100);

    const category = this.getCategory(score);
    if (score < 25) actions.push('Routine annual wellness visit.');

    return {
      predictionType: 'DIABETES',
      riskScore: score,
      riskCategory: category,
      confidenceScore: 0.92,
      contributingFactors: factors,
      recommendedActions: actions,
    };
  }

  private static predictCardiovascular(
    assessment: any,
    age: number,
    symptoms: any[],
    lab: Record<string, any>
  ): PredictionResult {
    let score = 0;
    const factors: FactorContribution[] = [];
    const actions: string[] = [];

    // Age
    if (age > 60) {
      score += 15;
      factors.push({ factor: 'Age over 60', weight: 15 });
    }

    // Hypertension (Blood Pressure)
    if (assessment.bloodPressureSystolic && assessment.bloodPressureDiastolic) {
      const sys = assessment.bloodPressureSystolic;
      const dia = assessment.bloodPressureDiastolic;
      if (sys >= 140 || dia >= 90) {
        score += 25;
        factors.push({ factor: `Hypertensive BP (${sys}/${dia} mmHg)`, weight: 25 });
        actions.push('Monitor BP daily and suggest low sodium diet.');
      }
    }

    // Heart Rate
    if (assessment.heartRate && assessment.heartRate > 100) {
      score += 10;
      factors.push({ factor: `Tachycardia (HR: ${assessment.heartRate} bpm)`, weight: 10 });
    }

    // Cholesterol
    if (lab.cholesterolTotal && lab.cholesterolTotal > 240) {
      score += 20;
      factors.push({ factor: `High Total Cholesterol (${lab.cholesterolTotal} mg/dL)`, weight: 20 });
      actions.push('Initiate lipid profile panel checks and consider statin therapy.');
    }

    // Symptoms (Chest Pain/Shortness of breath)
    const activeSymptoms = symptoms.map((s) => s.name.toLowerCase());
    if (activeSymptoms.includes('chest pain') || activeSymptoms.includes('angina')) {
      score += 30;
      factors.push({ factor: 'Symptom: Chest Pain / Discomfort', weight: 30 });
      actions.push('Immediate referral for 12-lead ECG and troponin testing.');
    }
    if (activeSymptoms.includes('shortness of breath') || activeSymptoms.includes('dyspnea')) {
      score += 15;
      factors.push({ factor: 'Symptom: Shortness of Breath', weight: 15 });
    }

    score = Math.min(score, 100);
    const category = this.getCategory(score);
    if (score < 25) actions.push('Standard cardiovascular wellness monitoring.');

    return {
      predictionType: 'CARDIOVASCULAR',
      riskScore: score,
      riskCategory: category,
      confidenceScore: 0.88,
      contributingFactors: factors,
      recommendedActions: actions,
    };
  }

  private static predictHypertension(
    assessment: any,
    age: number,
    symptoms: any[],
    lab: Record<string, any>
  ): PredictionResult {
    let score = 0;
    const factors: FactorContribution[] = [];
    const actions: string[] = [];

    // Blood Pressure levels
    if (assessment.bloodPressureSystolic && assessment.bloodPressureDiastolic) {
      const sys = assessment.bloodPressureSystolic;
      const dia = assessment.bloodPressureDiastolic;
      
      if (sys >= 160 || dia >= 100) {
        score += 45;
        factors.push({ factor: `Stage 2 Hypertension BP (${sys}/${dia} mmHg)`, weight: 45 });
        actions.push('Initiate anti-hypertensive medication therapy protocol.');
      } else if (sys >= 130 || dia >= 80) {
        score += 25;
        factors.push({ factor: `Stage 1 Hypertension BP (${sys}/${dia} mmHg)`, weight: 25 });
        actions.push('Recommend lifestyle changes (DASH diet, exercise).');
      }
    }

    // BMI
    if (assessment.bmi && assessment.bmi >= 28) {
      score += 15;
      factors.push({ factor: `High BMI: ${assessment.bmi}`, weight: 15 });
    }

    // Age
    if (age > 50) {
      score += 15;
      factors.push({ factor: 'Age over 50', weight: 15 });
    }

    // Heart rate
    if (assessment.heartRate && assessment.heartRate > 90) {
      score += 10;
      factors.push({ factor: `Elevated heart rate (${assessment.heartRate} bpm)`, weight: 10 });
    }

    // Symptoms (Headache/Dizziness)
    const activeSymptoms = symptoms.map((s) => s.name.toLowerCase());
    if (activeSymptoms.includes('headache') || activeSymptoms.includes('dizziness')) {
      score += 10;
      factors.push({ factor: 'Symptom: Headaches or Dizziness', weight: 10 });
    }

    score = Math.min(score, 100);
    const category = this.getCategory(score);

    return {
      predictionType: 'HYPERTENSION',
      riskScore: score,
      riskCategory: category,
      confidenceScore: 0.90,
      contributingFactors: factors,
      recommendedActions: actions,
    };
  }

  private static predictReadmission(
    assessment: any,
    age: number,
    symptoms: any[],
    visits: any[]
  ): PredictionResult {
    let score = 0;
    const factors: FactorContribution[] = [];
    const actions: string[] = [];

    // Past Visits Frequency (High visit counts = high readmission chance)
    if (visits && visits.length > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentVisitsCount = visits.filter((v) => new Date(v.visitDate) >= thirtyDaysAgo).length;

      if (recentVisitsCount >= 3) {
        score += 35;
        factors.push({ factor: `${recentVisitsCount} visits in last 30 days`, weight: 35 });
        actions.push('Schedule post-discharge phone call follow-up within 48 hours.');
      } else if (recentVisitsCount >= 1) {
        score += 15;
        factors.push({ factor: 'Visit logged in last 30 days', weight: 15 });
      }
    }

    // Oxygen Saturation (Pulmonary risk)
    if (assessment.oxygenSaturation && assessment.oxygenSaturation < 94) {
      score += 25;
      factors.push({ factor: `Hypoxia (O2 Saturation: ${assessment.oxygenSaturation}%)`, weight: 25 });
      actions.push('Review eligibility for home supplemental oxygen evaluation.');
    }

    // Temperature (Infection risk)
    if (assessment.temperature && assessment.temperature >= 38.3) {
      score += 20;
      factors.push({ factor: `Fever detected (${assessment.temperature} °C)`, weight: 20 });
      actions.push('Screen for active bacterial or viral infection sources.');
    }

    // Age (Elderly)
    if (age > 75) {
      score += 15;
      factors.push({ factor: 'Geriatric patient (Age over 75)', weight: 15 });
      actions.push('Connect with social work for home care coordination assessment.');
    }

    score = Math.min(score, 100);
    const category = this.getCategory(score);
    if (score < 25) actions.push('Standard discharge plan monitoring.');

    return {
      predictionType: 'READMISSION',
      riskScore: score,
      riskCategory: category,
      confidenceScore: 0.85,
      contributingFactors: factors,
      recommendedActions: actions,
    };
  }

  // Helper calculation details
  private static calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  private static getCategory(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MODERATE';
    if (score < 75) return 'HIGH';
    return 'CRITICAL';
  }
}
