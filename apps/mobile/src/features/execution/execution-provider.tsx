import { type ScheduledMission } from '@winter-arc/domain';
import { randomUUID } from 'expo-crypto';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ExecutionCommandQueuedError,
  GUEST_WORKSPACE_ID,
  type ExecutionRepository,
} from '@/data/repositories';
import { executionRepository } from '@/data/repositories/production';
import { useAuth } from '@/features/auth/auth-provider';
import { canUseGuestWorkspace } from '@/features/boot/development-preview-adapter';
import { usePlan } from '@/features/plan/plan-provider';
import {
  advanceMissionStep,
  createEmptyExecutionState,
  type ExecutionState,
  sealExecutionDay,
} from './execution-state';

type ExecutionContextValue = {
  activeMission?: ScheduledMission;
  advanceStep(): Promise<'advanced' | 'completed' | 'missing'>;
  beginMission(missionId: string): Promise<boolean>;
  busy: boolean;
  closeDay(): Promise<boolean>;
  error?: string;
  hydrated: boolean;
  hydrationError: boolean;
  pauseMission(): Promise<void>;
  reset(): Promise<void>;
  retryHydration(): void;
  resumeMission(): Promise<void>;
  skipMission(missionId: string): Promise<void>;
  state: ExecutionState;
};

const ExecutionContext = createContext<ExecutionContextValue | null>(null);

type ExecutionProviderProps = PropsWithChildren<{ repository?: ExecutionRepository }>;

