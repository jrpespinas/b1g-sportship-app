import { Suspense } from "react";
import { getPlayerDirectoryList } from "@/lib/player-directory";
import { isUnplaced } from "@/lib/dgroup";
import { PlayerWorklist } from "@/components/players/player-worklist";

// Rendered per request, over the same five-minute cached Sheets reads the
// dashboard uses (`lib/sheets.ts`). An upload drops the cache, so the
// directory never shows a roster older than the last write.
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getPlayerDirectoryList();
  const unplaced = players.filter((p) => isUnplaced(p.segment)).length;

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Players</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            {players.length > 0 ? (
              <>
                <span className="font-semibold text-ink">{unplaced.toLocaleString()}</span> of{" "}
                {players.length.toLocaleString()} players are in no discipleship group. Pick a list, narrow it, and
                take it with you.
              </>
            ) : (
              "No players yet — this fills in as soon as the first roster lands."
            )}
          </p>
        </header>

        <div className="mt-5">
          <Suspense>
            <PlayerWorklist players={players} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
