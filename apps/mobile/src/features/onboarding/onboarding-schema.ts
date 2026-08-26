import { z } from 'zod';

import {
  MAX_HEIGHT_CM,
  MAX_USER_AGE,
  MAX_WEIGHT_KG,
  MIN_HEIGHT_CM,
  MIN_USER_AGE,
  MIN_WEIGHT_KG,
} from '@winter-arc/domain';

import { emotionalQuestions, type EmotionalQuestionId } from './questions';

export const onboardingSections = [
  'emotional',
  'identity',
  'situation',
  'activity',
  'physical',
  'relationship',
  'mainGoal',
  'targetBuild',
  'targetWeight',
  'confidence',
  'career',
  'relationshipGoal',
  'review',
  'planPreview',
] as const;

export type OnboardingSection = (typeof onboardingSections)[number];
export type UnitSystem = 'metric' | 'imperial';

export const emotionalAnswerSchema = z
  .string()
  .trim()
  .min(2, 'Write at least a few words.')
  .max(360);

const emotionalAnswersSchema = z.object(
  Object.fromEntries(
    emotionalQuestions.map((question) => [question.id, z.string().max(360)]),
  ) as Record<EmotionalQuestionId, z.ZodString>,
);

export const identityInputSchema = z
  .object({
    ageInput: z.string().trim(),
    fullName: z.string().trim().min(2, 'Enter your name.').max(60),
    heightMajorInput: z.string().trim(),
    heightMinorInput: z.string().trim(),
    unitSystem: z.enum(['metric', 'imperial']),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Use at least 3 characters.')
      .max(24, 'Use 24 characters or fewer.')
      .regex(/^[a-z0-9_]+$/, 'Use only letters, numbers, and underscores.'),
    weightInput: z.string().trim(),
  })
  .superRefine((input, context) => {
    const age = Number(input.ageInput);
    if (!Number.isInteger(age) || age < MIN_USER_AGE || age > MAX_USER_AGE) {
      context.addIssue({
        code: 'custom',
        message: 'Enter an age from 14 to 100.',
        path: ['ageInput'],
      });
    }

    const majorHeight = Number(input.heightMajorInput);
    const minorHeight = Number(input.heightMinorInput || '0');
    const weight = Number(input.weightInput);

    if (input.unitSystem === 'metric') {
      if (
        !Number.isFinite(majorHeight) ||
        majorHeight < MIN_HEIGHT_CM ||
        majorHeight > MAX_HEIGHT_CM
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Enter a height from 120 to 230 cm.',
          path: ['heightMajorInput'],
        });
      }
      if (!Number.isFinite(weight) || weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
        context.addIssue({
          code: 'custom',
          message: 'Enter a weight from 35 to 250 kg.',
          path: ['weightInput'],
        });
      }
      return;
    }

    if (!Number.isInteger(majorHeight) || majorHeight < 4 || majorHeight > 7) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a height from 4 to 7 ft.',
        path: ['heightMajorInput'],
      });
    }
    if (!Number.isInteger(minorHeight) || minorHeight < 0 || minorHeight > 11) {
      context.addIssue({
        code: 'custom',
        message: 'Enter inches from 0 to 11.',
        path: ['heightMinorInput'],
      });
    }
    const heightCm = (majorHeight * 12 + minorHeight) * 2.54;
    if (
      Number.isInteger(majorHeight) &&
      Number.isInteger(minorHeight) &&
      (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a combined height that converts to 120–230 cm.',
        path: ['heightMinorInput'],
      });
    }
    if (!Number.isFinite(weight) || weight < 78 || weight > 551) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a weight from 78 to 551 lb.',
        path: ['weightInput'],
      });
    }
  });

export type IdentityInput = z.input<typeof identityInputSchema>;

const identityAnswersSchema = z.object({
  age: z.number().int().min(MIN_USER_AGE).max(MAX_USER_AGE).nullable(),
  ageInput: z.string().max(3),
  fullName: z.string().max(60),
  heightCm: z.number().min(MIN_HEIGHT_CM).max(MAX_HEIGHT_CM).nullable(),
  heightMajorInput: z.string().max(8),
  heightMinorInput: z.string().max(2),
  unitSystem: z.enum(['metric', 'imperial']),
  username: z.string().max(24),
  weightInput: z.string().max(8),
  weightKg: z.number().min(MIN_WEIGHT_KG).max(MAX_WEIGHT_KG).nullable(),
});

