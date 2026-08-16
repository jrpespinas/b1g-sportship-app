import Link from "next/link";
import { ArrowLeft, CalendarDays, HeartHandshake, UserRound } from "lucide-react";
import { GenderMark } from "@/components/ui/gender-mark";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { getPlayerDetail } from "@/lib/player-directory";
import { getDGroupCategoryTone, isWillingToAbsorb } from "@/lib/dgroup";
import { formatName } from "@/lib/player-name";

export const dynamic = "force-dynamic";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-ink-secondary">{label}</div>
      <div className="mt-0.5 text-[13px] text-ink">{value?.trim() || "—"}</div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/players"
      className="inline-flex items-center gap-1.5 rounded-[5px] text-[13px] font-medium text-ink-secondary outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Back to players
    </Link>
  );
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPlayerDetail(id);

  if (!detail) {
    return (
      <div className="min-h-screen bg-page">
        <div className="mx-auto w-full max-w-[880px] px-6 py-8">
          <BackLink />
          <Panel className="mt-5 flex h-[200px] flex-col items-center justify-center gap-1 border-dashed p-5 text-center">
            <div className="text-[13px] font-medium text-ink">Player not found.</div>
            <div className="text-[12px] text-ink-secondary">
              This link may be out of date — they may have been merged or removed.
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  const { player, dgroupCategory, history, movement } = detail;

  // Standing as answered on each night, keyed by the night itself. A night
  // that is absent here is one this person did not re-answer on — the form
  // lets a returning registrant keep their previous answers, and most do.
  const standingByNight = new Map(movement?.points.map((p) => [p.gameNightId, p]) ?? []);
  const changeNights = new Set(movement?.changes.map((c) => c.to.gameNightId) ?? []);

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[880px] px-6 py-8">
        <BackLink />

        <header className="mt-4">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">{formatName(player)}</h1>
          <p className="mt-1 text-[13px] text-ink-secondary">{player.email}</p>
        </header>

        <Panel className="mt-5">
          <PanelHeader icon={HeartHandshake} title="Discipleship" subtitle="Their current standing, as of the last form they filled in." />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getDGroupCategoryTone(dgroupCategory)}>{dgroupCategory}</Badge>
              {isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb) && (
                <Badge tone="success">Willing to absorb members</Badge>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Interested in joining a DGroup" value={player.dgroupInterestedInJoining} />
              <Field label="Part of a Discipleship Group" value={player.dgroupMemberStatus} />
            </div>

            {movement && movement.changes.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="text-[12px] font-medium text-ink-secondary">Recorded changes</div>
                <ul className="mt-2 space-y-1.5">
                  {movement.changes.map((change) => (
                    <li key={change.to.gameNightId} className="text-[13px] text-ink">
                      <span className="tabular-nums text-ink-secondary">{formatDate(change.to.date)}</span>{" "}
                      {change.from.category} → <span className="font-medium">{change.to.category}</span>
                      {change.ambiguousWording && (
                        <span className="text-ink-secondary">
                          {" "}
                          — these two options overlap in wording, so this may be a reading of the question rather
                          than a real move
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {movement.roundTrip && (
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
                    This person returned to a standing they had already held, so the sequence is more likely
                    inconsistent answering than a journey.
                  </p>
                )}
              </div>
            )}
          </div>
        </Panel>

        <Panel className="mt-4">
          <PanelHeader icon={UserRound} title="Identity" />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Nickname" value={player.nickname} />
            <Field label="Mobile number" value={player.mobileNumber} />
            <div>
              <div className="text-[12px] font-medium text-ink-secondary">Gender</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink">
                <GenderMark gender={player.gender} />
                {player.gender?.trim() || "—"}
              </div>
            </div>
            <Field label="Civil status" value={player.civilStatus} />
            <div className="sm:col-span-2">
              <Field label="Church affiliation" value={player.churchAffiliation} />
            </div>
          </div>
        </Panel>

        <Panel className="mt-4">
          <PanelHeader
            icon={CalendarDays}
            title="Participation history"
            subtitle={`${history.length} ${history.length === 1 ? "game night" : "game nights"}, most recent first.`}
          />
          {history.length === 0 ? (
            <div className="flex h-[120px] items-center justify-center p-5 text-[13px] text-ink-secondary">
              No game nights recorded yet.
            </div>
          ) : (
            <div className="relative">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-ink-secondary">
                      <th className="py-2.5 pl-5 font-medium">Game night</th>
                      <th className="py-2.5 font-medium">Sport</th>
                      <th className="py-2.5 font-medium">Standing that night</th>
                      <th className="py-2.5 pr-5 font-medium">First time?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(({ participation, gameNight }) => {
                      const standing = standingByNight.get(participation.gameNightId);
                      const isChange = changeNights.has(participation.gameNightId);
                      return (
                        <tr key={participation.participationId} className="border-b border-border last:border-0">
                          <td className="py-2.5 pl-5 font-medium tabular-nums text-ink">
                            {formatDate(gameNight?.gameNightDate)}
                          </td>
                          <td className="py-2.5 text-ink">{participation.sportSelected}</td>
                          <td className="py-2.5">
                            {standing ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-ink">{standing.category}</span>
                                {isChange && <Badge tone="success">Changed</Badge>}
                              </span>
                            ) : (
                              // Not "—": a blank here means they declined to
                              // re-answer, which is normal, not missing data.
                              <span className="text-ink-secondary">Not re-asked</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-5">
                            {participation.isFirstParticipation ? <Badge tone="accent">First time</Badge> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-surface sm:hidden"
                aria-hidden
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
