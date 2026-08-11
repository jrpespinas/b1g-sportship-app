---
target: dashboard
total_score: 17
max_score: 28
na_heuristics: 5,9,10
p0_count: 2
p1_count: 1
timestamp: 2026-08-08T09-02-35Z
slug: app-dashboard-page-tsx
---
Method: dual-agent (A: a530fb1cc95b9532f · B: ae7c56972d7a644ac)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state for a `force-dynamic` page that reads live off Google Sheets on every request — the page just appears or blanks. |
| 2 | Match System / Real World | 3 | DGroup funnel order and "frequent sport" tags are genuinely domain-fluent, not generic. |
| 3 | User Control and Freedom | 3 | The chart↔table toggle on every chart is real optionality; no undo needed on a read-only page. |
| 4 | Consistency and Standards | 2 | Ember (`--color-accent`) means "first-timers" in three charts and is also the unstyled default fill for two more (DGroup pipeline, attendance chart) — same hue, different meaning, same screen. |
| 5 | Error Prevention | n/a | No input, no destructive action possible on a read-only page. |
| 6 | Recognition Rather Than Recall | 2 | "DGroup leaders: 172" with "D12: 46" beside it as a sub-stat requires inferring D12 is a subset, not additive — no "of which" copy. |
| 7 | Flexibility and Efficiency | 2 | No per-game-night selector, no delta/trend indicator — getting "vs. last week" requires eyeballing the (currently crowded) line chart. |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely restrained, well-executed card/spacing system. |
| 9 | Error Recovery | n/a | No errors possible on a read-only data display. |
| 10 | Help and Documentation | n/a | Correctly absent — no help needed for a look-and-leave dashboard. |
| **Total** | | **17/28** | **Acceptable (61%)** |

## Design Specificity Verdict

**LLM assessment**: Thin. Strip the DGroup pipeline chart and the "frequent sport" leaderboard tags, and this is an unbranded SaaS analytics template — bento grid of white cards, icon-badge stat tiles, line/bar charts with legend + hover tooltip + "View as table," a ranked leaderboard. That's a *deliberate* choice (DESIGN.md explicitly rejects "warm/ministry-themed" chrome for this admin-adjacent surface), but deliberate isn't the same as earned: the surface brief's own stated job is "is this healthy right now, is it trending the right way" — yet nothing on the page renders a health judgment. No delta, no arrow, no color-coded status. Every metric is a bare, context-free number. A generic dashboard and this one fail the same test in the same way.

**Deterministic scan**: The static source scan (`detect.mjs --json` against the 7 dashboard-related files) returned a clean `[]` — 0 findings, exit code 0. The runtime, DOM-injected version of the same detector (`detect.js`, run against the live rendered page) found **11 anti-patterns**: 5× `low-contrast` (`2.6:1` measured, needs `4.5:1`, on the "Male"/"Female" labels, "D12"/"Willing to absorb" labels, and the "Aug 1" sublabel), 1× `cramped-padding` (the "Top returning players" leaderboard card), and 5× `text-occlusion` (trend-chart x-axis date labels "Jul 11/18/25," "Aug 1," and the "121" split-meter value, all reported as fully covered by an element whose class signature matches the "Latest game night" card).

The gap between the two scan modes is itself worth noting — a source-level scan can't measure rendered contrast or actual occlusion, so the runtime scan is the more trustworthy signal here. The 5 `low-contrast` findings independently corroborate Assessment A's own (unprompted) observation of the same issue at the same measured ratio — high-confidence, not a coincidence. The 5 `text-occlusion` findings are most likely **false positives**: no visible highlight box confirmed them in the overlay screenshot (unlike the contrast and padding findings, which did get visible boxes), and the claimed covering element (the "Latest game night" card) isn't spatially adjacent to the trend chart or the split meter in the actual layout — this reads like a bounding-box measurement artifact in the detector's overlay pass, not a real rendering defect.

