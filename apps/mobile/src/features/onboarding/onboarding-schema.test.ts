import { describe, expect, it } from 'vitest';

import {
  createEmptyOnboardingDraft,
  emotionalAnswerSchema,
  identityInputSchema,
  normalizeIdentity,
  onboardingDraftSchema,
  targetWeightInputSchema,
} from './onboarding-schema';

describe('onboarding draft schema', () => {
  it('creates a valid empty versioned draft', () => {
    expect(onboardingDraftSchema.safeParse(createEmptyOnboardingDraft()).success).toBe(true);
  });

  it('drops legacy phone and self-attested guardian fields from persisted drafts', () => {
    const legacy = createEmptyOnboardingDraft() as ReturnType<typeof createEmptyOnboardingDraft> & {
      consent: ReturnType<typeof createEmptyOnboardingDraft>['consent'] & {
        guardianConfirmed: boolean;
      };
      identity: ReturnType<typeof createEmptyOnboardingDraft>['identity'] & { phone: string };
    };
    legacy.identity.phone = '+41791234567';
    legacy.consent.guardianConfirmed = true;

    const parsed = onboardingDraftSchema.parse(legacy);

    expect(parsed.identity).not.toHaveProperty('phone');
    expect(parsed.consent).not.toHaveProperty('guardianConfirmed');
  });

  it('trims and validates emotional answers', () => {
    expect(emotionalAnswerSchema.parse('  I am tired of restarting.  ')).toBe(
      'I am tired of restarting.',
    );
    expect(emotionalAnswerSchema.safeParse(' ').success).toBe(false);
  });

  it('normalizes imperial identity measurements into canonical units', () => {
    const identity = normalizeIdentity({
      ageInput: '18',
      fullName: 'Alex Stone',
      heightMajorInput: '5',
      heightMinorInput: '11',
      unitSystem: 'imperial',
      username: 'alex_stone',
      weightInput: '172',
    });

    expect(identity.heightCm).toBe(180.3);
    expect(identity.weightKg).toBe(78);
  });

  it('enforces the adult-only public beta boundary', () => {
    const result = identityInputSchema.safeParse({
      ageInput: '17',
      fullName: 'Alex Stone',
      heightMajorInput: '180',
      heightMinorInput: '',
      unitSystem: 'metric',
      username: 'alex_stone',
      weightInput: '78',
    });

    expect(result.success).toBe(false);
  });

  it('rejects imperial values that would fall outside the persisted metric bounds', () => {
    const baseIdentity = {
      ageInput: '18',
      fullName: 'Alex Stone',
      heightMajorInput: '5',
      heightMinorInput: '11',
      unitSystem: 'imperial' as const,
      username: 'alex_stone',
      weightInput: '172',
    };

    expect(
      identityInputSchema.safeParse({
        ...baseIdentity,
        heightMajorInput: '7',
        heightMinorInput: '7',
      }).success,
    ).toBe(false);
    expect(identityInputSchema.safeParse({ ...baseIdentity, weightInput: '77' }).success).toBe(
      false,
    );
    expect(
      targetWeightInputSchema.safeParse({ targetWeightInput: '77', unitSystem: 'imperial' })
        .success,
    ).toBe(false);
  });
});
