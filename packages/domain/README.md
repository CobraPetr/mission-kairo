# Mission Kairo canonical domain

`packages/domain` is the single portable source for assessment validation, plan generation, mission
templates, safety rules, and plan serialization. The Expo preview and the Supabase activation Edge
Function both execute `generateWinterArcPlan`; neither runtime owns a second scheduling algorithm.

## Version contract

- Generator version: `2`
- Seed version: `mission-kairo.core.2026-08-26`
- Equal normalized assessments produce equal plan keys and byte-equivalent manifests.
- The database stores the normalized assessment, generator version, seed version, and complete
  manifest so an activated plan can be restored without silently regenerating it.
- A rule or seed change requires a new generator version. Existing plans remain on their recorded
  version.

## Assessment rule map

| Assessment field                            | Reviewed v2 behavior                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `age`                                       | Validates the 14–100 boundary and rejects any mission whose minimum age is higher.                                                                                                 |
| `currentBuild`                              | Selects the foundation track for starting users and contributes to capability level.                                                                                               |
| `targetBuild`                               | Selects athletic, body-recomposition, or definition base track.                                                                                                                    |
| `gymAccess`                                 | Selects full-gym, limited-equipment, or bodyweight physical missions.                                                                                                              |
| `hoursPerWeek`                              | Derives starting, consistent, or advanced capability and weekly-minute context.                                                                                                    |
| `relationshipGoal`                          | Selects the social or self/career personalized mission on personalized days.                                                                                                       |
| `careerGoal`, `confidenceGoals`, `mainGoal` | Normalize into the immutable plan input and stable plan identity; v2 deliberately avoids pretending the small seed library can safely prescribe unique content from these answers. |
| `currentWeightKg`, `targetWeightKg`         | Validate physical-goal boundaries and form part of immutable plan identity; v2 does not prescribe weight loss or medical targets.                                                  |

Other onboarding answers—name, username, height, emotional reflection, work detail, sport, and
current relationship status—belong to profile or immutable intake context. They intentionally do
not alter mission allocation in v2. This keeps collection explainable without overstating
personalization; expanding reviewed content is a separate launch gate.
