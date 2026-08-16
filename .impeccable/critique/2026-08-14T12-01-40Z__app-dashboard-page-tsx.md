---
target: the dashboard (layout + data storytelling, pastor audience)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-14T12-01-40Z
slug: app-dashboard-page-tsx
---
Method: dual-agent (A: a573d07601d7f017c · B: acd7c352a6490bf97)

Audited as a senior data analyst reporting to a Pastor of a sports-ministry megachurch, against the intent the user stated in this session — **primary reader: the Pastor; the one question: "are people getting into groups?"; action: assign follow-ups AND decide where to focus; cadence: quarterly for the pastor, every 4 game nights for volunteer heads** — and NOT against the surface brief's recorded intent ("one ministry admin, weekly, driving a page they already know at speed").

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Honest coverage caveats, but no "as of" date and no year on "through Aug 1" — a quarterly reader cannot tell current from stale |
| 2 | Match System / Real World | 2 | "D12" never expanded on screen; "willing to **absorb** new members" is warehouse register for welcoming a person |
| 3 | User Control and Freedom | 2 | Three controls in 3,808px. No date scoping at all — the quarterly reader cannot ask "what changed since May" |
| 4 | Consistency and Standards | 2 | Two conflicting definitions of "seeking"/"not involved" on one page; two "Total" facets meaning different populations |
| 5 | Error Prevention | 2 | Capture-gap banner is real prevention; against it, "40 of 40" invites "placement is solved" and "the rest have not been asked" is false for 121 people who were asked |
| 6 | Recognition Rather Than Recall | 1 | Colour semantics carried across 4 viewports; six denominators in play; caveats sit 480px from the charts they govern; no glossary |
| 7 | Flexibility and Efficiency | 2 | Switch state is React-only, not URL — no view is shareable or bookmarkable; no export on this surface |
| 8 | Aesthetic and Minimalist Design | 2 | Visually superb, informationally overloaded: 421 numbers, 12 area charts, 4.2 viewports for a reader with one question |
| 9 | Error Recovery | 3 | Capture-gap banner is specific, scoped, names the fix; empty state present |
| 10 | Help and Documentation | 1 | Zero. No glossary, no method note. The best writing in the project is in source comments and never reaches the screen |
| **Total** | | **20/40** | **Acceptable — bottom of band** |

## Design Specificity Verdict

**LLM assessment: strongly authored, aimed at a reader who no longer exists.** This is not a template dashboard, and the evidence is structural rather than stylistic: the funnel draws a hatched "Not recorded 320" as a first-class stage instead of dropping unknowns; capacity bars use per-gender denominators because groups are not mixed; walk-ins are excluded from show-up rates with the wrong version's artifacts documented; six chart forms were built and cut for answering questions the audience didn't have. Nobody assembles this by dragging widgets.

But every one of those decisions optimises for an analyst-admin who would be misled by a loose denominator — not for a pastor who will not finish the page. DESIGN.md's own north star is now in direct conflict with the stated reader: *"Nothing here is warm or ministry-themed by design… neutral efficient utility, deliberately separated from the program's own identity."* Correct for an upload tool; actively working against a pastor's quarterly discipleship review.

**Deterministic scan: 0 findings, exit 0**, across 25 source files (`app/dashboard/page.tsx`, `components/ui`, `components/dashboard`, `components/charts`). The detector runs design-system-aware, so documented choices (no panel shadow, grey ground, CSS bar charts) are suppressed before output. Agreement worth stating plainly: **the visual system is clean; every problem below is informational or structural.**

**Visual overlays:** not attempted — no script injection into the running dev server. Evidence came from CDP screenshots and DOM measurement instead.

## Overall Impression

The page is an honest, well-built analyst's instrument that answers its stated question tenth, at 73% scroll depth, in half a panel — about 4.7% of vertical space. The two figures the user explicitly demoted ("attendance is only the funnel feeding it") are the first two things the reader meets, in 34px. Between the question and its answer sit 2,090px — 55% of the page — of scheduling logistics, demographics, and sport-level attendance.

Biggest opportunity: this is not a redesign. The right panels already exist and are correctly computed. They are in the wrong order, at the wrong weight, for the wrong cadence.

