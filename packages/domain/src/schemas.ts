import { z } from 'zod';

export const missionStepSchema = z.object({
  id: z.string().min(1).max(80),
  instruction: z.string().min(3).max(240),
  order: z.number().int().min(1).max(12),
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
  durationMinutes: z.number().int().min(2).max(45),
  id: z.string().min(2).max(80),
  intensity: z.enum(['low', 'moderate', 'high']),
  minAge: z.number().int().min(14).max(18),
  steps: z.array(missionStepSchema).min(1).max(12),
  title: z.string().min(3).max(80),
  xp: z.number().int().min(10).max(250),
});

export const planAssessmentSchema = z.object({
  age: z.number().int().min(14).max(100),
  careerGoal: z.string().trim().min(1).max(60),
  confidenceGoals: z.array(z.string().trim().min(1).max(60)).min(1).max(2),
  currentBuild: z.enum(['starting', 'average', 'athletic', 'defined']),
  currentWeightKg: z.number().min(35).max(250),
  gymAccess: z.enum(['member', 'home', 'outdoor', 'none']),
  hoursPerWeek: z.number().min(0).max(40),
  mainGoal: z.string().trim().min(10).max(360),
  relationshipGoal: z.enum(['selfFocus', 'approach', 'date', 'relationship', 'strengthen']),
  targetBuild: z.enum(['lean', 'athletic', 'muscular', 'defined']),
  targetWeightKg: z.number().min(35).max(250),
});

export const scheduledMissionSchema = missionTemplateSchema.extend({
  scheduledId: z.string().min(3).max(120),
  source: z.enum(['core', 'personalized']),
});

export const planDaySchema = z.object({
  day: z.number().int().min(1).max(90),
  kind: z.enum(['training', 'recovery', 'checkpoint']),
  missions: z.array(scheduledMissionSchema).min(2).max(3),
});

export const winterArcPlanSchema = z.object({
  baseTrack: z.enum(['foundation', 'bodyRecomp', 'athletic', 'definition']),
  days: z.array(planDaySchema).length(90),
  durationDays: z.literal(90),
  planId: z.string().regex(/^wa_[a-z0-9]{8}$/),
  version: z.literal(1),
});
