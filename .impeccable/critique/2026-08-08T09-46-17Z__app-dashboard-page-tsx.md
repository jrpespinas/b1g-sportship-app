---
target: dashboard
total_score: 19
max_score: 28
na_heuristics: 5,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-08-08T09-46-17Z
slug: app-dashboard-page-tsx
---
Method: dual-agent (A: a98a5921dbe63b1a8 · B: a2dada84059991729)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Season to date, through Aug 1" anchors freshness well; no loading state visible/tested. |
| 2 | Match System / Real World | 3 | Domain terms (D12, DGroup, "willing to absorb") are correct but unexplained jargon for a lay volunteer. |
| 3 | User Control and Freedom | 3 | The chart↔table toggle on every chart is a solid reversible affordance for a read-only page. |
| 4 | Consistency and Standards | 3 | Card/color system is disciplined per DESIGN.md, but chart axis/category labels still break the doc's own contrast standard. |
| 5 | Error Prevention | n/a | No input, no destructive action possible on a read-only page. |
| 6 | Recognition Rather Than Recall | 2 | Returnee/first-timer color mapping is consistent, but D12-as-subset-of-Leaders has to be inferred and remembered card-to-card. |
| 7 | Flexibility and Efficiency | 2 | No way to isolate a game night, sport, or DGroup segment beyond per-point hover. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained palette holds, but 11 tiles at `gap-2` on one screen reads dense, not calm. |
| 9 | Error Recovery | n/a | No errors possible on a read-only data display. |
| 10 | Help and Documentation | n/a | No help affordance needed for a look-and-leave dashboard; no glossary either, which a first-time volunteer would want for D12/DGroup jargon. |
| **Total** | | **19/28** | **Acceptable (68%)** |

**Up from 17/28 (61%) last run** — real movement, though not yet across the 70% line into "Good."

## Design Specificity Verdict

**LLM assessment**: The *metrics* are genuinely program-specific — DGroup pipeline ordered by discipleship stage rather than sorted by size, "willing to absorb," returnee-vs-first-timer framing. But the *composition and interaction vocabulary* is still close to a generic analytics dashboard: KPI tiles with a delta arrow, line/bar charts with legend/tooltip/table-toggle, a leaderboard table. PRODUCT.md's neutral, non-ministry register is a defensible, deliberate call — but it means specificity lives entirely in the data, not in how the page is built to be read by this specific audience (a pastor glancing between meetings, not a data analyst).

**Deterministic scan**: The static scan (`detect.mjs`) is clean again — `0` findings, exit code 0. The runtime, browser-injected scan dropped from **11 findings last round to 1** — a real, substantial reduction. The one remaining finding is `cramped-padding` on the leaderboard card, and it's most likely a **false positive carried over from a detector blind spot**: the leaderboard's outer `Card` intentionally ships `p-0` (zero padding on the immediate wrapper), with visual inset applied several DOM levels deeper at the table-cell level (`pt-5`/`pb-5` on the header row and last body row — exactly the fix already shipped and visually verified in the prior `/impeccable layout` pass). The detector appears to check only the immediate child box, not the effective rendered content, so it re-flags a structural pattern that's already been fixed and confirmed correct by screenshot.

Separately, and more substantively: the browser detector's silence on chart-label contrast this round does **not** mean that issue is resolved — Assessment A independently confirmed via source reading that `line-chart.tsx` and `bar-chart.tsx` still use `fill-ink-tertiary` (≈2.6:1) for every axis tick, x-axis date, and bar category label. The prior fix only touched HTML/CSS text color (`StatCard`/`GroupedStatCard` captions); it never reached SVG `fill` attributes on chart `<text>` nodes, and the detector's contrast rule appears not to check those either — a real coverage gap between the two tools, not evidence the underlying problem is fixed.

**Visual overlays**: Rendered visibly — one amber box wrapping the leaderboard card, labeled "cramped padding," captured in a full-page screenshot (session closed after capture, so not live in a tab right now).

## Overall Impression

Real, measurable progress since the last pass: the health score moved 17→19, and browser-detector findings dropped 11→1 (and that remaining one is likely a false positive). The accessibility and layout fixes from the last round held up under a fresh, independent look. What's left is less about defects and more about information architecture: the DGroup story — this page's stated #2 priority — is still assembled by the reader from four non-adjacent tiles instead of being told to them directly.

## What's Working

- **The delta indicator's `aria-label` design** correctly separates what sighted users need (terse "↓ -15") from what screen-reader users need (the full "down 15 from the previous game night" sentence) — a genuinely well-executed accessibility pattern, not just a checkbox.
- **`GroupedStatCard`'s divider pattern** is the one place DGroup fragmentation actually got solved — Male/Female and D12/Willing-to-absorb sitting beside their parent hero number is real Gestalt proximity work.
- **The mobile chart min-width + right-edge fade** signals truncation instead of silently clipping — an easy thing to get wrong that didn't get missed.

## Priority Issues

