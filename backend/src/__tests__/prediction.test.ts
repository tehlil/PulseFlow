import { PredictionService } from '../services/prediction.service';
import { prisma } from '../config/db';

// Mock the prisma client
jest.mock('../config/db', () => ({
  prisma: {
    assessment: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Prediction Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should evaluate Diabetes risk correctly based on BMI and Blood Sugar', async () => {
    const mockDob = new Date();
    mockDob.setFullYear(mockDob.getFullYear() - 50); // 50 years old (Age > 45: +10 pts)

    const mockAssessment = {
      id: 'assessment-uuid',
      patientId: 'patient-uuid',
      bmi: 32, // Obesity (BMI > 30: +20 pts)
      bloodSugar: 160, // Elevated glucose (Blood Sugar > 140: +25 pts)
      heartRate: 75,
      temperature: 36.6,
      oxygenSaturation: 99,
      symptoms: [{ name: 'Polyuria', severity: 'MODERATE' }], // Polyuria (Polyuria: +15 pts)
      labValues: { hbA1c: 6.8 }, // HbA1c diabetic (HbA1c >= 6.5: +30 pts)
      patient: {
        id: 'patient-uuid',
        dateOfBirth: mockDob,
        visits: [],
      },
    };

    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

    const predictions = await PredictionService.evaluateAssessment('assessment-uuid');
    
    // Find the diabetes prediction
    const diabetesPred = predictions.find(p => p.predictionType === 'DIABETES');
    expect(diabetesPred).toBeDefined();
    
    // Expected score details:
    // Age (50 > 45) -> 10 pts
    // Obesity (BMI 32 >= 30) -> 20 pts
    // Elevated glucose (160 > 140) -> 25 pts
    // HbA1c (6.8 >= 6.5) -> 30 pts
    // Symptom Polyuria -> 15 pts
    // Total = 100 (capped)
    expect(diabetesPred?.riskScore).toBe(100);
    expect(diabetesPred?.riskCategory).toBe('CRITICAL');
  });

  it('should evaluate Cardiovascular risk correctly based on blood pressure and symptoms', async () => {
    const mockDob = new Date();
    mockDob.setFullYear(mockDob.getFullYear() - 65); // 65 years old (Age > 60: +15 pts)

    const mockAssessment = {
      id: 'assessment-uuid',
      patientId: 'patient-uuid',
      bmi: 24,
      bloodPressureSystolic: 150, // Hypertensive BP (BP > 140/90: +25 pts)
      bloodPressureDiastolic: 95,
      heartRate: 105, // Tachycardia (HR > 100: +10 pts)
      temperature: 36.6,
      oxygenSaturation: 98,
      symptoms: [{ name: 'Chest Pain', severity: 'HIGH' }], // Chest Pain (Chest Pain: +30 pts)
      labValues: { cholesterolTotal: 260 }, // Cholesterol > 240 (+20 pts)
      patient: {
        id: 'patient-uuid',
        dateOfBirth: mockDob,
        visits: [],
      },
    };

    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

    const predictions = await PredictionService.evaluateAssessment('assessment-uuid');
    
    const cardioPred = predictions.find(p => p.predictionType === 'CARDIOVASCULAR');
    expect(cardioPred).toBeDefined();
    
    // Expected score details:
    // Age (65 > 60) -> 15 pts
    // BP 150/95 -> 25 pts
    // HR 105 -> 10 pts
    // Cholesterol 260 -> 20 pts
    // Symptom Chest Pain -> 30 pts
    // Total = 100 (capped)
    expect(cardioPred?.riskScore).toBe(100);
    expect(cardioPred?.riskCategory).toBe('CRITICAL');
  });
});
