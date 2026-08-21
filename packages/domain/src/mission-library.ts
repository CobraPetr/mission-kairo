import { missionTemplateSchema } from './schemas';
import type { MissionTemplate } from './models';

function mission(template: MissionTemplate): MissionTemplate {
  return missionTemplateSchema.parse(template);
}

export const missionLibrary = {
  baselineWalk: mission({
    id: 'physical.baseline-walk',
    title: 'Baseline movement',
    category: 'physical',
    durationMinutes: 20,
    intensity: 'low',
    minAge: 14,
    xp: 60,
    steps: [
      { id: 'timer', instruction: 'Set a 20-minute timer.', order: 1 },
      { id: 'walk', instruction: 'Walk at a deliberate, comfortable pace.', order: 2 },
      { id: 'record', instruction: 'Return and record honest completion.', order: 3 },
    ],
  }),
  bodyweightCircuit: mission({
    id: 'physical.bodyweight-circuit',
    title: 'Controlled bodyweight circuit',
    category: 'physical',
    durationMinutes: 24,
    intensity: 'moderate',
    minAge: 14,
    xp: 80,
    steps: [
      { id: 'warmup', instruction: 'Complete five minutes of easy movement.', order: 1 },
      { id: 'circuit', instruction: 'Complete three controlled full-body rounds.', order: 2 },
      { id: 'stop', instruction: 'Stop if pain, dizziness, or unsafe symptoms appear.', order: 3 },
    ],
  }),
  gymFoundation: mission({
    id: 'physical.gym-foundation',
    title: 'Foundation strength session',
    category: 'physical',
    durationMinutes: 40,
    intensity: 'moderate',
    minAge: 14,
    xp: 110,
    steps: [
      { id: 'warmup', instruction: 'Warm up for five minutes.', order: 1 },
      {
        id: 'sets',
        instruction: 'Complete the assigned full-body movements with controlled form.',
        order: 2,
      },
      {
        id: 'record',
        instruction: 'Record effort and leave two safe repetitions in reserve.',
        order: 3,
      },
    ],
  }),
  standardJournal: mission({
    id: 'mindset.standard-journal',
    title: 'Write the standard',
    category: 'mindset',
    durationMinutes: 8,
    intensity: 'low',
    minAge: 14,
    xp: 45,
    steps: [
      {
        id: 'write',
        instruction: 'Write the one action that proves your standard today.',
        order: 1,
      },
      { id: 'schedule', instruction: 'Assign it a specific time and place.', order: 2 },
    ],
  }),
  postureReset: mission({
    id: 'presence.posture-reset',
    title: 'Posture reset',
    category: 'presence',
    durationMinutes: 5,
    intensity: 'low',
    minAge: 14,
    xp: 35,
    steps: [
      { id: 'reset', instruction: 'Complete five slow posture and breathing resets.', order: 1 },
      {
        id: 'walk',
        instruction: 'Walk for two minutes with deliberate eye line and pace.',
        order: 2,
      },
    ],
  }),
  recoveryWalk: mission({
    id: 'recovery.walk',
    title: 'Recovery movement',
    category: 'recovery',
    durationMinutes: 20,
    intensity: 'low',
    minAge: 14,
    xp: 45,
    steps: [
      {
        id: 'walk',
        instruction: 'Move gently for twenty minutes without performance pressure.',
        order: 1,
      },
      { id: 'check', instruction: 'Record energy and soreness honestly.', order: 2 },
    ],
  }),
  weeklyReview: mission({
    id: 'mindset.weekly-review',
    title: 'Weekly debrief',
    category: 'mindset',
    durationMinutes: 12,
    intensity: 'low',
    minAge: 14,
    xp: 60,
    steps: [
      {
        id: 'evidence',
        instruction: 'Review completed and missed orders without judgment.',
        order: 1,
      },
      { id: 'adjust', instruction: 'Choose one realistic adjustment for next week.', order: 2 },
    ],
  }),
  checkpoint: mission({
    id: 'checkpoint.review',
    title: 'Protocol checkpoint',
    category: 'checkpoint',
    durationMinutes: 18,
    intensity: 'low',
    minAge: 14,
    xp: 100,
    steps: [
      {
        id: 'measure',
        instruction: 'Record current measurements and private progress evidence.',
        order: 1,
      },
      { id: 'compare', instruction: 'Compare behavior trends, not appearance alone.', order: 2 },
      { id: 'adjust', instruction: 'Confirm or revise the next phase target.', order: 3 },
    ],
  }),
  careerFocus: mission({
    id: 'career.focus-block',
    title: 'Career focus block',
    category: 'career',
    durationMinutes: 25,
    intensity: 'moderate',
    minAge: 14,
    xp: 75,
    steps: [
      { id: 'target', instruction: 'Choose one useful work or education outcome.', order: 1 },
      {
        id: 'focus',
        instruction: 'Work on it without switching tasks for twenty minutes.',
        order: 2,
      },
      { id: 'record', instruction: 'Record the concrete output produced.', order: 3 },
    ],
  }),
  socialRepetition: mission({
    id: 'relationship.social-repetition',
    title: 'One honest interaction',
    category: 'relationship',
    durationMinutes: 10,
    intensity: 'low',
    minAge: 14,
    xp: 55,
    steps: [
      { id: 'choose', instruction: 'Choose one safe, ordinary social interaction.', order: 1 },
      { id: 'speak', instruction: 'Start with a genuine question or observation.', order: 2 },
      { id: 'reflect', instruction: 'Record what happened without scoring your worth.', order: 3 },
    ],
  }),
} as const;

export type MissionLibraryKey = keyof typeof missionLibrary;