export type IdentityAnswers = z.infer<typeof identityAnswersSchema>;

export function normalizeIdentity(input: IdentityInput): IdentityAnswers {
  const valid = identityInputSchema.parse(input);
  const heightCm =
    valid.unitSystem === 'metric'
      ? Number(valid.heightMajorInput)
      : (Number(valid.heightMajorInput) * 12 + Number(valid.heightMinorInput || '0')) * 2.54;
  const weightKg =
    valid.unitSystem === 'metric'
      ? Number(valid.weightInput)
      : Number(valid.weightInput) * 0.45359237;

  return {
    ...valid,
    age: Number(valid.ageInput),
    heightCm: Math.round(heightCm * 10) / 10,
    weightKg: Math.round(weightKg * 10) / 10,
  };
}

export const workStatuses = [
  'student',
  'employed',
  'selfEmployed',
  'businessOwner',
  'betweenRoles',
  'other',
] as const;
export type WorkStatus = (typeof workStatuses)[number];

export const situationInputSchema = z.object({
  workDetail: z.string().trim().max(80),
  workStatus: z.enum(workStatuses),
});

const situationDraftSchema = z.object({
  workDetail: z.string().max(80),
  workStatus: z.enum(workStatuses).nullable(),
});

export const gymAccessOptions = ['member', 'home', 'outdoor', 'none'] as const;
export type GymAccess = (typeof gymAccessOptions)[number];

export const activityInputSchema = z
  .object({
    gymAccess: z.enum(gymAccessOptions),
    hoursPerWeekInput: z.string().trim(),
    sport: z.string().trim().max(60),
  })
  .superRefine((input, context) => {
    const hours = Number(input.hoursPerWeekInput);
    if (!Number.isFinite(hours) || hours < 0 || hours > 40) {
      context.addIssue({
        code: 'custom',
        message: 'Enter weekly training hours from 0 to 40.',
        path: ['hoursPerWeekInput'],
      });
    }
  });

const activityDraftSchema = z.object({
  gymAccess: z.enum(gymAccessOptions).nullable(),
  hoursPerWeek: z.number().min(0).max(40).nullable(),
  hoursPerWeekInput: z.string(),
  sport: z.string().max(60),
});

export const buildProfiles = ['starting', 'average', 'athletic', 'defined'] as const;
export type BuildProfile = (typeof buildProfiles)[number];

export const physicalInputSchema = z.object({
  currentBuild: z.enum(buildProfiles),
});

const physicalDraftSchema = z.object({
  currentBuild: z.enum(buildProfiles).nullable(),
});

export const relationshipStatuses = [
  'single',
  'interested',
  'dating',
  'committed',
  'married',
] as const;
export type RelationshipStatus = (typeof relationshipStatuses)[number];

export const relationshipInputSchema = z.object({
  status: z.enum(relationshipStatuses),
});

const relationshipDraftSchema = z.object({
  status: z.enum(relationshipStatuses).nullable(),
});

export const mainGoalInputSchema = z
  .string()
  .trim()
  .min(10, 'Describe the result you want in a little more detail.')
  .max(360);

export const targetBuilds = ['lean', 'athletic', 'muscular', 'defined'] as const;
export type TargetBuild = (typeof targetBuilds)[number];

export const targetBuildInputSchema = z.object({ targetBuild: z.enum(targetBuilds) });

export const targetWeightInputSchema = z
  .object({
    targetWeightInput: z.string().trim(),
    unitSystem: z.enum(['metric', 'imperial']),
  })
  .superRefine((input, context) => {
    const weight = Number(input.targetWeightInput);
    const valid =
      input.unitSystem === 'metric'
        ? Number.isFinite(weight) && weight >= MIN_WEIGHT_KG && weight <= MAX_WEIGHT_KG
        : Number.isFinite(weight) && weight >= 78 && weight <= 551;
    if (!valid) {
      context.addIssue({
        code: 'custom',
        message:
          input.unitSystem === 'metric'
            ? 'Enter a target from 35 to 250 kg.'
            : 'Enter a target from 78 to 551 lb.',
        path: ['targetWeightInput'],
      });
    }
  });

