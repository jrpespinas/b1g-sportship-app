---
name: B1G Sportship — Player Inventory
description: A quiet, precise operator surface for weekly roster ingestion — restraint and snap over expression.
colors:
  canvas: "#ffffff"
  surface: "#ffffff"
  surface-subtle: "#f5f5f7"
  border: "#e5e5e7"
  border-strong: "#d2d2d7"
  graphite: "#1d1d1f"
  graphite-secondary: "#6e6e73"
  graphite-tertiary: "#a1a1a6"
  ember: "#ff6f2f"
  ember-hover: "#f2621f"
  ember-pressed: "#e0551a"
  ember-tint: "#fff1e8"
  ember-ink: "#c2450f"
  success: "#1a7f4b"
  success-tint: "#eaf7f0"
  danger: "#d92d20"
  danger-tint: "#fef3f2"
  series-returnee: "#2a78d6"
  series-firsttimer: "#ff6f2f"
  chart-grid: "#e5e5e7"
  chart-axis: "#d2d2d7"
typography:
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  kbd:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  input: "10px"
  card: "16px"
  pill: "9999px"
  chip: "5px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  card-padding: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ember-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-secondary}"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  badge-neutral:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.graphite-secondary}"
    rounded: "{rounded.pill}"
  badge-accent:
    backgroundColor: "{colors.ember-tint}"
    textColor: "{colors.ember-ink}"
    rounded: "{rounded.pill}"
  badge-success:
    backgroundColor: "{colors.success-tint}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: B1G Sportship — Player Inventory

## Overview

**Creative North Star: "The Control Surface"**

This is an operator's panel, not a showcase — a single admin, alone, weekly, dropping a file and trusting the system to place the obvious cases silently while surfacing only what genuinely needs a human call. Every device in the system serves that: a white canvas with almost no chrome, one accent color spent only where a decision or a status actually lives, generous whitespace that reads as calm rather than empty, and a triage step built to be operated — keyboard shortcuts, a forward-advancing transition, a queue that shrinks as you work it.

The system fuses three references named directly in the brief: Apple Health's native chrome, generous whitespace, and card-based data presentation; Linear's snappy, deliberate, keyboard-fast interaction texture; and Notion/Things 3's calm, content-first, single-item focus. Nothing here is warm or ministry-themed by design — this tool serves a church sports program, but its register is neutral efficient utility, deliberately separated from the program's own identity. It explicitly rejects the generic SaaS admin dashboard: no sidebar, no data-table-plus-chart-widgets scaffold, no decorative navigation chrome standing between the admin and the task. The one exception, added once a real multi-page product existed: a single thin top bar for wayfinding — see Layout and Components → Navigation.

