import { z } from 'zod';

import { type PlanDay, type ScheduledMission, WINTER_ARC_DURATION_DAYS } from '@winter-arc/domain';

const missionEventSchema = z.object({
  eventId: z.string(),
  missionId: z.string(),
  occurredAt: z.string(),
  type: z.literal('MISSION_COMPLETED'),
  xpDelta: z.number().int().min(0),
});

export const executionStateSchema = z.object({
  activeDay: z.number().int().min(1).max(WINTER_ARC_DURATION_DAYS),
  completedMissionIds: z.array(z.string()),
  currentMissionId: z.string().nullable(),
  currentStepIndex: z.number().int().min(0),
  events: z.array(missionEventSchema),
  missionStatus: z.enum(['idle', 'active', 'paused']),
  sealedDayNumbers: z.array(z.number().int().min(1).max(WINTER_ARC_DURATION_DAYS)).default([]),
  skippedMissionIds: z.array(z.string()),
  version: z.literal(1),
  xp: z.number().int().min(0),
});

export type ExecutionState = z.infer<typeof executionStateSchema>;

export function createEmptyExecutionState(): ExecutionState {
  return {
    activeDay: 1,
    completedMissionIds: [],
    currentMissionId: null,
    currentStepIndex: 0,
    events: [],
    missionStatus: 'idle',
    sealedDayNumbers: [],
    skippedMissionIds: [],
    version: 1,
    xp: 0,
  };
}

export function completeMissionOnce(
  state: ExecutionState,
  mission: ScheduledMission,
  occurredAt: string,
): ExecutionState {
  const eventId = `complete:${mission.scheduledId}`;
  if (
    state.completedMissionIds.includes(mission.scheduledId) ||
    state.events.some((event) => event.eventId === eventId)
  ) {
    return state;
  }

  return {
    ...state,
    completedMissionIds: [...state.completedMissionIds, mission.scheduledId],
    currentMissionId: null,
    currentStepIndex: 0,
    events: [
      ...state.events,
      {
        eventId,
        missionId: mission.scheduledId,
        occurredAt,
        type: 'MISSION_COMPLETED',
        xpDelta: mission.xp,
      },
    ],
    missionStatus: 'idle',
    skippedMissionIds: state.skippedMissionIds.filter((id) => id !== mission.scheduledId),
    xp: state.xp + mission.xp,
  };
}

export type MissionAdvanceResult = 'advanced' | 'completed' | 'missing';

export function advanceMissionStep(
  state: ExecutionState,
  mission: ScheduledMission | undefined,
  occurredAt: string,
): { result: MissionAdvanceResult; state: ExecutionState } {
  if (!mission || state.currentMissionId !== mission.scheduledId) {
    return { result: 'missing', state };
  }

  if (state.currentStepIndex < mission.steps.length - 1) {
    return {
      result: 'advanced',
      state: { ...state, currentStepIndex: state.currentStepIndex + 1 },
    };
  }

  return {
    result: 'completed',
    state: completeMissionOnce(state, mission, occurredAt),
  };
}

export function isMissionResolved(state: ExecutionState, missionId: string): boolean {
  return (
    state.completedMissionIds.includes(missionId) || state.skippedMissionIds.includes(missionId)
  );
}

export function sealExecutionDay(
  state: ExecutionState,
  day: PlanDay | undefined,
): { sealed: boolean; state: ExecutionState } {
  if (
    !day ||
    day.day !== state.activeDay ||
    state.sealedDayNumbers.includes(day.day) ||
    !day.missions.every((mission) => isMissionResolved(state, mission.scheduledId))
  ) {
    return { sealed: false, state };
  }

  return {
    sealed: true,
    state: {
      ...state,
      activeDay: Math.min(state.activeDay + 1, WINTER_ARC_DURATION_DAYS),
      currentMissionId: null,
      currentStepIndex: 0,
      missionStatus: 'idle',
      sealedDayNumbers: [...state.sealedDayNumbers, day.day],
    },
  };
}
