import { describe, expect, it } from 'vitest';

import {
  newPasswordSchema,
  passwordResetSchema,
  phoneVerificationCodeSchema,
  phoneVerificationRequestSchema,
  signInSchema,
  signUpSchema,
} from './auth-schemas';

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

  it('normalizes international phone numbers for SMS verification', () => {
    expect(phoneVerificationRequestSchema.parse({ phone: '+41 79 123 45 67' }).phone).toBe(
      '+41791234567',
    );
    expect(phoneVerificationRequestSchema.safeParse({ phone: '079 123 45 67' }).success).toBe(
      false,
    );
  });

  it('requires a six digit phone verification code', () => {
    expect(
      phoneVerificationCodeSchema.safeParse({ phone: '+41791234567', token: '123456' }).success,
    ).toBe(true);
    expect(
      phoneVerificationCodeSchema.safeParse({ phone: '+41791234567', token: '1234' }).success,
    ).toBe(false);
  });
});