## What's Working

1. **Intellectual honesty rendered as a visual mark.** 320 of 1,080 have no answer on file. Most dashboards would drop them and report 404/760 = 53% membership. This one draws the unknown as a full stage in a *hatch* rather than a colour — the encoding itself says "this is an absence, not a category." No percentage below it is inflated. The same discipline runs through walk-in exclusion and the 42% coverage label.

2. **The capacity-fill bar is a correctly chosen mark.** Converting "decode a distance between two dots" into "look how empty that bar is" makes the finding preattentive. Per-row denominators refuse to combine two markets that never combine — a data-integrity decision expressed as a layout decision. Green appears exactly once on the page meaning exactly one thing, which is why the empty three-quarters reads instantly.

3. **The design system holds under real density.** Nine panels, 12 charts, 32 SVGs, four viewports — still one shadow value, one type ramp, two radii, two hues plus one reserved third. The detector's clean run is the mechanical proof. The Switch-In-Place rule prevented three near-identical roster panels.

## Priority Issues

### [P0] The reading order answers a different question than the page exists for
- **What:** Attendance scale leads (1,080 / 707 in 34px). The matching-market reassurance is the first panel. The discipleship funnel — the literal answer to "are people getting into groups?" — is the tenth element on the page.
- **Why it matters:** Pastor Dan opens this four times a year for maybe ten minutes. He reads the metric row, is reassured by "40 of 40", scrolls two screens of hourly meeting-time bars, and closes the tab before reaching the funnel. He leaves believing placement is handled — when 320 people have never been asked.
- **Fix:** Invert the page. Lead with the funnel plus one plain sentence stating the finding ("404 of 1,080 are in a group. 320 we have never asked."). Demote attendance metrics to a secondary row. Push supply/demand, attendance-by-sport, the demographics bento and the roster table below an explicit "For organisers" divider or a collapsed disclosure. The volunteer head reads monthly and will click; the pastor reads quarterly and will not scroll.
- **Suggested command:** `/impeccable layout`

### [P0] Two conflicting answers to "how many are not in a group", and funnel rows link to lists that contradict their own labels
- **What:** The metric tile says 40 seeking / 449 not involved (`getPlayerSegment` folds all 320 unrecorded into "Not involved"). The funnel says 48 seeking / 121 not involved / 320 not recorded (`getDiscipleshipFunnel`, a different rule). Both total 489; no component matches. The links are worse: the funnel row reading "Not involved 121" links to a list of 449 people; "Seeking a group 48" links to a list of 40; "DGroup leader 134" and "D12 53" both link to the same list of 187. The tile note "Seekers raised their hand. The rest have not been asked" is false for the 121 who were asked and said no.
- **Why it matters:** This is the one number he came for, given twice with different values. The first time he clicks a row labelled 121 and counts 449 names, the page loses its authority permanently. It also violates this project's own rule: *"Don't link a figure to a filtered list unless the filter returns exactly the set that figure counted."*
- **Fix:** One canonical definition — make the funnel's classification authoritative and give the segment breakdown a real fourth bucket, so the tile reads "320 never asked · 121 said no · 48 seeking". Teach `/players` to filter by funnel stage so every row lands on exactly its own count. Rewrite the tile note: the asked-and-declined vs never-asked distinction *is* the pastor's action.
- **Suggested command:** `/impeccable harden`

### [P1] No number on the page can be judged good, bad, or changing
- **What:** 421 numbers, zero targets, zero prior-period comparisons, zero benchmarks. Everything is cumulative season-to-date, so every count rises regardless of ministry health. The 12 stacked-area charts read as trends but are 58% backfilled from each person's latest status — which the source itself says makes February look healthier than it was.
- **Why it matters:** Quarterly reading is intrinsically comparative. "Is it better than last time" is his only real question, and the page cannot answer it anywhere while appearing in a dozen places to be doing so.
- **Fix:** (a) Print quarter-over-quarter deltas on the four things honestly derivable per night: registrations, arrivals, show-up rate, count of new seekers appearing. (b) Snapshot the six funnel counts at each upload — six integers a week — so next quarter reads "404 members · +31 since May". (c) Let the pastor set two or three goals in the sheet and draw them as a rule on the funnel. The spec's target refusal was aimed at a mockup's "% of target registered", not at a pastor's own stated goals; re-scope it rather than overturn it.
- **Suggested command:** `/impeccable shape`

