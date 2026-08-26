import { z } from 'zod';

import {
  MAX_DAILY_MISSIONS,
  MAX_MISSION_DURATION_MINUTES,
  MAX_MISSION_STEPS,
  MAX_MISSION_XP,
  MAX_USER_AGE,
  MAX_WEIGHT_KG,
  MIN_DAILY_MISSIONS,
  MIN_MISSION_DURATION_MINUTES,
  MIN_MISSION_STEPS,
  MIN_MISSION_XP,
  MIN_USER_AGE,
  MIN_WEIGHT_KG,
  PLAN_SEED_VERSION,
  WINTER_ARC_DURATION_DAYS,
} from './models.ts';

export const missionStepSchema = z.object({
  id: z.string().min(1).max(80),
  instruction: z.string().min(3).max(240),
  order: z.number().int().min(MIN_MISSION_STEPS).max(MAX_MISSION_STEPS),
});

export const missionTemplateSchema = z.object({
  category: z.enum([
    'physical',
    'mindset',
    'presence',
    'career',
    'relationship',
    'recovery',
    'checkpoint',
  ]),
  durationMinutes: z
    .number()
    .int()
    .min(MIN_MISSION_DURATION_MINUTES)
    .max(MAX_MISSION_DURATION_MINUTES),
  id: z.string().min(2).max(80),
  intensity: z.enum(['low', 'moderate', 'high']),
  minAge: z.number().int().min(MIN_USER_AGE).max(18),
  steps: z.array(missionStepSchema).min(MIN_MISSION_STEPS).max(MAX_MISSION_STEPS),
  title: z.string().min(3).max(80),
  xp: z.number().int().min(MIN_MISSION_XP).max(MAX_MISSION_XP),
});

export const planAssessmentSchema = z.object({
  age: z.number().int().min(MIN_USER_AGE).max(MAX_USER_AGE),
  careerGoal: z.string().trim().min(1).max(60),
  confidenceGoals: z.array(z.string().trim().min(1).max(60)).min(1).max(2),
  currentBuild: z.enum(['starting', 'average', 'athletic', 'defined']),
  currentWeightKg: z.number().min(MIN_WEIGHT_KG).max(MAX_WEIGHT_KG),
  gymAccess: z.enum(['member', 'home', 'outdoor', 'none']),
  hoursPerWeek: z.number().min(0).max(40),
  mainGoal: z.string().trim().min(10).max(360),
  relationshipGoal: z.enum(['selfFocus', 'approach', 'date', 'relationship', 'strengthen']),
  targetBuild: z.enum(['lean', 'athletic', 'muscular', 'defined']),
  targetWeightKg: z.number().min(MIN_WEIGHT_KG).max(MAX_WEIGHT_KG),
});

export const scheduledMissionSchema = missionTemplateSchema.extend({
  scheduledId: z.string().min(3).max(120),
  source: z.enum(['core', 'personalized']),
});

export const planDaySchema = z.object({
  day: z.number().int().min(1).max(WINTER_ARC_DURATION_DAYS),
  kind: z.enum(['training', 'recovery', 'checkpoint']),
  missions: z.array(scheduledMissionSchema).min(MIN_DAILY_MISSIONS).max(MAX_DAILY_MISSIONS),
});

const planManifestSchema = z.object({
  baseTrack: z.enum(['foundation', 'bodyRecomp', 'athletic', 'definition']),
  days: z.array(planDaySchema).length(WINTER_ARC_DURATION_DAYS),
  durationDays: z.literal(WINTER_ARC_DURATION_DAYS),
  planId: z.string().regex(/^wa_[a-z0-9]{8}$/),
});

export const winterArcPlanSchema = z.discriminatedUnion('version', [
  planManifestSchema.extend({ version: z.literal(1) }),
  planManifestSchema.extend({ seedVersion: z.literal(PLAN_SEED_VERSION), version: z.literal(2) }),
]);

export const protocolActivationRequestSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  assessment: planAssessmentSchema,
  schemaVersion: z.literal(2),
  termsAcceptedAt: z.iso.datetime({ offset: true }),
  termsVersion: z.string().trim().min(1).max(64),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/),
});

export const protocolActivationResponseSchema = z.object({
  executionRevision: z.number().int().positive(),
  planId: z.uuid(),
  planKey: z.string().regex(/^wa_[a-z0-9]{8}$/),
});
