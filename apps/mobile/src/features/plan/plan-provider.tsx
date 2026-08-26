import {
  generateWinterArcPlan,
  reducePlanGeneration,
  type PlanGenerationState,
} from '@winter-arc/domain';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { GUEST_WORKSPACE_ID, type PlanRepository } from '@/data/repositories';
import { planRepository } from '@/data/repositories/production';
import { useAuth } from '@/features/auth/auth-provider';
import { canUseGuestWorkspace } from '@/features/boot/development-preview-adapter';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { buildPlanAssessment } from './build-assessment';
import { activateProtocol } from './protocol-activation';

type PlanContextValue = {
  activate(): Promise<void>;
  activated: boolean;
  generate(): Promise<void>;
  hydrated: boolean;
  hydrationError: boolean;
  refresh(): Promise<void>;
  reset(): Promise<void>;
  retryHydration(): void;
  state: PlanGenerationState;
};

const PlanContext = createContext<PlanContextValue | null>(null);

type PlanProviderProps = PropsWithChildren<{ repository?: PlanRepository }>;

export function PlanProvider({ children, repository = planRepository }: PlanProviderProps) {
  const { developmentPreview, status, user } = useAuth();
  const { draft } = useOnboarding();
  const [state, dispatch] = useReducer(reducePlanGeneration, { status: 'idle' });
  const [activatedOwner, setActivatedOwner] = useState<string | null>(null);
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const [hydrationErrorOwner, setHydrationErrorOwner] = useState<string | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const hydrationRun = useRef(0);
  const ownerId =
    status === 'authenticated' && user
      ? user.id
      : canUseGuestWorkspace(status, developmentPreview)
        ? GUEST_WORKSPACE_ID
        : null;
  const hydrationKey = ownerId ? `${ownerId}:${hydrationAttempt}` : null;
  const hydrated = hydrationKey !== null && hydratedOwner === hydrationKey;
  const hydrationError = hydrationKey !== null && hydrationErrorOwner === hydrationKey;
  const activated =
    ownerId !== null && ownerId !== GUEST_WORKSPACE_ID && activatedOwner === ownerId;

  useEffect(() => {
    if (!ownerId || !hydrationKey) return;
    const run = hydrationRun.current + 1;
    hydrationRun.current = run;
    let mounted = true;

    void (async () => {
      if (ownerId !== GUEST_WORKSPACE_ID) {
        await repository.claimGuestWorkspace(ownerId).catch(() => undefined);
      }
      const stored = await repository.load(ownerId);
      if (!mounted || hydrationRun.current !== run) return;
      dispatch(stored ? { plan: stored.plan, type: 'SUCCEED' } : { type: 'RESET' });
      setActivatedOwner(ownerId !== GUEST_WORKSPACE_ID && stored?.canonical ? ownerId : null);
      setHydratedOwner(hydrationKey);
      setHydrationErrorOwner(null);
    })().catch(() => {
      if (mounted && hydrationRun.current === run) {
        dispatch({ type: 'RESET' });
        setActivatedOwner(null);
        setHydratedOwner(null);
        setHydrationErrorOwner(hydrationKey);
      }
    });

    return () => {
      mounted = false;
    };
  }, [hydrationKey, ownerId, repository]);

  const generate = useCallback(async () => {
    if (!ownerId) return;
    dispatch({ type: 'START' });
    try {
      const plan = generateWinterArcPlan(buildPlanAssessment(draft));
      await repository.save(ownerId, plan);
      dispatch({ plan, type: 'SUCCEED' });
    } catch (error) {
      dispatch({
        message: error instanceof Error ? error.message : 'The plan could not be generated.',
        type: 'FAIL',
      });
    }
  }, [draft, ownerId, repository]);

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    setHydratedOwner(null);
    setHydrationErrorOwner(null);
    setActivatedOwner(null);
    const stored = await repository.load(ownerId);
    dispatch(stored ? { plan: stored.plan, type: 'SUCCEED' } : { type: 'RESET' });
    setActivatedOwner(ownerId !== GUEST_WORKSPACE_ID && stored?.canonical ? ownerId : null);
    setHydratedOwner(ownerId);
  }, [ownerId, repository]);

  const activate = useCallback(async () => {
    if (status !== 'authenticated' || !user) {
      throw new Error('Authentication is required before protocol activation.');
    }

    await activateProtocol(user.id, draft, buildPlanAssessment(draft));
    await refresh();
  }, [draft, refresh, status, user]);

  const value = useMemo<PlanContextValue>(
    () => ({
      activate,
      activated,
      generate,
      hydrated,
      hydrationError,
      refresh,
      async reset() {
        if (!ownerId) return;
        await repository.clear(ownerId);
        dispatch({ type: 'RESET' });
        setActivatedOwner(null);
        setHydrationErrorOwner(null);
      },
      retryHydration() {
        setHydrationAttempt((attempt) => attempt + 1);
      },
      state,
    }),
    [activate, activated, generate, hydrated, hydrationError, ownerId, refresh, repository, state],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) throw new Error('usePlan must be used within PlanProvider.');
  return context;
}
