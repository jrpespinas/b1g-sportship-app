import { listPlayers } from "@/lib/store";
import { buildMatchBoard, isLeaderWithCapacity, matchTotals, toSlimBoard } from "@/lib/matching";
import { MatchBoard } from "@/components/match/match-board";
import { MetricPanel } from "@/components/dashboard/panel";
import { Panel } from "@/components/ui/panel";

// Rendered per request, over the cached Sheets reads every surface shares
// (`lib/sheets.ts`). An upload drops the cache.
export const dynamic = "force-dynamic";

/** Candidates kept per seeker. Enough to choose from; far short of all 148. */
const KEEP_CANDIDATES = 12;

export default async function MatchPage() {
  const players = await listPlayers();
  const board = buildMatchBoard(players);
  const totals = matchTotals(board, players.filter(isLeaderWithCapacity).length);
  const slim = toSlimBoard(board, KEEP_CANDIDATES);

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Placing seekers</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            {totals.seekers > 0 ? (
              <>
                <span className="font-semibold text-ink">{totals.seekers}</span> people asked for a discipleship
                group. <span className="font-semibold text-ink">{totals.leaders}</span> leaders said they can take
                someone. Hardest to place first.
              </>
            ) : (
              "Nobody is currently asking for a group."
            )}
          </p>
        </header>

        {totals.seekers > 0 && (
          <>
            {/* Same metric vocabulary as the dashboard: each figure carries its
                own explanation line rather than one paragraph beside them all. */}
            <div
              className={`mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                totals.blocked > 0 ? "xl:grid-cols-4" : "xl:grid-cols-3"
              }`}
            >
              <MetricPanel
                label="Strong match available"
                value={totals.strong}
                note="Everything that could be judged agrees. Send the shortlist and make the introduction."
              />
              <MetricPanel
                label="Workable, one difference"
                value={totals.workable}
                note="One criterion differs — most often the hour. Read the row and decide whether it matters."
              />
              <MetricPanel
                label="Needs a judgement call"
                value={totals.hard}
                note="Two or more differ. Worth a conversation before an introduction, not an automatic pass."
              />
              {totals.blocked > 0 && (
                <MetricPanel
                  label="Nobody to suggest"
                  value={totals.blocked}
                  accent
                  note="A required condition closed the pool. These are groups that need planting, or answers that need asking."
                />
              )}
            </div>

            <Panel className="mt-3 p-5">
              <p className="text-[13px] leading-relaxed text-ink-secondary">
                <span className="font-medium text-ink">Two things are required, not scored.</span> Men are placed
                with men and women with women, and a leader must meet on a day the seeker is free — a group that
                meets when you cannot come is not a worse match, it is not a match. Neither pairing is ever built
                or shown. Within what is left, four things are scored: place, format, age, and time. Nobody is
                filtered on those four, because requiring all of them to agree would match nobody at all. Age and
                time are read from free text a person typed, so both are shown as compared, not just scored.
              </p>
            </Panel>

            <div className="mt-3">
              <MatchBoard board={slim} />
            </div>
          </>
        )}

        {totals.seekers === 0 && (
          <Panel className="mt-5 flex h-[240px] items-center justify-center border-dashed p-5 text-center text-[13px] text-ink-secondary">
            Nobody is currently seeking a group. This fills in as people ask to join one.
          </Panel>
        )}
      </div>
    </div>
  );
}
