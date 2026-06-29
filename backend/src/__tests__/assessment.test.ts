import { createAssessmentSchema, updateAssessmentSchema } from '../validators/clinical.validator';

describe('Clinical Assessment Validator Range Tests', () => {
  it('should validate core vital ranges and accept correct inputs', () => {
    const validPayload = {
      patientId: 'e032df49-390a-451f-8b45-3c53b78a1be4',
      date: new Date(),
      heartRate: 85,
      bloodPressureSystolic: 125,
      bloodPressureDiastolic: 82,
      bloodSugar: 105,
      oxygenSaturation: 97,
      temperature: 37.1,
      weight: 75.5,
      height: 180,
      status: 'COMPLETED',
    };

    const res = createAssessmentSchema.safeParse(validPayload);
    expect(res.success).toBe(true);
  });

  it('should reject invalid values outside constraints', () => {
    const invalidPayload = {
      patientId: 'not-a-uuid',
      heartRate: 15, // minimum is 20
      bloodPressureSystolic: 350, // maximum is 300
      oxygenSaturation: 105, // maximum is 100
      temperature: 20, // minimum is 25
      weight: 600, // maximum is 500
      height: 400, // maximum is 300
      status: 'INVALID_STATUS', // not in enum
    };

    const res = createAssessmentSchema.safeParse(invalidPayload);
    expect(res.success).toBe(false);
    if (!res.success) {
      const errorMap = res.error.issues.map((i) => i.path[0]);
      expect(errorMap).toContain('patientId');
      expect(errorMap).toContain('heartRate');
      expect(errorMap).toContain('bloodPressureSystolic');
      expect(errorMap).toContain('oxygenSaturation');
      expect(errorMap).toContain('temperature');
      expect(errorMap).toContain('weight');
      expect(errorMap).toContain('height');
      expect(errorMap).toContain('status');
    }
  });

  it('should support optional and partial updates', () => {
    const partialPayload = {
      heartRate: 90,
      status: 'REVIEWED',
    };

    const res = updateAssessmentSchema.safeParse(partialPayload);
    expect(res.success).toBe(true);
  });
});
