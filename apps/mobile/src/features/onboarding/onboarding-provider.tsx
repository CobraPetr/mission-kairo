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

import { GUEST_WORKSPACE_ID, type OnboardingRepository } from '@/data/repositories';
import { onboardingRepository } from '@/data/repositories/production';
import { publicRuntimeConfig } from '@/config/runtime';
import { useAuth } from '@/features/auth/auth-provider';
import { canUseGuestWorkspace } from '@/features/boot/development-preview-adapter';

import { createEmptyOnboardingDraft, type OnboardingDraft } from './onboarding-schema';
import { type EmotionalQuestionId } from './questions';

const SAVE_DEBOUNCE_MS = 350;

type OnboardingContextValue = {
  draft: OnboardingDraft;
  hydrated: boolean;
  hydrationError: boolean;
  resetDraft(): Promise<void>;
  retryHydration(): void;
  setConsent(consent: OnboardingDraft['consent']): void;
  setActivity(activity: OnboardingDraft['activity']): void;
  setIdentity(identity: OnboardingDraft['identity']): void;
  setPhysical(physical: OnboardingDraft['physical']): void;
  setRelationship(relationship: OnboardingDraft['relationship']): void;
  setEmotionalAnswer(id: EmotionalQuestionId, answer: string): void;
  setEmotionalIndex(index: number): void;
  setGoals(goals: OnboardingDraft['goals']): void;
  setSection(section: OnboardingDraft['section']): void;
  setSituation(situation: OnboardingDraft['situation']): void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = PropsWithChildren<{
  repository?: OnboardingRepository;
}>;

export function OnboardingProvider({
  children,
  repository = onboardingRepository,
}: OnboardingProviderProps) {
  const { status, user } = useAuth();
  const [draft, setDraft] = useState(createEmptyOnboardingDraft);
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const [hydrationErrorOwner, setHydrationErrorOwner] = useState<string | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const revision = useRef(0);
  const hydrationRun = useRef(0);
  const lastPersistedAt = useRef<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerId =
    status === 'authenticated' && user
      ? user.id
      : canUseGuestWorkspace(status, publicRuntimeConfig.appEnvironment)
        ? GUEST_WORKSPACE_ID
        : null;
  const activeOwner = useRef(ownerId);
  const hydrationKey = ownerId ? `${ownerId}:${hydrationAttempt}` : null;
  const hydrated = hydrationKey !== null && hydratedOwner === hydrationKey;
  const hydrationError = hydrationKey !== null && hydrationErrorOwner === hydrationKey;

  useEffect(() => {
    activeOwner.current = ownerId;
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || !hydrationKey) return;
    const run = hydrationRun.current + 1;
    hydrationRun.current = run;
    let mounted = true;

    void (async () => {
      await saveQueue.current.catch(() => undefined);

      if (ownerId !== GUEST_WORKSPACE_ID) {
        await repository.claimGuestWorkspace(ownerId).catch(() => undefined);
      }

      const stored = await repository.load(ownerId);
      if (!mounted || hydrationRun.current !== run) return;

      const next = stored?.value ?? createEmptyOnboardingDraft();
      revision.current = stored?.revision ?? 0;
      lastPersistedAt.current = next.updatedAt;
      setDraft(next);
      setHydratedOwner(hydrationKey);
      setHydrationErrorOwner(null);
    })().catch(() => {
      if (!mounted || hydrationRun.current !== run) return;
      const empty = createEmptyOnboardingDraft();
      revision.current = 0;
      lastPersistedAt.current = empty.updatedAt;
      setDraft(empty);
      setHydratedOwner(null);
      setHydrationErrorOwner(hydrationKey);
    });

    return () => {
      mounted = false;
    };
  }, [hydrationKey, ownerId, repository]);

  useEffect(() => {
    if (!hydrated || !ownerId || draft.updatedAt === lastPersistedAt.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    const draftToSave = draft;
    const ownerToSave = ownerId;
    saveTimer.current = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const saved = await repository.save(ownerToSave, draftToSave, revision.current);
          if (activeOwner.current !== ownerToSave) return;
          revision.current = saved.revision;
          lastPersistedAt.current = draftToSave.updatedAt;
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, hydrated, ownerId, repository]);

  const updateDraft = useCallback((updater: (current: OnboardingDraft) => OnboardingDraft) => {
    setDraft((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      hydrated,
      hydrationError,
      async resetDraft() {
        if (!ownerId) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        await saveQueue.current.catch(() => undefined);
        await repository.clear(ownerId);
        const empty = createEmptyOnboardingDraft();
        revision.current = 0;
        lastPersistedAt.current = empty.updatedAt;
        setDraft(empty);
        setHydrationErrorOwner(null);
      },
      retryHydration() {
        setHydrationAttempt((attempt) => attempt + 1);
      },
      setConsent(consent) {
        updateDraft((current) => ({ ...current, consent }));
      },
      setActivity(activity) {
        updateDraft((current) => ({ ...current, activity }));
      },
      setEmotionalAnswer(id, answer) {
        updateDraft((current) => ({
          ...current,
          emotionalAnswers: { ...current.emotionalAnswers, [id]: answer },
        }));
      },
      setEmotionalIndex(index) {
        updateDraft((current) => ({ ...current, emotionalIndex: index }));
      },
      setGoals(goals) {
        updateDraft((current) => ({ ...current, goals }));
      },
      setIdentity(identity) {
        updateDraft((current) => ({ ...current, identity }));
      },
      setPhysical(physical) {
        updateDraft((current) => ({ ...current, physical }));
      },
      setRelationship(relationship) {
        updateDraft((current) => ({ ...current, relationship }));
      },
      setSection(section) {
        updateDraft((current) => ({ ...current, section }));
      },
      setSituation(situation) {
        updateDraft((current) => ({ ...current, situation }));
      },
    }),
    [draft, hydrated, hydrationError, ownerId, repository, updateDraft],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider.');
  }
  return context;
}
