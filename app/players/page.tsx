import { Suspense } from "react";
import { getPlayerDirectoryList } from "@/lib/player-directory";
import { PlayerDirectoryTable } from "@/components/players/player-directory-table";

// Reads live off the Sheet on every request, same as the dashboard — this
// list has no cache to invalidate.
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getPlayerDirectoryList();

  return (
    <div className="mx-auto w-full max-w-[960px] px-6 py-16 sm:py-20">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Players</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">
        {players.length} {players.length === 1 ? "player" : "players"} in the inventory.
      </p>

      <div className="mt-8">
        <Suspense>
          <PlayerDirectoryTable players={players} />
        </Suspense>
      </div>
    </div>
  );
}
