import { describe, expect, it } from 'vitest';

import { newPasswordSchema, passwordResetSchema, signInSchema, signUpSchema } from './auth-schemas';

describe('authentication schemas', () => {
  it('normalizes email addresses', () => {
    expect(signInSchema.parse({ email: ' Recruit@Example.COM ', password: 'secret' }).email).toBe(
      'recruit@example.com',
    );
  });

  it('requires a strong matching password and explicit consent', () => {
    expect(
      signUpSchema.safeParse({
        acceptedTerms: false,
        confirmPassword: 'weak',
        email: 'recruit@example.com',
        fullName: 'Recruit',
        password: 'weak',
      }).success,
    ).toBe(false);
  });

  it('accepts a complete sign-up payload', () => {
    expect(
      signUpSchema.safeParse({
        acceptedTerms: true,
        confirmPassword: 'WinterArc90',
        email: 'recruit@example.com',
        fullName: 'Recruit One',
        password: 'WinterArc90',
      }).success,
    ).toBe(true);
  });

  it('validates password-reset email input', () => {
    expect(passwordResetSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('requires matching strong replacement passwords', () => {
    expect(
      newPasswordSchema.safeParse({
        confirmPassword: 'WinterArc91',
        password: 'WinterArc90',
      }).success,
    ).toBe(false);
  });
});