**[P1] Chart axis and category labels still fail contrast — the fix from last time didn't reach here.** `line-chart.tsx` and `bar-chart.tsx` use `fill-ink-tertiary` (≈2.6:1, below DESIGN.md's own 4.5:1 floor for body copy) for every y-axis tick, x-axis date, and bar category label ("DGroup Leader," "1," "2–3"). The prior polish pass fixed `StatCard`/`GroupedStatCard` captions (HTML/CSS `color`) but never touched SVG `fill` on chart `<text>` — a different code path the same fix didn't reach, and one the browser detector doesn't appear to check either (it stayed silent on this in both critique rounds despite the color being identical to what it already flagged once).
**Fix**: promote `fill-ink-tertiary` to `fill-ink-secondary` (or the SVG equivalent) on all chart axis/category text across `line-chart.tsx`, `bar-chart.tsx`, and `grouped-bar-chart.tsx`.
**Suggested command**: `/impeccable polish`

**[P1] DGroup data is scattered across four non-adjacent tiles, undermining the page's stated #2 job.** DGroup leaders (composite card), DGroup members (standalone), Seeking a DGroup (standalone), and the DGroup pipeline chart sit in three different rows. A volunteer checking "is discipleship healthy" has to visually hunt and mentally reassemble four separate cards into one answer.
**Fix**: reposition the DGroup pipeline chart directly adjacent to the DGroup-leaders composite card rather than two rows down; consider whether "DGroup members" and "Seeking a DGroup" can move nearer too without breaking the grid's gapless math.
**Suggested command**: `/impeccable layout`

**[P2] The gender gap the surface brief calls "surfaced, not hidden" isn't actually visible anywhere.** Male (558) + Female (444) = 1002 against a stated 1081 total — a 79-person gap with no on-screen "Unspecified" figure to close it. The brief's own reasoning for leaving Male/Female as the only two sub-stats assumed a viewer would notice the gap; nothing currently lets them.
**Fix**: add "Unspecified" as a third sub-stat, or a small footnote, so the gap is a fact on screen, not an exercise for the reader.
**Suggested command**: `/impeccable clarify`

**[P2] A red delta on ordinary week-to-week variance risks reading as a false alarm.** "Latest game night: 157, ↓ -15" renders in `text-danger` with no reference point (season average, typical range) to tell a pastor whether a dip of 15 is normal noise or an actual concern — for a volunteer program, most week-to-week swings probably are noise.
**Fix**: either add a lightweight reference point near the delta (e.g. season average) or reconsider the red trigger threshold so isolated small dips don't alarm by default — a decision for you, not a default I'd make unprompted given you explicitly chose color-coding last round.
**Suggested command**: `/impeccable shape`

**[P3] No inline support for domain jargon.** "D12" and "willing to absorb" have no tooltip or definition anywhere on the page — legible to whoever wrote the spec, opaque to a volunteer reading cold.
**Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Alex (impatient power user):** Lands on 11 simultaneous same-weight tiles with no visual "start here" beyond the trend chart's size. Wants one answer to "is DGroup health OK" and has to connect four separate cards to get it. Sees "-15" in alarm-red and has to stop and second-guess whether it's a real problem, spending the "under a minute" budget on a false signal.

**Sam (screen reader + keyboard, needs 4.5:1 + visible focus):** Chart axis and category labels at ~2.6:1 are unreadable at low vision, independent of screen-reader concerns — this is the same contrast defect from last round, just in a part of the page the fix didn't reach. Keyboard focus on trend-chart data points still renders the browser's default outline rather than DESIGN.md's documented 2px Ember ring — inconsistent with the rest of the system Sam has already learned to look for. The DGroup pipeline and attendance charts (single-series, aqua) have no visible legend, so identity for those bars rests entirely on the low-contrast axis text.

## Minor Observations

- Tabular-nums is correctly avoided on the 28px metric values but correctly used on the leaderboard's `#` and game-night columns — consistent with DESIGN.md.
- Nav active-state treatment (bold + graphite vs. medium + secondary) reads clearly at both viewports.
- Blue/Ember color language for returnee/first-timer stays consistent across every chart that uses it — the one pairing the page trains a reader to recognize actually gets reinforced everywhere.
- The `cramped-padding` detector finding is very likely a false positive from a detector blind spot (checks the immediate child box, not the effectively-inset table cells several levels deeper) — not a regression, and the actual visual padding was already fixed and confirmed by screenshot in the prior round.

## Questions to Consider

- If the real job is "answer three questions in under a minute," why does the page make the reader assemble those answers from 11 undifferentiated tiles instead of stating them directly ("Healthy: attendance steady," "DGroup: 41 still seeking, unchanged")?
- Would one sentence of synthesized narrative at the top outperform the entire bento grid for how this specific audience actually uses the page?
- Is DGroup data spread across four tiles a byproduct of the bento grid's "fill exactly 4 columns per row" math, rather than a decision made in service of the discipleship-health question the page claims to answer first?
