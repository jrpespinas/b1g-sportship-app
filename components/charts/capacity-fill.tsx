import { GenderMark } from "@/components/ui/gender-mark";

export interface CapacityRow {
  gender: string;
  seekers: number;
  capacity: number;
  /** Seekers with at least one eligible leader, when the caller has scored it. */
  matchable?: number;
}

/**
 * How much of the available capacity the people waiting would actually use.
 *
 * One bar per gender: the whole bar is every leader who said they can take
 * someone, and the filled portion is the seekers who would claim a place. The
 * emptiness is the finding — capacity is not the constraint, and a bar that is
 * three-quarters unfilled says so before anyone reads a number.
 *
 * **Replaces a dumbbell** (2026-08-14, at the user's request: it was hard to
 * read). Two dots on a connector made the reader decode a distance, and the
 * scale maximum was silently the largest figure across *both* rows, so the
 * female row stopped short of the right edge for a reason that was nowhere on
 * screen. Here each bar is its own denominator, which is not a shortcut: the
 * ministry does not mix groups, so a male surplus cannot place a female
 * seeker and the two markets are never a single scale. Comparison across the
 * rows is by fill share, which is exactly the comparison that means something.
 *
 * Colour reuses what the page has already taught: burnt orange is the seeker
 * everywhere on this dashboard, and green is capacity and placement — the one
 * place green survives the blue-and-orange restriction. Together they are a
 * true part-to-whole.
 *
 * One seeker is counted against one leader, which is the conservative floor:
 * 126 leaders stated a capacity above one, so "leaders spare" understates the
 * real room rather than inflating it.
 */
const SEEKING = "var(--color-seg-seekers)";
const SPARE = "var(--color-success)";

export function CapacityFill({
  rows,
  className = "p-5",
}: {
  rows: CapacityRow[];
  /** Callers that already own the padding pass their own spacing. */
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-4 text-[13px] text-ink-secondary">
        No gender recorded yet, so seekers and leaders cannot be paired.
      </p>
    );
  }

  return (
    <div className={className}>
      <ul className="space-y-4">
        {rows.map((row) => {
          const spare = row.capacity - row.seekers;
          const short = spare < 0;
          // Never past the full bar: when demand exceeds supply the bar is
          // full and the shortfall is stated in words, because a fill cannot
          // draw more than the whole it belongs to.
          const filled = row.capacity > 0 ? Math.min(1, row.seekers / row.capacity) : 1;

          return (
            <li key={row.gender}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                  <GenderMark gender={row.gender} />
                  {row.gender}
                </span>
                <span className="text-[12px] tabular-nums text-ink-secondary">
                  {short ? (
                    <>
                      <span className="font-semibold text-accent-ink">{Math.abs(spare)}</span> more
                      leaders needed
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-ink">
                        {row.seekers} of {row.capacity}
                      </span>{" "}
                      leaders needed
                    </>
                  )}
                </span>
              </div>

              <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
                <span
                  className="block h-full"
                  style={{ width: `${filled * 100}%`, backgroundColor: SEEKING }}
                />
                <span className="block h-full flex-1" style={{ backgroundColor: SPARE }} />
              </div>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
                <span className="flex items-baseline gap-1.5 tabular-nums">
                  <span
                    className="inline-block size-2 shrink-0 translate-y-[-1px] rounded-[2px]"
                    style={{ backgroundColor: SEEKING }}
                    aria-hidden
                  />
                  <span className="font-medium text-ink">{row.seekers}</span> seeking
                </span>
                {!short && (
                  <span className="flex items-baseline gap-1.5 tabular-nums">
                    <span
                      className="inline-block size-2 shrink-0 translate-y-[-1px] rounded-[2px]"
                      style={{ backgroundColor: SPARE }}
                      aria-hidden
                    />
                    <span className="font-medium text-ink">{spare}</span> leaders spare
                  </span>
                )}
                {row.matchable != null && (
                  <span className="tabular-nums">
                    <span className="font-medium text-ink">
                      {row.matchable} of {row.seekers}
                    </span>{" "}
                    with an eligible leader
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
