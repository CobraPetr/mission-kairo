import { z } from 'zod';

import { normalizePhoneNumber } from './phone-number';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.'));

const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .regex(/[a-z]/, 'Add one lowercase letter.')
  .regex(/[A-Z]/, 'Add one uppercase letter.')
  .regex(/[0-9]/, 'Add one number.');

const phoneNumberSchema = z
  .string()
  .trim()
  .transform(normalizePhoneNumber)
  .pipe(
    z.string().regex(/^\+[1-9][0-9]{7,14}$/, 'Use an international number, e.g. +41 79 123 45 67.'),
  );

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z
  .object({
    acceptedTerms: z.literal(true, { error: 'Accept the terms and privacy policy to continue.' }),
    confirmPassword: z.string(),
    email: emailSchema,
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your name.')
      .max(80, 'Keep your name under 80 characters.'),
    password: passwordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const passwordResetSchema = z.object({ email: emailSchema });

export const phoneVerificationRequestSchema = z.object({ phone: phoneNumberSchema });

export const phoneVerificationCodeSchema = z.object({
  phone: phoneNumberSchema,
  token: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Enter the 6-digit code.'),
});

export const newPasswordSchema = z
  .object({
    confirmPassword: z.string(),
    password: passwordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export function getFieldIssue(error: z.ZodError, field: string): string | undefined {
  return error.issues.find((issue) => issue.path[0] === field)?.message;
}