export function ExecutionProvider({
  children,
  repository = executionRepository,
}: ExecutionProviderProps) {
  const { developmentPreview, status, user } = useAuth();
  const { state: planState } = usePlan();
  const [state, setState] = useState(createEmptyExecutionState);
  const stateRef = useRef(state);
  const revisionRef = useRef(0);
  const hydrationRun = useRef(0);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [hydrationErrorScope, setHydrationErrorScope] = useState<string | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const commandInFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const allMissions = useMemo(
    () =>
      planState.status === 'ready'
        ? planState.plan.days.flatMap((day) => day.missions)
        : ([] as ScheduledMission[]),
    [planState],
  );
  const activeMission = allMissions.find(
    (mission) => mission.scheduledId === state.currentMissionId,
  );
  const ownerId =
    status === 'authenticated' && user
      ? user.id
      : canUseGuestWorkspace(status, developmentPreview)
        ? GUEST_WORKSPACE_ID
        : null;
  const activePlanKey = planState.status === 'ready' ? planState.plan.planId : null;
  const currentHydrationScope = ownerId ? `${ownerId}:${activePlanKey ?? 'no-plan'}` : null;
  const hydrationKey = currentHydrationScope
    ? `${currentHydrationScope}:${hydrationAttempt}`
    : null;
  const hydrated = hydrationKey !== null && hydratedScope === hydrationKey;
  const hydrationError = hydrationKey !== null && hydrationErrorScope === hydrationKey;

  useEffect(() => {
    if (!ownerId || !currentHydrationScope || !hydrationKey) return;
    const run = hydrationRun.current + 1;
    hydrationRun.current = run;
    let mounted = true;

    void (async () => {
      if (ownerId !== GUEST_WORKSPACE_ID) {
        await repository.claimGuestWorkspace(ownerId).catch(() => undefined);
      }
      const stored = await repository.load(ownerId);
      if (!mounted || hydrationRun.current !== run) return;
      const next = stored?.value ?? createEmptyExecutionState();
      revisionRef.current = stored?.revision ?? 0;
      stateRef.current = next;
      setState(next);
      setHydratedScope(hydrationKey);
      setHydrationErrorScope(null);
    })().catch(() => {
      if (!mounted || hydrationRun.current !== run) return;
      const empty = createEmptyExecutionState();
      revisionRef.current = 0;
      stateRef.current = empty;
      setState(empty);
      setHydratedScope(null);
      setHydrationErrorScope(hydrationKey);
    });

    return () => {
      mounted = false;
    };
  }, [currentHydrationScope, hydrationKey, ownerId, repository]);

  const commit = useCallback(
    async (updater: (current: ExecutionState) => ExecutionState): Promise<ExecutionState> => {
      if (!ownerId) return stateRef.current;
      const next = updater(stateRef.current);
      const saved = await repository.save(ownerId, next, revisionRef.current);
      revisionRef.current = saved.revision;
      stateRef.current = next;
      setState(next);
      return next;
    },
    [ownerId, repository],
  );

  const executeServerCommand = useCallback(
    async (
      command: 'begin' | 'pause' | 'resume' | 'advance' | 'skip' | 'close_day',
      scheduledKey: string | null,
    ) => {
      if (status !== 'authenticated' || !user) return null;
      const result = await repository.execute(user.id, {
        clientOccurredAt: new Date().toISOString(),
        command,
        expectedRevision: revisionRef.current,
        idempotencyKey: randomUUID(),
        targetId: scheduledKey,
      });
      revisionRef.current = result.revision;
      stateRef.current = result.value;
      setState(result.value);
      if (result.result === 'conflict') {
        setError('Progress changed on another device. The latest mission state is now loaded.');
      }
      return result;
    },
    [repository, status, user],
  );

  const executeLocked = useCallback(
    async <Result,>(fallback: Result, operation: () => Promise<Result>): Promise<Result> => {
      if (commandInFlightRef.current) return fallback;
      commandInFlightRef.current = true;
      setBusy(true);
      setError(undefined);
      try {
        return await operation();
      } catch (cause) {
        setError(
          cause instanceof ExecutionCommandQueuedError
            ? cause.message
            : 'Secure mission sync failed. Check the connection and try again.',
        );
        return fallback;
      } finally {
        commandInFlightRef.current = false;
        setBusy(false);
      }
    },
    [],
  );

  const value = useMemo<ExecutionContextValue>(
    () => ({
      activeMission,
      async advanceStep() {
        return executeLocked('missing', async () => {
          if (status === 'authenticated') {
            if (!stateRef.current.currentMissionId) return 'missing';
            const result = await executeServerCommand('advance', stateRef.current.currentMissionId);
            return result?.result === 'advanced' || result?.result === 'completed'
              ? result.result
              : 'missing';
          }

          let result: 'advanced' | 'completed' | 'missing' = 'missing';
          await commit((current) => {
            const currentMission = allMissions.find(
              (mission) => mission.scheduledId === current.currentMissionId,
            );
            const transition = advanceMissionStep(
              current,
              currentMission,
              new Date().toISOString(),
            );
            result = transition.result;
            return transition.state;
          });
          return result;
        });
      },
      async beginMission(missionId) {
        return executeLocked(false, async () => {
          if (status === 'authenticated') {
            const result = await executeServerCommand('begin', missionId);
            return result?.result === 'active' || result?.result === 'paused';
          }
          await commit((current) =>
            current.completedMissionIds.includes(missionId)
              ? current
              : {
                  ...current,
                  currentMissionId: missionId,
                  currentStepIndex:
                    current.currentMissionId === missionId ? current.currentStepIndex : 0,
                  missionStatus: 'active',
                },
          );
          return true;
        });
      },
      busy,
      error,
      async closeDay() {
        return executeLocked(false, async () => {
          if (planState.status !== 'ready') return false;
          if (status === 'authenticated') {
            const result = await executeServerCommand('close_day', null);
            return result?.result === 'day_closed';
          }
          let sealed = false;
          await commit((current) => {
            const transition = sealExecutionDay(
              current,
              planState.plan.days[current.activeDay - 1],
            );
            sealed = transition.sealed;
            return transition.state;
          });
          return sealed;
        });
      },
      hydrated,
      hydrationError,
      async pauseMission() {
        await executeLocked(undefined, async () => {
          if (status === 'authenticated') {
            if (stateRef.current.currentMissionId) {
              await executeServerCommand('pause', stateRef.current.currentMissionId);
            }
            return;
          }
          await commit((current) => ({ ...current, missionStatus: 'paused' }));
        });
      },
      async reset() {
        if (!ownerId) return;
        await repository.clear(ownerId);
        const empty = createEmptyExecutionState();
        revisionRef.current = 0;
        stateRef.current = empty;
        setState(empty);
        setHydrationErrorScope(null);
      },
      retryHydration() {
        setHydrationAttempt((attempt) => attempt + 1);
      },
      async resumeMission() {
        await executeLocked(undefined, async () => {
          if (status === 'authenticated') {
            if (stateRef.current.currentMissionId) {
              await executeServerCommand('resume', stateRef.current.currentMissionId);
            }
            return;
          }
          await commit((current) =>
            current.currentMissionId ? { ...current, missionStatus: 'active' } : current,
          );
        });
      },
      async skipMission(missionId) {
        await executeLocked(undefined, async () => {
          if (status === 'authenticated') {
            await executeServerCommand('skip', missionId);
            return;
          }
          await commit((current) => ({
            ...current,
            currentMissionId:
              current.currentMissionId === missionId ? null : current.currentMissionId,
            currentStepIndex: current.currentMissionId === missionId ? 0 : current.currentStepIndex,
            missionStatus: current.currentMissionId === missionId ? 'idle' : current.missionStatus,
            skippedMissionIds: current.skippedMissionIds.includes(missionId)
              ? current.skippedMissionIds
              : [...current.skippedMissionIds, missionId],
          }));
        });
      },
      state,
    }),
    [
      activeMission,
      allMissions,
      busy,
      commit,
      executeLocked,
      executeServerCommand,
      error,
      hydrated,
      hydrationError,
      ownerId,
      planState,
      repository,
      state,
      status,
    ],
  );

  return <ExecutionContext.Provider value={value}>{children}</ExecutionContext.Provider>;
}

export function useExecution(): ExecutionContextValue {
  const context = useContext(ExecutionContext);
  if (!context) throw new Error('useExecution must be used within ExecutionProvider.');
  return context;
}