### [P1] The vocabulary assumes habituation this reader will never have
- **What:** "D12" appears in the third metric tile and again as a funnel stage and is never expanded on screen (the expansion exists in `lib/dgroup.ts`). Also unglossed: DLeaders, "absorb", "seekers", "unrecorded", "walk-in", "no-show", "Registrants only", "Answered on the night: 42% of attendances", and the coined ranking term "thinnest room". The "Total" facet appears in two adjacent grids meaning registrations in one and attendances in the other. No glossary, no definition affordance, no hover explanation on any term.
- **Why it matters:** He is cold every single time and non-technical. "148 of them said they are willing to **absorb** new members" is the sentence about welcoming people into a spiritual family, written in the register of warehouse capacity planning.
- **Fix:** Relax the ≤6-word copy rule for this surface — it was calibrated for a habituated weekly operator who is now the secondary reader. Expand D12 on first use. Replace "absorb" with "take someone new". Add one plain-language finding line under each pastor-facing panel header; the source doc comments already contain better prose than the screen does ("capacity is not the constraint, the introduction is").
- **Suggested command:** `/impeccable clarify`

### [P2] The keyboard and screen-reader path is effectively unusable
- **What:** Measured: 227 focusable elements, **192 of them SVG chart hotspots** with no focus-visible ring of any kind. No skip link. The page's one genuine action ("All 32 movers in Players") is tab stop #211. The four headline metric tiles are `div`s, not headings — the outline jumps H1 "Discipleship Overview" → H2 "Matching market", skipping the entire summary. Both Count/Ratio switches share the identical `aria-label="Chart scale"`. Two H3s concatenate their badge with no separator, so screen readers announce **"Time of daytop choices differ"** and **"Runningthinnest room"** (`components/charts/butterfly.tsx:46`, `components/dashboard/show-up-by-sport-panel.tsx:109`). Roster view changes swap 12 rows with no live region. The roster `<th>`s carry no `scope`. Explanatory text is delivered via `title=` on non-focusable elements.
- **Measured contrast:** `ink-tertiary` at 12px carries real body copy in 22 places at **2.36:1 on the grey ground and 2.57:1 on white** — against DESIGN.md's own rule, which names 2.6:1 as the known-failing value and says tertiary is "never body copy". All 25 other colour/size groups pass (4.55:1 to 16.83:1).
- **Fix:** `tabindex="-1"` on chart rects, exposing their data through the "View as table" twin the design system already mandates; add a skip link; promote metric labels to headings; disambiguate the two switch labels; insert a separator in the two badge headings; move those 22 explanation lines from `ink-tertiary` to `ink-secondary`.
- **Suggested command:** `/impeccable audit`

### [P2] The largest panel on the page answers a scheduling question
- **What:** "What leaders offer, what seekers want" occupies 636px — the single largest panel — at 18% scroll depth, plotting meeting time (16 hourly rows × 2 wings), day, format and location. Its finding is that leaders prefer 1pm and seekers 5pm.
- **Why it matters:** A real and useful finding — for whoever schedules groups. At 636px on a discipleship dashboard it reads as the second most important thing in the ministry.
- **Fix:** Collapse it to one sentence in the pastor's view ("Leaders meet at 1pm; seekers want 5pm — the one place supply and demand disagree"), linking to the full four-dimension panel in the organiser section.
- **Suggested command:** `/impeccable distill`

## Persona Red Flags

