"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Link2, RefreshCw } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { attachSheet, readSheetNow, type SheetStatus } from "@/app/game-nights/actions";

/**
 * The door sheet a night reads from, and what it holds right now.
 *
 * Attaching is separate from importing on purpose. A link attached before the
 * night has nothing to import yet — the import refuses an empty sheet, because
 * a night committed with zero arrivals reads forever as "everybody stayed
 * home" rather than "the night has not happened". So this panel stores the
 * link and watches it fill; the import stays a deliberate act once the night
 * is over.
 *
 * Refresh is a button, not a timer. It states the time it read, so a stale
 * number can never pass itself off as live, and it spends a Sheets read only
 * when somebody is actually looking.
 */
export function DoorSheet({
  gameNightId,
  gameNightDate,
  initialUrl,
  canEdit,
}: {
  gameNightId: string;
  gameNightDate: string;
  initialUrl?: string;
  /** Attaching is a write, so it needs the admin credential. Reading does not. */
  canEdit: boolean;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<SheetStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const attached = (initialUrl ?? "").trim().length > 0;

  function save() {
    startTransition(async () => {
      setStatus(await attachSheet(gameNightId, gameNightDate, url));
      router.refresh();
    });
  }

  function refresh() {
    startTransition(async () => {
      setStatus(await readSheetNow(gameNightDate, url.trim()));
      // The roster below reads the same sheet on the server, so refreshing the
      // count without refreshing the page would leave the table showing an
      // older door than the number above it.
      router.refresh();
    });
  }

  return (
    // No outer margin. Spacing between panels belongs to whatever lays them
    // out — carrying `mt-3` here put this panel 12px below the one beside it
    // in the same grid row, because the grid's own gap was already doing the
    // job.
    <Panel>
      <PanelHeader
        icon={Link2}
        title="Door check-in sheet"
        subtitle="Read live while the night runs. Nothing is recorded until the check-ins are imported."
        action={
          attached ? (
            <Button variant="secondary" size="sm" onClick={refresh} disabled={pending}>
              <RefreshCw className="size-3.5" strokeWidth={2} aria-hidden />
              {pending ? "Reading…" : "Refresh"}
            </Button>
          ) : undefined
        }
      />

      <div className="p-5">
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              aria-label="Google Sheet the door form writes into"
              className="min-w-[220px] flex-1 rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
            />
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Checking…" : attached ? "Update" : "Attach"}
            </Button>
          </div>
        ) : attached ? (
          <p className="text-[13px] text-ink-secondary">A check-in sheet is attached to this night.</p>
        ) : (
          <p className="text-[13px] text-ink-secondary">
            No check-in sheet attached. An admin can add one.
          </p>
        )}

        {status?.error && (
          <p className="mt-3 flex items-start gap-1.5 text-[13px] text-danger" role="alert">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {status.error}
          </p>
        )}

        {status?.ok && (
          <p className="mt-3 text-[13px] text-ink-secondary" aria-live="polite">
            <span className="font-semibold tabular-nums text-ink">{status.count}</span>{" "}
            {status.count === 1 ? "check-in" : "check-ins"} so far
            {status.tabTitle ? ` in “${status.tabTitle}”` : ""} · as of {status.asOf}
          </p>
        )}

        {attached && !status && (
          <p className="mt-3 text-[13px] text-ink-secondary">
            Attached. Press Refresh to see how many have checked in.
          </p>
        )}
      </div>
    </Panel>
  );
}