**Key Characteristics:**
- White/clean ground as the overwhelming majority of every screen; color is earned, never ambient.
- One accent (`Ember`, #FF6F2F) spent only on primary actions and states that need attention — never decorative, never small standalone text.
- Cards are the only container, always soft-shadowed, never bordered-and-shadowed at once.
- Motion is signature, not scattered: a shared entrance fade for arriving at a step, a distinct forward-slide reserved for advancing through the triage queue.
- No kickers, no eyebrows, no uppercase tracked labels anywhere in the system.

## Colors

A near-monochrome white system with a single accent held in reserve, plus two narrow-purpose status colors.

### Primary
- **Ember** (#FF6F2F): The one accent. Used only as a fill (buttons, key badges) or a deliberately darkened derivative for small text/icons — see the Ember Contrast Rule below. Never ambient, never used to color large surfaces or backgrounds.

### Neutral
- **Canvas** (#FFFFFF): Page background. The default state of the system is this color.
- **Surface** (#FFFFFF): Card background — identical to canvas by value; cards are separated from the page by a hairline border and soft shadow, never by a background shift.
- **Surface Subtle** (#F5F5F7): Reserved for quiet fills that need to sit slightly off canvas without competing for attention — neutral badges, subtle interactive backgrounds.
- **Border** (#E5E5E7): Default card and divider hairlines.
- **Border Strong** (#D2D2D7): Input borders and any edge that needs to read slightly more present than a card hairline.
- **Graphite** (#1D1D1F): Primary text and icon color. Never pure black.
- **Graphite Secondary** (#6E6E73): Supporting text — labels, meta rows, secondary copy. Meets 4.5:1 on white.
- **Graphite Tertiary** (#A1A1A6): The quietest text tier — placeholders, timestamps, sublabels. Large/decorative use only; never body copy.

### Status
- **Success** (#1A7F4B) / **Success Tint** (#EAF7F0): Confirms a resolved, positive state (e.g. "linked to existing"). Narrow purpose — status only, never a second accent.
- **Danger** (#D92D20) / **Danger Tint** (#FEF3F2): Reserved for structural rejection (e.g. a file missing required columns), not for validation nitpicks.

### Named Rules
**The Ember Contrast Rule.** Ember (#FF6F2F) has a measured WCAG contrast of ~2.8:1 against both white and black at small sizes — it fails body-text contrast either way. Ember therefore only ever appears as a fill (paired with Graphite text on top, never white) or as `Ember Ink` (#C2450F, a darkened same-hue derivative that clears 5:1 on white) when the accent needs to be small text or an icon directly on canvas. Never render raw Ember as text.

**The One-Voice Rule.** Ember is the only saturated color with a decorative role in the system. Success and Danger are status signals, not palette options — do not reach for them to add visual variety.

### Chart Series (extension — a different job from UI chrome)

The One-Voice Rule governs UI chrome; a chart's series need identity color, which is a separate job with its own discipline. Chart series draw from a validated 8-hue categorical palette (the `dataviz` skill's reference set, CVD-checked via `validate_palette.js`, not eyeballed) with Ember substituted into slot 2 — re-validated after the swap, worst adjacent CVD unchanged. Three slots are in use today:

- **Returnees** — blue (`#2A78D6`).
- **First-timers** — Ember (the accent doing double duty as a series color, deliberately: it's the number leadership most wants to notice).
- **Single-series charts not part of the returnee/first-timer story** (DGroup involvement by category, attendance frequency) — aqua (`#1BAF7A`, `--color-series-neutral`), slot 3, unchanged from the reference palette. Added 2026-08-08 after a critique flagged these charts silently inheriting `RankedBarChart`'s Ember default, colliding with Ember's established "first-timers" meaning elsewhere on the same dashboard. Re-validated as a 3-slot set: worst adjacent CVD 10.4, worst normal-vision 29.1.

Add further series only in the palette's documented order (yellow, magenta, green, violet, red) when a chart needs a 4th+ series — never invent a new hue for "series 5." Ember still obeys the Ember Contrast Rule inside a chart: it's a mark/fill color, never chart label or axis text.

## Typography

**Body Font:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (system stack throughout — no separate display or label face)

**Character:** One typeface for the whole system, at the register Operate mode calls for: a workhorse UI face over an expressive display face, matching the Apple-native register the brief pinned directly. There is no display tier — the largest text in the system is a 28px stat value, not a hero headline.

### Hierarchy
- **Metric** (600, 28px, 1 line-height, proportional figures): The one number-forward size in the system — stat card values only. Proportional, not tabular: tabular figures widen every digit to a `0`'s width, which looks loose at display size — reserved for aligned columns (table rows, axis ticks), never a large standalone number.
- **Headline** (600, 26px, 1.2 line-height, -0.02em tracking): Page-level titles ("Upload this week's roster," "Possible duplicate," "Batch resolved.").
- **Title** (600, 19px, 1.3 line-height): Card-level primary content — a person's name inside a submission or candidate card. Submission and candidate names share this exact size deliberately: sizing one larger than the other would bias a side-by-side comparison the admin is supposed to judge on content, not visual weight.
- **Body** (400, 15px, 1.5 line-height): Paragraphs, button labels, form input text.
- **Label** (500, 13px, 1.3 line-height): Section labels inside cards ("This week's submission," "Already in inventory"), form field labels, and secondary meta lines (an email/sport pairing under a name, an error message body). One size for every tier of "supporting text below a title" rather than a near-duplicate 14px step.
- **Micro** (500, 12px, 1 line-height): Badge text.
- **Kbd** (500, 11px, 1 line-height): Keyboard-shortcut hint chips only. The absolute floor of the scale — never used for anything a user must read carefully.

Tabular figures (`font-variant-numeric: tabular-nums`) are reserved for numbers that sit in an aligned column or a compact inline counter — the triage queue's "N of M" badge, a future table's numeric columns. Large standalone values (stat card / Metric-tier numbers) use the font's default proportional figures instead — tabular widens every digit to a `0`'s width, which reads loose at 28px.

### Named Rules
**The No-Eyebrow Rule.** No label in the system is uppercase, letter-spaced, or set above a heading as a kicker. Section labels sit at Label size, sentence case, directly adjacent to the content they describe — never floating above it as a category tag.

## Layout

Single-column flow, left-aligned, no sidebar — the task fills the viewport rather than sharing it with wayfinding chrome. **Revised**: a single thin top bar (56px, `h-14`) is the one piece of persistent chrome the system carries, added once the product grew past a single isolated surface — see Components → Navigation. It is not a precedent for more chrome; the "no sidebar, no decorative navigation" discipline still holds everywhere below it. Below the top bar, generous top padding (64–80px) before page content starts; the page does not open with a hero or banner. Vertical rhythm between blocks steps through the spacing scale (8 / 12 / 16 / 24 / 32px) — more space above a new section than below the content that precedes it. Responsive behavior is a stacking model, not a reflow one: two-up field grids (date + name, stat cards) collapse to single-column below the `sm` breakpoint rather than shrinking in place; card action rows that pair a text block with a button stack vertically on narrow viewports instead of compressing. The same rule applies at coarser grains too, not just field pairs — the dashboard's bento mosaic (`.impeccable/surfaces/dashboard.md` carries its exact tile spans) is a wide-viewport-only composition whose tiles each collapse to full-width and stack in reading order below `sm`, same mechanism as everything else, just applied to whole tiles instead of two-up pairs.

**Content width is two-tier, not one fixed number.** A linear task flow (the upload surface — one form, one triage card, one decision at a time) caps at 640px: nothing there benefits from more measure, and a narrower column keeps a sequential task feeling sequential. A read/browse surface with denser content (the dashboard — a 4-across KPI grid, full-width charts, a leaderboard table) widens to ~960px: at 640px those elements would either wrap awkwardly or force scroll that adds nothing. Both tiers keep every other Layout commitment (single column, no sidebar, the same stacking model, the same spacing scale) — only the cap itself flexes with the surface's actual content shape.

## Elevation & Depth

Ambient, not structural. One shadow value exists in the entire system, applied uniformly to every card — it lifts content softly off the white canvas and carries no hierarchy meaning (a more "important" card is never given more shadow). Cards are otherwise flat: no inner shadows, no pressed states with shadow removal, no elevation ladder.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)`): The only shadow in the system. Two soft layers — a tight low-opacity contact shadow plus a wider diffuse one — applied to every card without exception.

### Named Rules
**The One-Shadow Rule.** There is exactly one shadow value. If a new component seems to need a different depth, that is a signal to reconsider the component, not to add a shadow tier.

## Shapes

Two radius tiers carry the entire system: a tighter 10px on interactive controls (buttons, inputs) and a more generous 16px on containers (cards). Badges and the keyboard-hint chip use their own small tiers (fully rounded pill for badges, 5px for the kbd chip) because they're reading as labels, not surfaces. Borders are hairline (1px) throughout — `Border` on cards and dividers, `Border Strong` on form inputs — never doubled with a shadow-plus-border-plus-fill treatment on the same edge.

## Components

### Buttons
- **Shape:** 10px radius, all variants.
- **Primary:** `Ember` fill, `Graphite` text (never white — see the Ember Contrast Rule), 10px/16px padding. Hover darkens to `Ember Hover`, active/pressed to `Ember Pressed`. Disabled drops to 40% opacity.
- **Secondary:** `Surface` fill, `Border Strong` outline, `Graphite` text. Hover shifts fill to `Surface Subtle`.
- **Ghost:** No fill or border, `Graphite Secondary` text, used for the lowest-emphasis action on a screen (e.g. "Skip"). Hover brings text to full `Graphite` with a `Surface Subtle` fill.
- All variants scale down slightly (0.98) on active press — the system's one shared micro-interaction, applied consistently rather than per-component.

### Badges
- **Style:** Fully rounded pill, no border, 12px medium text.
- **Neutral:** `Surface Subtle` fill / `Graphite Secondary` text — default, low-emphasis status.
- **Accent:** `Ember Tint` fill / `Ember Ink` text — marks something tied to the accent's meaning (e.g. a queue-position counter).
- **Success:** `Success Tint` fill / `Success` text — confirms a positive resolved state.

### Cards / Containers
- **Corner Style:** 16px radius.
- **Background:** `Surface` (#FFFFFF), identical to canvas.
- **Shadow Strategy:** The single Card shadow, always — see Elevation & Depth.
- **Border:** 1px `Border`, always present even with the shadow (the two work together, not as alternatives).
- **Internal Padding:** 20px (the `card-padding` token), consistent regardless of content density.

### Inputs / Fields
- **Style:** `Border Strong` 1px outline, `Surface` fill, 10px radius, 15px body text.
- **Focus:** A 2px `Ember`-colored ring via `focus-visible`, offset from the control — never a border-color-only change, so keyboard focus stays legible against the neutral palette.
- **Dropzone (signature field variant):** Dashed `Border` outline instead of solid, centered icon-plus-label content, switches to a solid `Ember` border with `Ember Tint` fill on active drag-over — the one moment a large fill of the accent color is permitted, because it's a transient state, not a resting one.

### Keyboard Hint Chip
- **Style:** 5px radius, `Border Strong` outline, `Surface Subtle` fill, 11px medium `Graphite Tertiary` text, sized to a single character.
- Attached inline to the action it triggers (not floating in a legend), reinforcing that the shortcut belongs to that specific control.

### Charts (line & bar)
- **Marks:** 2px lines, round join/cap. Bars get rounded *top* corners only (4px), square at the baseline — a bar rounded on all four corners is a floor violation, not a style choice.
- **Grid:** hairline (1px), solid, one step off surface (`Border`) — gridlines are never dashed.
- **Legend & labels:** a legend is always present for 2+ series (never make the reader color-match unaided); direct labels sit at line ends / above bar tops only, never on every point. Labels, axis text, and tooltip values stay in ink tokens even when the mark beside them carries a series color — text never wears the data color.
- **Interaction:** every chart ships a hover/focus tooltip (crosshair + snap-to-nearest-point for lines, per-mark for bars) with a values-lead/label-follows hierarchy, plus a "View as table" twin — a tooltip enhances, it's never the only way to read a value.
- **Width floor:** on narrow viewports a chart scrolls horizontally inside its card rather than shrinking text below legibility (`min-width` floor, ~480–560px depending on label density); a right-edge fade signals more content — never a silent, unsignaled clip.
- See Colors → Chart Series for which hues these marks use.

### Navigation
- **Style:** 56px (`h-14`) top bar, `Surface` background, single 1px `Border` bottom edge — no shadow (shadow is reserved for cards, and the bar isn't one).
- **Content:** the B1G Sportship mark (left, ~24px tall, links to `/upload`) and the same three text links on every page (right), inside the same `max-w-[960px]` measure the wider surfaces use, so the bar's content aligns with page content below it rather than spanning edge-to-edge on its own rhythm.
- **The mark is deliberately cropped from the client's full lockup** (`ssc logo.png`, 500×250 — the "B1G Sportship" icon+wordmark and a separate "Singles' Sports Community" script wordmark, divided by a rule). Only the left "B1G Sportship" half ships, for two reasons: the script half becomes illegible at the ~24px scale a nav mark needs, and its decorative, community-branded register is exactly what this admin chrome's neutral-utility register stays deliberately separate from (see Overview). The full lockup remains available in the repo root for any future public-facing surface that wants the warmer register.
- **Links:** Label size (13px). Active route is `font-semibold` in `Graphite`; inactive is `font-medium` in `Graphite Secondary`, hovering to `Graphite`. No pill, no underline, no background change — weight and ink color alone carry state, consistent with the rest of the system never using a background wash for "selected."
- **Same links everywhere, deliberately not role-split.** An earlier version showed only "Dashboard" on `/dashboard` and the full set elsewhere, using the route as a stand-in for role since no login exists. Reverted 2026-08-08: access control itself is now deferred (`docs/spec/04-access-control.md`), and every route is open to anyone regardless — hiding a link doesn't gate anything when the page behind it has no lock. All three destinations (Upload, Players, Dashboard) show on every page until real access control exists to make a role-split nav mean something again.
- **The one sanctioned exception to "no chrome":** this bar exists because a 4-page, 2-role product had no way to move between pages, not because chrome earns a place by default. Don't add a second toolbar, breadcrumb trail, or secondary nav anywhere else in the system on the strength of this precedent.

## The Analyst Register — `/dashboard` only (added 2026-08-11)

Everything above governs Upload and Players. The dashboard was overhauled to a
denser, more instrument-like register at the user's request, against a supplied
data-observability reference. The user's ruling on the conflict with the
One-Voice Rule: **Ember keeps actions, data marks get their own palette.** The
rest of the app stays as documented above until a second pass carries this
register across; the app is deliberately mixed in the meantime.

Documented from the built result, not from intention.

### Ground and elevation — the inversion

The one structural difference. Above, cards are white-on-white separated by a
hairline *and* the single Card shadow. Here:

- **Page** (`#F4F5F7`, `--color-page`): a grey ground. The dashboard is the
  only surface that is not white.
- **Panel**: white, 1px `Border`, 12px radius, **no shadow at all**.

Depth comes from the ground-vs-panel contrast rather than from lift. That is
what lets panels butt up against each other at 12px gaps without the page
reading as a heap of floating cards — the One-Shadow Rule is not violated so
much as unnecessary here.

### Type

The register runs one step larger at the top and one step smaller in support.

- **Figure** (600, 34px, -0.02em): the headline number in a metric panel. A
  new step, above the 28px Metric tier — the reference's whole character is
  that the numbers dominate.
- **Page title** (600, 24px, -0.02em) · **Panel title** (600, 15px, -0.01em).
- **Body / label** (13px) · **Micro** (12px): supporting copy, sub-figures,
  legends, table cells, axis labels. Proportionally more of the page is 12–13px
  than in the register above; that is the density, not an accident.
- Axis and category labels are **11px minimum** and use `ink-secondary`, never
  `ink-tertiary` — they are read text, and tertiary measures 2.6:1.

### The explanation line

Every metric panel carries one plain sentence under its figure. This is a
required part of the component, not decoration: each number here is read by
someone deciding who to go and talk to, and a bare figure invites the wrong
read — a subset mistaken for an addition, a total mistaken for a current state.

### Discipleship segment ramp — UNRESOLVED

The four segments are a journey, so the design intent is to encode them by
**lightness in one hue**, darkest = deepest involvement.

**The validated set** — steps 650/500/400/250 of the `dataviz` blue ramp.
Passes `validate_palette.js --ordinal` on white: monotone lightness, every
adjacent gap ≥ 0.06, light end 2.11:1. (A first attempt used the 100-step
`#cde2fb` and failed at 1.32:1, under the 2:1 light-end floor.)

| Segment | Token | Validated |
|---|---|---|
| Leaders | `--color-seg-leaders` | `#104281` |
| Members | `--color-seg-members` | `#256abf` |
| Seekers | `--color-seg-seekers` | `#3987e5` |
| Not involved | `--color-seg-uninvolved` | `#86b6ef` |

**What currently ships is not this set.** `seekers` and `uninvolved` were
changed to Ember and a light peach, making it a two-hue-family palette (blue =
in a group, orange = not in a group). That intent is sound — it puts the
in/out-group split first — but as measured it fails the normal-vision floor
(leaders ↔ members ΔE 14.6, floor 15), fails the chroma floor on `#f4b397`,
and gives Ember a second meaning alongside "first-timers" in the trend chart
on the same page.

The two-family shape cannot be fixed by re-stepping: two blues that both sit
inside the categorical lightness band are inherently under ΔE 15. Either
restore the validated ramp — which already delivers the in/out-group read,
since the two dark bands are the in-group — or re-pick all four as distinct
validated hues.

Always render these in pipeline order, never sorted by size. The order is the
meaning.

### Do's and Don'ts for this register

- **Do** give every figure its explanation line.
- **Do** keep segment bands in pipeline order and in the ordinal ramp.
- **Do** break a share-mode ribbon where a night has no attendance — plotting
  0% would claim a collapse on a night that simply had no session.
- **Don't** add a shadow to a panel. The grey ground is the depth.
- **Don't** spend a segment colour on chrome, or Ember on a data mark.
- **Don't** link a figure to a filtered list unless the filter returns exactly
  the set that figure counted. "Leaders" spans two categories the directory
  filter cannot express, so it deliberately has no link.

## Do's and Don'ts

### Do:
- **Do** spend Ember only on fills paired with Graphite text, or as Ember Ink for small text/icons directly on canvas — never raw Ember as text (The Ember Contrast Rule).
- **Do** keep every card at the single Card shadow value and 16px radius, no exceptions (The One-Shadow Rule).
- **Do** set section/field labels in sentence case at Label size, adjacent to their content — never as an uppercase kicker above it (The No-Eyebrow Rule).
- **Do** use tabular figures only for aligned columns and compact inline counters (queue position, future table columns) — never on a large standalone stat value.
- **Do** reserve Success/Danger strictly for status, never as palette variety.
- **Do** validate any new chart series color with `validate_palette.js` before shipping it — never eyeball CVD-safety.

### Don't:
- **Don't** introduce a sidebar, or any chrome beyond the one documented top bar — no secondary toolbars, breadcrumbs, or decorative header content.
- **Don't** add a second accent color. One accent, spent deliberately, is the system's discipline.
- **Don't** invent a new chart series hue past the documented palette order — the next slot is aqua, not a generated color.
- **Don't** use white text on Ember; it fails contrast at this hue (~2.8:1) regardless of weight or size.
- **Don't** reach for progress bars, completion badges, or celebratory motion — this is a chore tool, not a gamified habit app.
- **Don't** stack a border, a shadow, and a background-color shift on the same card edge; borders and the one shadow work together, a background shift never joins them (surface and canvas share the same white).
