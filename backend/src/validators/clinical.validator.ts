import { z } from 'zod';

export const createAssessmentSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  date: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()).optional().nullable(),
  heartRate: z.number().int().min(20).max(300).optional().nullable(),
  bloodPressureSystolic: z.number().int().min(40).max(300).optional().nullable(),
  bloodPressureDiastolic: z.number().int().min(30).max(200).optional().nullable(),
  bloodSugar: z.number().int().min(10).max(1000).optional().nullable(), // Blood glucose mg/dL
  oxygenSaturation: z.number().int().min(10).max(100).optional().nullable(),
  temperature: z.number().min(25).max(48).optional().nullable(), // Celsius
  weight: z.number().min(1).max(500).optional().nullable(),
  height: z.number().min(10).max(300).optional().nullable(),
  bmi: z.number().min(5).max(100).optional().nullable(),
  status: z.enum(['DRAFT', 'COMPLETED', 'REVIEWED', 'ARCHIVED']).default('DRAFT'),
  symptoms: z.array(
    z.object({
      name: z.string(),
      severity: z.enum(['LOW', 'MODERATE', 'HIGH']),
    })
  ).optional().default([]),
  labValues: z.object({
    hbA1c: z.number().optional(), // Diabetes biomarker
    cholesterolTotal: z.number().optional(), // Cardio biomarker
    ldl: z.number().optional(),
    hdl: z.number().optional(),
    creatinine: z.number().optional(),
  }).optional().default({}),
  notes: z.string().optional().nullable(),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();

export const createVisitSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  visitDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date({
    required_error: 'Visit date is required',
  })),
  reason: z.string().min(1, 'Reason for visit is required'),
  notes: z.string().optional().nullable(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