**Pastor Dan (quarterly, cold, non-technical, cares about souls not sports)** — project-specific persona:
- Meets "D12" in the third headline tile with no idea what it is; meets it again 2,400px later as a funnel stage. Never explained.
- Reads that 148 leaders are "willing to absorb new members".
- Reads "Not in a group 489 — the rest have not been asked", then much later "Not recorded 320 / Not involved 121 / Seeking 48". Cannot reconcile 449 with 121; clicking 121 gives him 449 names.
- Reads "40 of 40 seekers have an eligible leader" in 34px at 15% depth and reasonably concludes placement is handled. Nothing on screen tells him 40 is 8% of the 489 unplaced.
- Scrolls 32 hourly bars about when groups meet before reaching anything about whether people are in groups.
- Reaches the page's answer to "is this working" and it reads 15 · 7 · 10, followed by the page blaming its own form.
- The most encouraging fact available — 126 people ready or praying about leading, against 187 existing leaders — sits in the narrowest column, second to last, at 28px, immediately followed by "A stock, not a flow".
- **His stated action is unavailable.** He wants to assign follow-ups to specific leaders; the dashboard offers no assignment of any kind.
- On his phone: 9.4 screens.

**Alex (impatient power user):** no URL state on any of the three switches, so no view is shareable or bookmarkable; no date scoping ever; no keyboard shortcuts on a page whose design system claims a Linear-fast register with kbd chips as a documented component; no export on this surface; `force-dynamic` with no cache means every reload is a full Sheets round-trip against a per-minute quota; 4.2 viewports with no in-page nav or anchors.

**Sam (accessibility):** 192 focusable chart rects before the primary action, none with a focus ring; no skip link; metric summary invisible to heading navigation; duplicate `aria-label="Chart scale"`; `title=`-only explanations on non-interactive elements; roster switch changes 12 rows with no `aria-live`; the funnel's "Not recorded" hatch is a visual-only distinction absent from its accessible name; 22 instances of body copy at 2.4–2.6:1.

## Minor Observations

- **The browser tab reads "B1G Sportship — Player Inventory"** — the `<title>` was never updated for this surface. The pastor's tab is labelled with an inventory tool.
- "17 game nights · through Aug 1" carries no year and no "as of".
- "22 of 79 leaders needed" parses in English as "22 of the 79 leaders are needed". Nobody needs 79. And 22 appears three times in one bar row in three different roles.
- Both sport grids default to Count. For the discipleship-mix grid, whose stated purpose is "which sport reaches the least-discipled people", **Ratio is the correct default** — Count just redraws sport size.
- Two adjacent panels use two undeclared denominators: the funnel's percentages are of 1,080 (including 320 unrecorded); the pipeline's are of 399 who answered. Neither bar states its base.
- "Separated 3 · 0%" — a rounded 0% beside a real count of 3 reads as a bug.
- "Church: CCF 768 · 71% / Other 240 · 22%" — the missing 7% is unnamed.
- "Where they work" lists WFH (12) among cities — a category mixed into a geography.
- The first metric tile ends with "158 registered for Aug 1" — a single-night operational figure in the page's first tile, for a reader who visits quarterly.
- 79.2% of text nodes on the page render at ≤12px (536 of 677).
- 226 of 227 interactive elements are smaller than 44×44 at 390px.
- `Sprout` on "Heading toward leading" is the one warm, ministry-register choice on the page, and it works — which is the clearest signal that the "deliberately not ministry-themed" north star is now in tension with this surface's reader.

## Questions to Consider

1. If the pastor may keep only one number, which is it — 404 in a group, 489 not, 320 never asked, or 15 moved up? The page has not decided. One of them should be in 34px and the other three should not.
2. Why is "40 of 40 matchable" the second-loudest statement on the page, when it means only 8% of the unplaced have ever been asked? Isn't the real headline "148 leaders have open arms and 449 people nobody has invited"?
3. If movement is unmeasurable because the form doesn't re-ask, is the most valuable thing this page could show a pastor a *button that fixes the form*, rather than nine panels reporting the consequences of not fixing it?
4. Should the pastor and the volunteer head share a URL at all? Different cadence, different question, different action.
5. Attendance is "only the funnel" by the user's own framing — so why does it own 4 of the 9 panels and both of the largest chart grids?
6. What would this page look like if it were allowed one sentence of argument? The project's best prose is in its source comments, invisible to its reader.
7. Is a quarterly page even a page? Four cold reads a year is closer to a briefing. Would one screen — five numbers, one chart, three names and a sentence — serve Pastor Dan better than 3,808 pixels?