export function normalizeTargetWeight(input: {
  targetWeightInput: string;
  unitSystem: UnitSystem;
}): number {
  const valid = targetWeightInputSchema.parse(input);
  const kilograms =
    valid.unitSystem === 'metric'
      ? Number(valid.targetWeightInput)
      : Number(valid.targetWeightInput) * 0.45359237;
  return Math.round(kilograms * 10) / 10;
}

export const confidenceGoals = [
  'socialConfidence',
  'conversation',
  'dating',
  'discipline',
  'calm',
] as const;
export type ConfidenceGoal = (typeof confidenceGoals)[number];
export const confidenceInputSchema = z
  .array(z.enum(confidenceGoals))
  .min(1, 'Choose at least one focus.')
  .max(2, 'Choose up to two focuses.');

export const careerGoals = [
  'education',
  'strongSalary',
  'entrepreneur',
  'businessOwner',
  'careerChange',
  'skillBuilding',
] as const;
export type CareerGoal = (typeof careerGoals)[number];
export const careerInputSchema = z.enum(careerGoals);

export const relationshipGoals = [
  'selfFocus',
  'approach',
  'date',
  'relationship',
  'strengthen',
] as const;
export type RelationshipGoal = (typeof relationshipGoals)[number];
export const relationshipGoalInputSchema = z.enum(relationshipGoals);

const goalsDraftSchema = z.object({
  careerGoal: z.enum(careerGoals).nullable(),
  confidenceGoals: z.array(z.enum(confidenceGoals)).max(2),
  mainGoal: z.string().max(360),
  relationshipGoal: z.enum(relationshipGoals).nullable(),
  targetBuild: z.enum(targetBuilds).nullable(),
  targetWeightInput: z.string().max(8),
  targetWeightKg: z.number().min(MIN_WEIGHT_KG).max(MAX_WEIGHT_KG).nullable(),
});

const onboardingDraftV2Schema = z.object({
  activity: activityDraftSchema,
  consent: z
    .object({
      confirmedAt: z.string().nullable(),
      generalConfirmed: z.boolean(),
    })
    .default({ confirmedAt: null, generalConfirmed: false }),
  emotionalAnswers: emotionalAnswersSchema,
  emotionalIndex: z
    .number()
    .int()
    .min(0)
    .max(emotionalQuestions.length - 1),
  goals: goalsDraftSchema,
  identity: identityAnswersSchema,
  physical: physicalDraftSchema,
  relationship: relationshipDraftSchema,
  section: z.enum(onboardingSections),
  situation: situationDraftSchema,
  updatedAt: z.string(),
  version: z.literal(2),
});

export const onboardingDraftSchema = onboardingDraftV2Schema;
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export function createEmptyOnboardingDraft(): OnboardingDraft {
  return {
    activity: {
      gymAccess: null,
      hoursPerWeek: null,
      hoursPerWeekInput: '',
      sport: '',
    },
    consent: {
      confirmedAt: null,
      generalConfirmed: false,
    },
    emotionalAnswers: {
      brokenPromise: '',
      dayNinety: '',
      holdingBack: '',
      oneYearCost: '',
      startingNow: '',
    },
    emotionalIndex: 0,
    goals: {
      careerGoal: null,
      confidenceGoals: [],
      mainGoal: '',
      relationshipGoal: null,
      targetBuild: null,
      targetWeightInput: '',
      targetWeightKg: null,
    },
    identity: {
      age: null,
      ageInput: '',
      fullName: '',
      heightCm: null,
      heightMajorInput: '',
      heightMinorInput: '',
      unitSystem: 'metric',
      username: '',
      weightInput: '',
      weightKg: null,
    },
    physical: {
      currentBuild: null,
    },
    relationship: {
      status: null,
    },
    section: 'emotional',
    situation: {
      workDetail: '',
      workStatus: null,
    },
    updatedAt: new Date(0).toISOString(),
    version: 2,
  };
}
