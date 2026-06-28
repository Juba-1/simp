import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  nameAr: z.string().optional(),
  code: z
    .string()
    .min(2, 'Project code must be at least 2 characters')
    .max(32)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Code may only contain letters, numbers, hyphens, and underscores',
    ),
  description: z.string().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
