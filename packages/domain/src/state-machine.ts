import type { PlanGenerationAction, PlanGenerationState } from './models.ts';

export function reducePlanGeneration(
  state: PlanGenerationState,
  action: PlanGenerationAction,
): PlanGenerationState {
  switch (action.type) {
    case 'START':
      return { status: 'generating' };
    case 'SUCCEED':
      return { plan: action.plan, status: 'ready' };
    case 'FAIL':
      return { message: action.message, status: 'error' };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}
