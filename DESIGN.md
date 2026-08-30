# Mission — Kairo Interface Contract

## 1. Design System Overview

### North Star

**The Classified Winter Field Terminal.** Mission — Kairo should feel like a private, advanced command system issued to one person for a consequential 90-day operation. It combines the composure of a military field computer, the intelligence of a restrained cinematic assistant, and the cold clarity of winter. It must feel premium and alive without becoming neon cyberpunk, a videogame HUD, or a generic fitness dashboard.

Mission — Kairo is the master product. **Winter Arc** is the first 90-day protocol or season inside it. Product-level surfaces use Mission — Kairo; protocol-level surfaces may use Winter Arc, WA-001, day, sector, order, and mission language.

### Design Principles

1. One command dominates each screen. Supporting data is subordinate.
2. Motion communicates system state: boot, scan, unlock, verification, progression, completion.
3. Information is precise and sparse. Empty space creates tension and focus.
4. The system is strict but never humiliating. Copy produces agency, not shame.
5. Private data looks protected. Never imply encryption or security guarantees the implementation does not provide.
6. Progress uses dates, evidence, and completion states—not decorative metrics.

### Signature Pattern

The signature pattern is the **Kairo Signal**: a quiet circular or orbital system visualization paired with a short protocol label, one exact state, and one action. The line work is asymmetric enough to feel engineered, but never busy. It appears only at meaningful moments such as first launch, activation, season generation, and major checkpoints.

## 2. Color System

The interface is dark-first and predominantly neutral. Blue indicates active command or focus; green is reserved for verified completion; amber marks caution; red marks destructive or blocking states.

| Token          | Value     | Role                                      |
| -------------- | --------- | ----------------------------------------- |
| Void           | `#000000` | System backdrop and cinematic transitions |
| Command Canvas | `#010204` | Default screen background                 |
| Deep Console   | `#050A0F` | Primary surfaces                          |
| Raised Console | `#09111A` | Selected or elevated controls             |
| Kairo Navy     | `#00275A` | Brand depth and large reserved accents    |
| Signal Border  | `#17314C` | Default rules and containers              |
| Active Border  | `#28587C` | Focused or current system element         |
| Frost          | `#DCE4F2` | Primary text and core iconography         |
| Muted Steel    | `#8797AA` | Secondary text                            |
| Dormant Steel  | `#53667A` | Locked and tertiary states                |
| Signal Blue    | `#65AFE3` | Primary action and live state             |
| Verified       | `#75C5A4` | Completed and authenticated states        |
| Caution        | `#E3B86B` | Warnings and attention                    |
| Abort          | `#DF7B82` | Errors and destructive actions            |

Do not use gradients, glowing borders, gradient text, ornamental neon, or blue on every element. The active blue should occupy less than roughly ten percent of a typical screen.

## 3. Typography

### Families

- **IBM Plex Mono**: product display, mission identifiers, system labels, state, numbers, and buttons.
- **Inter**: explanatory text, input values, error guidance, and longer reading.

### Hierarchy

- Display: 38–44 px, IBM Plex Mono Medium, tight tracking for product/protocol moments only.
- Title: 26–32 px, IBM Plex Mono Medium.
- Heading: 19 px, Inter Semibold.
- Body: 16/24 px, Inter Regular.
- Body small: 14/21 px, Inter Regular.
- System label: 10–12 px, uppercase IBM Plex Mono with 1.2 px tracking.

Never use decorative Unicode “fancy monospace” characters in functional UI; the real mono typeface preserves accessibility, localization, search, and screen-reader behavior.

## 4. Spacing and Layout

- Base spacing unit: 4 px.
- Screen gutter: 20 px.
- Maximum readable mobile content: 520 px.
- Minimum touch target: 48 px; primary actions are at least 52 px high.
- Main vertical rhythm: 24–32 px between sections, 12–16 px within groups.
- Default corner treatment: 2–10 px. Larger 16 px sheets are reserved for modal surfaces.
- Elevation is flat. Separate layers with controlled contrast and one-pixel borders, not drop shadows.
- Prefer top-left system alignment for briefings and questions; center alignment is reserved for cinematic activation moments.
- On compact screens, retain one-column flow and keep the primary action reachable without colliding with system safe areas.

## 5. Component Guidelines

### Buttons

- One primary Signal Blue button per decision surface.
- Secondary buttons use Raised Console with Active Border.
- Ghost actions are quiet and never compete with the command.
- Use short command verbs: `ACCEPT MISSION`, `BEGIN ORDER`, `SEAL DAY`, `RESTORE ACCESS`.
- Haptics confirm meaningful selections on native devices; no click sound is attached to primary buttons.

### Inputs

- Inputs feel like an open response channel, not a boxed form field.
- Use one subtle rule or surface change for focus; never a neon rectangle.
- Long responses expand upward while the action row stays aligned and visible.
- Labels remain visible, errors are explicit, and placeholders never substitute for labels.

### Panels and Cards

- Use panels only when they group a real concept. Prefer border-top sections for ordinary content.
- Raised panels are reserved for the current mission, verified identity, or an actionable exception.
- Avoid nested cards, repeated metric tiles, and decorative status grids.

### Navigation

- Launch navigation exposes Today, Roadmap, Progress, and Profile.
- Unfinished Challenges, social chat, leaderboard, public photos, and unrestricted AI are hidden—not shown as dead controls.
- Active navigation uses Signal Blue plus a label; state must remain understandable without color alone.

### Motion

- Fast: 120 ms for pressed feedback.
- Standard: 220 ms for small state transitions.
- Deliberate: 360–680 ms for screen reveal, unlock, verification, and protocol generation.
- Respect reduced-motion preferences by replacing travel/scale with short opacity changes.
- Typewriter effects are limited to the first briefing and emotionally important onboarding prompts.

### Voice

- Precise, calm, direct, and accountable.
- Prefer “Your next order is ready” to “Crush your goals.”
- Prefer “This date passed. Your protocol continues.” to guilt or insults.
- Never rank attractiveness, bodies, masculinity, or personal worth.
