-- Apply final schedule constraints after the preceding migration has committed its legacy backfill.

alter table public.plan_days
alter column scheduled_for set not null;

alter table public.plan_days
add constraint plan_days_plan_date_unique unique (plan_id, scheduled_for);