**Visual overlays**: Overlays are not currently visible in a live tab (the sub-agent's browser session was closed after capture) — the evidence exists as a full-page screenshot the sub-agent reviewed, showing 6 boxed regions: 5 orange "low contrast text" boxes on the labels above, plus 1 box outlining the leaderboard card for cramped padding.

## Overall Impression

The card system, spacing discipline, and the two most recent revisions (composite hero+sub-stat cards, the DGroup pipeline/attendance/grouped-sport charts) are genuinely well-executed craft — this doesn't look like a first pass. But the page is answering "what are the numbers" thoroughly while under-answering "is this good or bad, and are we improving," which is literally the job the surface brief itself states first. The single biggest opportunity: spend the one accent color and the one moment of visual emphasis on trend/delta instead of on a bare "latest count," which is what a pastor glancing at this actually needs to feel something about.

## What's Working

- **`GroupedStatCard`'s proximity fix** (Unique Participants ↔ Male/Female; DGroup Leaders ↔ D12/Willing-to-absorb) is real information-architecture work, not decoration — it reduces tile count while keeping the relationship between numbers legible via the divider.
- **The chart-table accessibility twin** ("View as table") is implemented consistently on every single chart, not just the flagship trend chart — the kind of discipline that usually gets skipped after the first component.
- **The DGroup pipeline chart's fixed funnel order** (Leader → D12 → Member → Seeking → Not involved, not sorted by size) correctly encodes domain meaning that a generic "rank by size" bar chart would have destroyed.

## Priority Issues

**[P0] Trend chart x-axis is unreadable and gets worse every week.** `TrendLineChart` renders every category label at 11px with no collision handling. At the current ~16+ game nights of real data, adjacent labels run together ("Mar 14Mar 28," "May 16May 23") and the newest date clips at the card edge. This is the hero 2×2 tile — the one place a viewer checks "is it trending right" — and the axis that answers that question is the one that's broken. It will only get more crowded as the season continues; this isn't a one-time content overflow, it's a structural ceiling the chart will keep hitting.
**Fix**: skip every-other label past a data-count threshold (e.g. show every 2nd or 3rd date once >8 points), or rotate labels 45°, with a guaranteed-visible last label regardless of density.
**Suggested command**: `/impeccable layout`

**[P0] Secondary text fails contrast at a measured 2.6:1 against a 4.5:1 requirement DESIGN.md itself sets.** Confirmed independently by both assessments (Assessment A flagged it from source reading; Assessment B measured the exact same 2.6:1 ratio live in the browser). `ink-tertiary` (`#A1A1A6`) is used for the `GroupedStatCard` sub-stat captions ("Male," "Female," "D12," "Willing to absorb") and the "Aug 1" sublabel on the Latest-game-night card — DESIGN.md's own Colors section says this token is for "large/decorative use only; never body copy," but these captions are exactly the load-bearing labels that make the adjacent numbers meaningful, not decoration.
**Fix**: promote these captions to `ink-secondary` (already 4.5:1+, already used for the equivalent captions on plain `StatCard`) — a token swap, not a redesign.
**Suggested command**: `/impeccable polish`

**[P1] No trend delta anywhere, despite it being the stated primary job.** The surface brief names "is it trending the right way" as one of three questions this page must answer at a glance. Every stat card shows a bare count with no vs.-last-week comparison, no arrow, no sparkline — the viewer has to derive trend by reading the (currently broken, see above) 15-point line chart themselves.
**Fix**: add a small delta indicator to at least "Latest game night" and "Unique participants" (e.g. "+12 vs. last week").
**Suggested command**: `/impeccable shape`

**[P2] Ember means three different things on one screen.** `--color-series-firsttimer` *is* `--color-accent` (same CSS variable), and `RankedBarChart`'s default fill is also `var(--color-accent)` — so the DGroup-involvement chart and the attendance-frequency chart (both left at the component's default color) render in the identical hue that means "first-timers" in the trend chart, split meter, and sport chart on the same page. This is exactly the kind of semantic collision the One-Voice Rule exists to prevent.
**Fix**: per DESIGN.md's own documented chart-series palette order, give these two single-series charts the next slot (aqua) instead of silently inheriting the accent default.
**Suggested command**: `/impeccable colorize`

**[P3] The "Top returning players" leaderboard has cramped internal padding.** Confirmed with a visible overlay box — table content sits flush against the card's rounded corners with no inset, unlike every other card on the page which uses the standard 20px `card-padding` token.
**Fix**: apply the standard card padding token to the leaderboard's table wrapper, matching every other card on the page.
**Suggested command**: `/impeccable layout`

## Persona Red Flags

**Alex (impatient power user)**: Hits the trend chart first and can't read 6 of 15 x-axis dates — has to open "View as table" just to know which week the current dip or rise happened. Wants a delta on "Latest game night" (157) and gets none, so has to mentally subtract against the line chart's second-to-last point by eye. The "DGroup leaders 172 / D12 46" relationship costs a re-read because nothing marks D12 as a subset rather than an addition.

**Sam (screen reader + keyboard-only, needs 4.5:1 contrast)**: The measured 2.6:1 contrast failure hits exactly the labels Sam depends on most — "Male," "Female," "D12," "Willing to absorb" are the *only* text that disambiguates the large numbers beside them, and they're the least readable text on the page. Tab order does reach each chart's data points via `tabIndex={0}` hit-rects, which is good coverage, but focus rings on those hit-rects fall back to the browser default rectangle instead of the system's documented 2px Ember focus-visible ring used everywhere else (inputs, nav, sort buttons) — present, but visually inconsistent with the rest of the system Sam has already learned to look for.

## Minor Observations

- No `loading.tsx` for a page marked `force-dynamic` that reads live Sheets data on every request — a slow Sheets read (the surface brief itself cites 0.5–3s observed) currently has no in-between state.
- Sport-chart legend uses filled-circle swatches; trend-chart legend uses line-dash swatches — same "series identity" concept, two different glyph conventions on the same page.
- "DGroup leaders: 172" vs. "D12: 46" shown as flat sibling numbers invites a subset/sum misread without a visual containment cue or "of which" qualifier.
- The static (`detect.mjs`) and runtime (`detect.js`) detector modes disagree (0 vs. 11 findings) on the identical file set — worth knowing the source-level scan alone isn't sufficient evidence of a clean page; the browser-injected pass is doing real work here.

## Questions to Consider

- If the real success metric is "an accurate read in under a minute," why does every one of the 10 tiles get equal visual weight? What would this page look like with only 3 tiles emphasized and the rest a tap away?
- The system spends its one accent color on "Latest game night" and "first-timers" — but the number a pastor most needs an emotional read on is probably *trend direction*, not a raw count. What if Ember were spent on a delta arrow instead?
- DESIGN.md calls this "a chore tool, not a gamified habit app" — but a dashboard checked periodically by non-analysts is arguably closer to a health check-in. Does "neutral efficient utility" actually serve someone glancing at this between meetings, or does it just make the page harder to trust at a glance because nothing signals what's good or bad?
