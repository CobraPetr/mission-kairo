import { type PlanDay, type ScheduledMission, winterArcPlanSchema } from '@winter-arc/domain';

import { requireSupabase } from '@/data/supabase/client';

import { type PlanCloudGateway } from './plan-repository';

export const supabasePlanGateway: PlanCloudGateway = {
  async load(userId) {
    const client = requireSupabase();
    const { data: plan, error: planError } = await client
      .from('plans')
      .select('id, plan_key, generator_version, seed_version, base_track, duration_days, user_id')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
      .order('activated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return null;
    if (plan.user_id !== userId) throw new Error('Received a plan for another user.');

    const [{ data: days, error: daysError }, { data: missions, error: missionsError }] =
      await Promise.all([
        client
          .from('plan_days')
          .select('id, day_number, kind, user_id')
          .eq('plan_id', plan.id)
          .order('day_number'),
        client
          .from('plan_missions')
          .select(
            'plan_day_id, scheduled_key, template_id, ordinal, title, category, source, duration_minutes, intensity, minimum_age, xp_reward, steps, user_id',
          )
          .eq('plan_id', plan.id)
          .order('ordinal'),
      ]);

    if (daysError) throw daysError;
    if (missionsError) throw missionsError;
    if (days.some((day) => day.user_id !== userId)) {
      throw new Error('Received plan days for another user.');
    }
    if (missions.some((mission) => mission.user_id !== userId)) {
      throw new Error('Received plan missions for another user.');
    }

    const missionsByDay = new Map<string, ScheduledMission[]>();
    for (const mission of missions) {
      const scheduledMission = {
        category: mission.category,
        durationMinutes: mission.duration_minutes,
        id: mission.template_id,
        intensity: mission.intensity,
        minAge: mission.minimum_age,
        scheduledId: mission.scheduled_key,
        source: mission.source,
        steps: mission.steps,
        title: mission.title,
        xp: mission.xp_reward,
      } as ScheduledMission;
      const current = missionsByDay.get(mission.plan_day_id) ?? [];
      current.push(scheduledMission);
      missionsByDay.set(mission.plan_day_id, current);
    }

    const planDays: PlanDay[] = days.map((day) => ({
      day: day.day_number,
      kind: day.kind as PlanDay['kind'],
      missions: missionsByDay.get(day.id) ?? [],
    }));

    return winterArcPlanSchema.parse({
      baseTrack: plan.base_track,
      days: planDays,
      durationDays: plan.duration_days,
      planId: plan.plan_key,
      ...(plan.seed_version ? { seedVersion: plan.seed_version } : {}),
      version: plan.generator_version,
    });
  },
};
