import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlayerDetail } from "@/lib/player-directory";
import { getDGroupCategoryTone, isWillingToAbsorb } from "@/lib/dgroup";

export const dynamic = "force-dynamic";

function displayName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[13px] font-medium text-ink-secondary">{label}</div>
      <div className="mt-1 text-[15px] text-ink">{value?.trim() || "—"}</div>
    </div>
  );
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPlayerDetail(id);

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-20">
        <Link
          href="/players"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to players
        </Link>
        <Card className="mt-6 flex h-[200px] flex-col items-center justify-center gap-1 border-dashed p-5 text-center">
          <div className="text-[15px] text-ink">Player not found.</div>
          <div className="text-[13px] text-ink-tertiary">This link may be out of date — they may have been merged or removed.</div>
        </Card>
      </div>
    );
  }

  const { player, dgroupCategory, history } = detail;

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-20">
      <Link
        href="/players"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} />
        Back to players
      </Link>

      <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-ink">{displayName(player)}</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">{player.email}</p>

      <section className="mt-8">
        <h2 className="text-[13px] font-medium text-ink-secondary">Identity</h2>
        <Card className="mt-2.5 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Nickname" value={player.nickname} />
          <Field label="Mobile number" value={player.mobileNumber} />
          <Field label="Gender" value={player.gender} />
          <Field label="Civil status" value={player.civilStatus} />
          <div className="sm:col-span-2">
            <Field label="Church affiliation" value={player.churchAffiliation} />
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="text-[13px] font-medium text-ink-secondary">Discipleship</h2>
        <Card className="mt-2.5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={getDGroupCategoryTone(dgroupCategory)}>{dgroupCategory}</Badge>
            {isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb) && (
              <Badge tone="success">Willing to absorb members</Badge>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Interested in joining a DGroup" value={player.dgroupInterestedInJoining} />
            <Field label="Part of a Discipleship Group" value={player.dgroupMemberStatus} />
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="text-[13px] font-medium text-ink-secondary">
          Participation history ({history.length} {history.length === 1 ? "game night" : "game nights"})
        </h2>
        {history.length === 0 ? (
          <Card className="mt-2.5 flex h-[120px] items-center justify-center border-dashed p-5 text-[13px] text-ink-tertiary">
            No game nights recorded yet.
          </Card>
        ) : (
          <Card className="relative mt-2.5 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-ink-secondary">
                    <th className="py-3 pl-5 font-medium">Game night</th>
                    <th className="py-3 font-medium">Sport</th>
                    <th className="py-3 font-medium">Skill level</th>
                    <th className="py-3 pr-5 font-medium">First time?</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(({ participation, gameNight }) => (
                    <tr key={participation.participationId} className="border-b border-border last:border-0">
                      <td className="py-3 pl-5 font-medium text-ink">{formatDate(gameNight?.gameNightDate)}</td>
                      <td className="py-3 text-ink">{participation.sportSelected}</td>
                      <td className="py-3 text-ink-secondary">{participation.skillLevel || "—"}</td>
                      <td className="py-3 pr-5">
                        {participation.isFirstParticipation ? <Badge tone="accent">First time</Badge> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-surface sm:hidden"
              aria-hidden
            />
          </Card>
        )}
      </section>
    </div>
  );
}
