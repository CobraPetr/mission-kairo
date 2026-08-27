import { missionLibrary, type ScheduledMission } from '@winter-arc/domain';
import { describe, expect, it } from 'vitest';

import {
  advanceMissionStep,
  canSealExecutionDay,
  completeMissionOnce,
  createEmptyExecutionState,
  sealExecutionDay,
} from './execution-state';

const mission: ScheduledMission = {
  ...missionLibrary.baselineWalk,
  scheduledId: 'wa_test.01.physical.baseline-walk.core',
  source: 'core',
};

describe('mission completion', () => {
  it('creates one append-only event and awards XP once', () => {
    const first = completeMissionOnce(
      createEmptyExecutionState(),
      mission,
      '2026-08-20T12:00:00.000Z',
    );
    const duplicate = completeMissionOnce(first, mission, '2026-08-20T12:01:00.000Z');

    expect(first.xp).toBe(mission.xp);
    expect(first.events).toHaveLength(1);
    expect(duplicate).toBe(first);
  });

  it('advances from current state and cannot move beyond the final step', () => {
    const active = {
      ...createEmptyExecutionState(),
      currentMissionId: mission.scheduledId,
      missionStatus: 'active' as const,
    };
    const transitions = Array.from({ length: mission.steps.length }).reduce<
      ReturnType<typeof advanceMissionStep>[]
    >((history) => {
      const current = history.at(-1)?.state ?? active;
      return [
        ...history,
        advanceMissionStep(current, mission, `2026-08-20T12:0${history.length}:00.000Z`),
      ];
    }, []);
    const first = transitions[0];
    const final = transitions.at(-1);

    expect(first?.result).toBe('advanced');
    expect(final?.result).toBe('completed');
    expect(final?.state.currentStepIndex).toBe(0);
    expect(final?.state.completedMissionIds).toContain(mission.scheduledId);
  });

  it('allows a day to be sealed when every mission is completed or skipped', () => {
    const secondMission = { ...mission, scheduledId: 'wa_test.01.mindset.second.core' };
    const state = {
      ...createEmptyExecutionState(),
      completedMissionIds: [mission.scheduledId],
      skippedMissionIds: [secondMission.scheduledId],
    };
    const result = sealExecutionDay(state, {
      day: 1,
      kind: 'training',
      missions: [mission, secondMission],
    });

    expect(result.sealed).toBe(true);
    expect(result.state.activeDay).toBe(2);
    expect(result.state.sealedDayNumbers).toEqual([1]);
  });

  it('records a sealed day only once, including day 90', () => {
    const state = {
      ...createEmptyExecutionState(),
      activeDay: 90,
      completedMissionIds: [mission.scheduledId],
    };
    const day = { day: 90, kind: 'checkpoint' as const, missions: [mission] };
    expect(canSealExecutionDay(state, day)).toBe(true);
    const first = sealExecutionDay(state, day);
    const duplicate = sealExecutionDay(first.state, day);

    expect(first.sealed).toBe(true);
    expect(first.state.sealedDayNumbers).toEqual([90]);
    expect(canSealExecutionDay(first.state, day)).toBe(false);
    expect(duplicate.sealed).toBe(false);
    expect(duplicate.state).toBe(first.state);
  });
});
