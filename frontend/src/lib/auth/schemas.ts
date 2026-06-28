import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Enter your email or username')
    .refine(
      (val) =>
        val.includes('@')
          ? z.string().email().safeParse(val).success
          : /^[a-zA-Z0-9._-]{3,32}$/.test(val),
      { message: 'Enter a valid email or username' },
    ),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Minimum 8 characters'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  organizationName: z.string().min(2),
  organizationNameAr: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
