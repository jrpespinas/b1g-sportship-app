"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Signal, SignalList } from "@/components/ui/signal";
import { MetricPanel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import { formatName } from "@/lib/player-name";
import {
  checkAttendanceNight,
  commitAttendance,
  parseAndMatchAttendance,
  type CommitAttendanceResult,
  type ParseAttendanceResult,
} from "@/app/upload/actions";
import type { IncomingAttendanceRow } from "@/lib/types";
import type { AttendanceCandidate } from "@/lib/attendance";

type Step = "select" | "triage" | "summary";
type Summary = Extract<CommitAttendanceResult, { ok: true }>;

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * A candidate with its reasons. Name similarity is shown last on purpose: it
 * is the weakest predictor here, and leading with it would suggest the list is
 * ranked by spelling when it is ranked by roster evidence.
 */
function CandidateCard({
  candidate,
  strongest,
  onPick,
}: {
  candidate: AttendanceCandidate;
  strongest: boolean;
  onPick: () => void;
}) {
  const { player, signals, registeredSport } = candidate;
  return (
    <Panel emphasis={strongest}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{formatName(player)}</span>
            {strongest && <Badge tone="accent">Strongest</Badge>}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-secondary">
            {player.email}
            {player.mobileNumber ? ` · ${player.mobileNumber}` : ""}
          </div>
          {/* Unmet signals stay "unknown" rather than "failed": not
              registering for a night is how a walk-in looks, not a
              contradiction. Only the registration queue, where a phone can
              genuinely disagree, uses the failed state. */}
          <SignalList>
            <Signal state={signals.registeredThisNight ? "met" : "unknown"}>
              {signals.registeredThisNight ? "Registered for this night" : "Did not register this night"}
            </Signal>
            <Signal state={signals.sportMatches ? "met" : "unknown"}>
              {registeredSport ? `Registered ${registeredSport}` : "No sport registered"}
            </Signal>
            {signals.nicknameMatches && <Signal state="met">Goes by {player.nickname}</Signal>}
            <Signal state={signals.surnameSimilarity === 1 ? "met" : "unknown"}>
              {signals.surnameSimilarity === 1
                ? "Surname matches"
                : `Surname is close (${Math.round(signals.surnameSimilarity * 100)}%)`}
            </Signal>
            <Signal state={signals.nameSimilarity >= 0.86 ? "met" : "unknown"}>
              Full name {Math.round(signals.nameSimilarity * 100)}% alike
            </Signal>
          </SignalList>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={onPick}>
          Same person
        </Button>
      </div>
    </Panel>
  );
}

/** The analyst register's shell, shared by all three steps of this flow. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">{children}</div>
    </div>
  );
}

export function AttendanceFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("select");
  const [gameNightDate, setGameNightDate] = useState(todayISO());
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseAttendanceResult | null>(null);
  const [resolved, setResolved] = useState<Record<number, string | null>>({});
  const [index, setIndex] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      // The night has to exist before a bare name can be matched to anyone.
      const night = await checkAttendanceNight(gameNightDate);
      if (!night.found) {
        setError(
          `No game night on ${gameNightDate}. Attendance attaches to a night registration already created — upload that night's registration file first.`,
        );
        return;
      }
      if (night.alreadyUploaded) {
        setError(
          `Attendance for ${gameNightDate} was already uploaded (${night.gameNight.attendanceSourceFilename || "unnamed file"}). Re-uploading would overwrite it, so this is blocked.`,
        );
        return;
      }

      const form = new FormData();
      form.set("file", file);
      form.set("gameNightDate", gameNightDate);
      const result = await parseAndMatchAttendance(form);
      if (!result.ok) {
        setError(
          result.reason === "empty-file"
            ? "That file is empty."
            : `This doesn't look like a check-in list — no "Attendance" column found.`,
        );
        return;
      }
      setParsed(result);
      setIndex(0);
      setResolved({});
      if (result.ambiguous.length > 0) setStep("triage");
      else void finish(result, {});
    });
  }

  function finish(result: ParseAttendanceResult, decisions: Record<number, string | null>) {
    startTransition(async () => {
      const present = [
        ...result.matched.map((m) => ({ row: m.row, playerId: m.player.playerId })),
        ...result.ambiguous
          .map((a) => ({ row: a.row, playerId: decisions[a.row.rowIndex] ?? null }))
          .filter((x): x is { row: IncomingAttendanceRow; playerId: string } => x.playerId !== null),
      ];
      const committed = await commitAttendance({
        gameNightDate,
        sourceFilename: result.sourceFilename,
        rowCount: result.rowCount,
        present,
      });
      if (!committed.ok) {
        setError(
          committed.reason === "no-game-night"
            ? `No game night on ${committed.gameNightDate}.`
            : "Attendance for this night was already uploaded.",
        );
        setStep("select");
        return;
      }
      setSummary(committed);
      setStep("summary");
    });
  }

  function decide(row: IncomingAttendanceRow, playerId: string | null) {
    const next = { ...resolved, [row.rowIndex]: playerId };
    setResolved(next);
    if (!parsed) return;
    if (index + 1 < parsed.ambiguous.length) setIndex(index + 1);
    else void finish(parsed, next);
  }

  if (step === "summary" && summary) {
    const rate = summary.registered > 0 ? Math.round((summary.attended / summary.registered) * 100) : 0;
    return (
      <Shell>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Attendance recorded.</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
          {summary.gameNight.gameNightDate} — <span className="font-semibold text-ink">{rate}%</span> of the people
          who registered actually came.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPanel label="Registered" value={summary.registered} note="Signed up for this night on the form." />
          <MetricPanel label="Checked in" value={summary.attended} note="Matched to a name on the door list." />
          <MetricPanel
            label="Registered, no-show"
            value={summary.noShows}
            accent
            note="Signed up and did not attend. This gap is the reason the check-in file exists."
          />
          <MetricPanel
            label="Attended without registering"
            value={summary.walkIns}
            note="Checked in with no registration for this night."
          />
        </div>
        <div className="mt-4 flex gap-3">
          <Button
            size="sm"
            onClick={() => {
              setStep("select");
              setFile(null);
              setParsed(null);
              setSummary(null);
            }}
          >
            Upload another
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to file types
          </Button>
        </div>
      </Shell>
    );
  }

  if (step === "triage" && parsed) {
    const item = parsed.ambiguous[index];
    return (
      <Shell>
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Who is this?</h1>
          <Badge tone="accent" className="tabular-nums">
            {index + 1} of {parsed.ambiguous.length}
          </Badge>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
          This name on the door list doesn&apos;t match anyone exactly. The check-in list carries no email, so a
          person has to make the call.
        </p>

        <Panel className="mt-5">
          <PanelHeader title="On the check-in list" />
          <div className="p-5">
            <div className="text-[15px] font-semibold text-ink">{item.row.raw}</div>
            <div className="mt-1 text-[13px] text-ink-secondary">
              {item.row.sport ?? "No sport marked"} · checked in {item.row.checkedInAt.slice(11, 16) || "—"}
            </div>
          </div>
        </Panel>

        {item.candidates.length === 0 ? (
          <Panel className="mt-3 p-5">
            <p className="text-[13px] text-ink-secondary">
              Nobody in the inventory is a plausible match for this name. Skip it — walk-ins are not added from
              here.
            </p>
          </Panel>
        ) : (
          <div className="mt-3 space-y-3">
            {item.candidates.map((candidate, rank) => (
              <CandidateCard
                key={candidate.player.playerId}
                candidate={candidate}
                strongest={rank === 0}
                onPick={() => decide(item.row, candidate.player.playerId)}
              />
            ))}
          </div>
        )}

        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={() => decide(item.row, null)} disabled={pending}>
            Not in the inventory — skip
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-[5px] text-[13px] font-medium text-ink-secondary outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} />
        Back
      </button>

      <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-ink">Upload a check-in list</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
        Who actually turned up, as recorded at the door. This attaches to a game night registration already
        created — it never makes a new one.
      </p>

      <Panel className="mt-5">
        <PanelHeader
          title="Which night, and which file"
          subtitle="The date has to match a night already in the estate, or there is nobody to match these names against."
        />
        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-medium text-ink-secondary" htmlFor="attendance-date">
              Game night
            </label>
            <input
              id="attendance-date"
              type="date"
              value={gameNightDate}
              onChange={(e) => setGameNightDate(e.target.value)}
              className="mt-1.5 w-full rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-secondary" htmlFor="attendance-file">
              Check-in file
            </label>
            <input
              id="attendance-file"
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="mt-1.5 w-full rounded-[8px] border border-dashed border-border bg-surface px-3 py-1.5 text-[13px] text-ink-secondary file:mr-3 file:rounded-[6px] file:border-0 file:bg-surface-subtle file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-ink"
            />
            {file && (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-secondary">
                <FileSpreadsheet className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {file.name}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-5 flex gap-2 rounded-[8px] border border-danger bg-danger-tint p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} aria-hidden />
            <p className="text-[13px] leading-relaxed text-ink">{error}</p>
          </div>
        )}

        <div className="border-t border-border px-5 py-3">
          <Button size="sm" onClick={begin} disabled={!file || pending}>
            {pending ? "Matching…" : "Match the check-in list"}
          </Button>
        </div>
      </Panel>

      {parsed && !error && (
        <Panel className="mt-3 flex items-center gap-2 p-4">
          <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
          <p className="text-[13px] text-ink-secondary">
            {parsed.matched.length} of {parsed.rowCount} matched automatically
            {parsed.duplicateCount > 0 &&
              `, ${parsed.duplicateCount} duplicate check-in${parsed.duplicateCount === 1 ? "" : "s"} collapsed`}
            .
          </p>
        </Panel>
      )}
    </Shell>
  );
}
