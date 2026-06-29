import { z } from 'zod';

export const createPatientSchema = z.object({
  mrn: z.string().min(3, 'Medical Record Number (MRN) is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date({
    required_error: 'Date of birth is required',
  })),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
