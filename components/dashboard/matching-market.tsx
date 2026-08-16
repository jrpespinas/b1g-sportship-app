import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { CapacityFill } from "@/components/charts/capacity-fill";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { MatchingMarket } from "@/lib/dashboard-metrics";

/**
 * Can the people asking for a group be placed?
 *
 * The answer is yes, for everyone — so the panel is built around the
 * abundance rather than around a yes/no. What is missing is not capacity but
 * the introduction, and the one control here is the link to the board where
 * an introduction gets made.
 *
 * The per-seeker candidate-depth distribution was built here and removed on
 * request (2026-08-14). `getMatchingMarket` still returns `candidateCounts`,
 * `min`, `median` and `max` for anything that wants the evidence back.
 *
 * Gender is split because groups are not mixed: a surplus of male leaders
 * cannot cover a shortfall of female ones, so the combined figure would
 * describe a market that does not exist — and it is why each bar is its own
 * denominator rather than sharing one scale.
 */
export function MatchingMarketPanel({ market }: { market: MatchingMarket }) {
  if (market.seekers === 0) {
    return (
      <Panel className="mt-3">
        <PanelHeader title="Matching market" icon={HeartHandshake} />
        <p className="px-5 py-4 text-[13px] text-ink-secondary">
          Nobody is currently asking for a group.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="mt-3">
      <PanelHeader
        title="Matching market"
        icon={HeartHandshake}
        subtitle="Same gender · shared day"
        action={
          <Link
            href="/match"
            className="inline-flex items-center rounded-[5px] text-[13px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:min-h-11"
          >
            Match board
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 p-5 lg:grid-cols-[220px_1fr]">
        <div>
          <div className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {market.matchable} of {market.seekers}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            seekers have an eligible leader
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
            {market.leaders} leaders said they are willing to absorb members.
          </p>
        </div>

        <CapacityFill
          className=""
          rows={market.byGender.map((row) => ({
            gender: row.gender,
            seekers: row.seekers,
            capacity: row.leaders,
            matchable: row.matchable,
          }))}
        />
      </div>

    </Panel>
  );
}
