import { requireSupabase } from '@/data/supabase/client';
import { type ExecutionState, executionStateSchema } from '@/features/execution/execution-state';

import {
  type ExecutionCloudGateway,
  ExecutionRevisionConflictError,
  ExecutionTransportError,
} from './execution-repository';

export const supabaseExecutionGateway: ExecutionCloudGateway = {
  async execute(userId, request) {
    const { data, error } = await requireSupabase().rpc('execute_mission_command', {
      p_client_occurred_at: request.clientOccurredAt,
      p_command: request.command,
      p_expected_revision: request.expectedRevision,
      p_idempotency_key: request.idempotencyKey,
      p_target_id: request.targetId ?? '',
    });

    if (error?.code === 'PT409' || error?.code === '40001') {
      throw new ExecutionRevisionConflictError();
    }
    if (error && (!error.code || error.code.startsWith('PGRST0'))) {
      throw new ExecutionTransportError(error.message);
    }
    if (error) throw error;
    const commandResponse = data?.[0];
    if (!commandResponse) throw new Error('The mission command was not accepted.');

    const current = await this.load(userId);
    if (!current) throw new Error('The updated execution could not be loaded.');
    if (current.revision !== commandResponse.execution_revision) {
      throw new ExecutionRevisionConflictError();
    }

    const result = commandResponse.command_result;
    if (
      result !== 'active' &&
      result !== 'paused' &&
      result !== 'advanced' &&
      result !== 'completed' &&
      result !== 'skipped' &&
      result !== 'day_closed'
    ) {
      throw new Error('The server returned an unsupported mission result.');
    }
    return { ...current, result };
  },

  async load(userId) {
    const client = requireSupabase();
    const { data: plan, error: planError } = await client
      .from('plans')
      .select('id, user_id')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
      .order('activated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return null;
    if (plan.user_id !== userId) throw new Error('Received an execution for another user.');

    const [executionResult, missionsResult, progressResult, daysResult, profileResult] =
      await Promise.all([
        client.from('arc_executions').select('*').eq('plan_id', plan.id).single(),
        client.from('plan_missions').select('id, scheduled_key, user_id').eq('plan_id', plan.id),
        client.from('mission_progress').select('*').eq('plan_id', plan.id),
        client
          .from('day_progress')
          .select('status, user_id, plan_days!inner(day_number)')
          .eq('plan_id', plan.id),
        client.from('profiles_public').select('total_xp').eq('id', userId).single(),
      ]);

    if (executionResult.error) throw executionResult.error;
    if (missionsResult.error) throw missionsResult.error;
    if (progressResult.error) throw progressResult.error;
    if (daysResult.error) throw daysResult.error;
    if (profileResult.error) throw profileResult.error;

    const execution = executionResult.data;
    const missionKeyById = new Map(
      missionsResult.data.map((mission) => [mission.id, mission.scheduled_key]),
    );
    if (
      execution.user_id !== userId ||
      missionsResult.data.some((mission) => mission.user_id !== userId) ||
      progressResult.data.some((progress) => progress.user_id !== userId) ||
      daysResult.data.some((day) => day.user_id !== userId)
    ) {
      throw new Error('Received execution data for another user.');
    }

    const state: ExecutionState = {
      activeDay: execution.active_day,
      completedMissionIds: progressResult.data
        .filter((progress) => progress.status === 'completed')
        .map((progress) => missionKeyById.get(progress.plan_mission_id))
        .filter((value): value is string => Boolean(value)),
      currentMissionId: execution.current_mission_id
        ? (missionKeyById.get(execution.current_mission_id) ?? null)
        : null,
      currentStepIndex: execution.current_step_index,
      events: [],
      missionStatus: execution.mission_status as ExecutionState['missionStatus'],
      sealedDayNumbers: daysResult.data
        .filter((day) => day.status === 'sealed')
        .map((day) => day.plan_days.day_number),
      skippedMissionIds: progressResult.data
        .filter((progress) => progress.status === 'skipped')
        .map((progress) => missionKeyById.get(progress.plan_mission_id))
        .filter((value): value is string => Boolean(value)),
      version: 1,
      xp: profileResult.data.total_xp,
    };

    return { revision: execution.revision, value: executionStateSchema.parse(state) };
  },
};
