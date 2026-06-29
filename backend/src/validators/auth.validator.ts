import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  hospitalName: z.string().min(2, 'Hospital name must be at least 2 characters'),
  hospitalSlug: z.string()
    .min(2, 'Hospital slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric, with hyphens only'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
