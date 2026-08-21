-- Keep user-owned profile editing while reserving verified identity and
-- onboarding lifecycle fields for trusted database functions and triggers.
revoke update on public.profiles_private from authenticated;

grant update (
  full_name,
  birth_date,
  height_cm,
  weight_kg,
  preferred_units,
  relationship_status
) on public.profiles_private to authenticated;
