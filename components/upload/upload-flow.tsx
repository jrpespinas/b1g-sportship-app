"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  FileSpreadsheet,
  // `History` is also a DOM lib global, and the global wins at the use site.
  History as HistoryIcon,
  RotateCcw,
  SkipForward,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Signal, SignalList } from "@/components/ui/signal";
import { MetricPanel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import { displayNickname, formatNameNatural } from "@/lib/player-name";
import {
  compareMobile,
  maskMobile,
  type MobileVerdict,
  type PlayerHistory,
} from "@/lib/candidate-evidence";
import {
  commitBatch,
  parseAndMatch,
  type ParseAndMatchError,
  type ParseAndMatchResult,
  type CommitBatchResult,
} from "@/app/upload/actions";
import type { GameNight, IncomingRow, MatchOutcome, Player, ReviewAction } from "@/lib/types";

type Step = "select" | "triage" | "duplicate" | "summary";

/** The success half of the commit result — the only shape the summary renders. */
type CommitSummary = Extract<CommitBatchResult, { ok: true }>;

type AmbiguousItem = Extract<MatchOutcome, { kind: "ambiguous" }>;

interface Resolution {
  row: IncomingRow;
  candidates: Player[];
  action: ReviewAction;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UploadFlow() {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [gameNightDate, setGameNightDate] = useState(todayIso());
  const [uploadedBy, setUploadedBy] = useState("");
  const [error, setError] = useState<ParseAndMatchError | null>(null);
  const [matchResult, setMatchResult] = useState<ParseAndMatchResult | null>(null);
  const [triageIndex, setTriageIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [summary, setSummary] = useState<CommitSummary | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<GameNight | null>(null);
  const [pendingCommit, setPendingCommit] = useState<{
    result: ParseAndMatchResult;
    resolutions: Resolution[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ambiguousQueue = matchResult?.ambiguous ?? [];
  const currentAmbiguous: AmbiguousItem | undefined = ambiguousQueue[triageIndex];

  function reset() {
    setStep("select");
    setFile(null);
    setGameNightDate(todayIso());
    setError(null);
    setMatchResult(null);
    setTriageIndex(0);
    setResolutions([]);
    setSummary(null);
    setDuplicateOf(null);
    setPendingCommit(null);
  }

  function handleSubmitFile() {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await parseAndMatch(formData);
      if (!result.ok) {
        setError(result);
        return;
      }
      setMatchResult(result);
      if (result.ambiguous.length === 0) {
        void finishBatch(result, []);
      } else {
        setStep("triage");
      }
    });
  }

  function finishBatch(
    result: ParseAndMatchResult,
    finalResolutions: Resolution[],
    allowDuplicateDate = false,
  ) {
    startTransition(async () => {
      const outcome = await commitBatch({
        gameNightDate,
        sourceFilename: result.sourceFilename,
        rowCount: result.rowCount,
        autoConfirmed: result.autoConfirmed,
        ambiguous: finalResolutions.map((r) => ({
          row: r.row,
          candidates: r.candidates,
          action: r.action,
        })),
        uploadedBy: uploadedBy.trim() || "Admin",
        allowDuplicateDate,
      });

      if (!outcome.ok) {
        // Nothing was written. Hold the reviewed batch so confirming re-runs
        // the exact same work instead of making the admin triage it twice.
        setPendingCommit({ result, resolutions: finalResolutions });
        setDuplicateOf(outcome.existing);
        setStep("duplicate");
        return;
      }

      setSummary(outcome);
      setStep("summary");
    });
  }

  function resolveCurrent(action: ReviewAction) {
    if (!currentAmbiguous || !matchResult) return;
    const nextResolutions = [
      ...resolutions,
      { row: currentAmbiguous.row, candidates: currentAmbiguous.candidates, action },
    ];
    setResolutions(nextResolutions);

    const nextIndex = triageIndex + 1;
    if (nextIndex < ambiguousQueue.length) {
      setTriageIndex(nextIndex);
    } else {
      void finishBatch(matchResult, nextResolutions);
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
      {step === "select" && (
        <SelectStep
          file={file}
          setFile={setFile}
          gameNightDate={gameNightDate}
          setGameNightDate={setGameNightDate}
          uploadedBy={uploadedBy}
          setUploadedBy={setUploadedBy}
          error={error}
          isPending={isPending}
          onSubmit={handleSubmitFile}
          fileInputRef={fileInputRef}
        />
      )}

      {step === "triage" && currentAmbiguous && (
        <TriageStep
          item={currentAmbiguous}
          histories={matchResult?.histories ?? {}}
          index={triageIndex}
          total={ambiguousQueue.length}
          isPending={isPending}
          onResolve={resolveCurrent}
        />
      )}

      {step === "duplicate" && duplicateOf && (
        <DuplicateStep
          existing={duplicateOf}
          gameNightDate={gameNightDate}
          isPending={isPending}
          onCancel={reset}
          onConfirm={() => {
            if (!pendingCommit) return;
            finishBatch(pendingCommit.result, pendingCommit.resolutions, true);
          }}
        />
      )}

      {step === "summary" && summary && matchResult && (
        <SummaryStep summary={summary} matchResult={matchResult} onReset={reset} />
        )}
      </div>
    </div>
  );
}

function SelectStep({
  file,
  setFile,
  gameNightDate,
  setGameNightDate,
  uploadedBy,
  setUploadedBy,
  error,
  isPending,
  onSubmit,
  fileInputRef,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  gameNightDate: string;
  setGameNightDate: (d: string) => void;
  uploadedBy: string;
  setUploadedBy: (v: string) => void;
  error: ParseAndMatchError | null;
  isPending: boolean;
  onSubmit: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div>
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        Upload this week&apos;s roster
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        Select the game night export and confirm the date. Known players are matched
        automatically — you&apos;ll only be asked about the ones we can&apos;t place with confidence.
      </p>

      <div
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-12 text-center transition-colors duration-150 ${
          isDragOver ? "border-accent bg-accent-tint" : "border-border hover:border-border-strong"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex size-11 items-center justify-center rounded-full bg-accent-tint text-accent-ink">
          <FileSpreadsheet className="size-5" strokeWidth={1.75} />
        </div>
        {file ? (
          <div>
            <div className="text-[15px] font-medium text-ink">{file.name}</div>
            <div className="mt-0.5 text-[13px] text-ink-tertiary">
              {(file.size / 1024).toFixed(0)} KB — click to replace
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[15px] font-medium text-ink">Drop the .xlsx export here</div>
            <div className="mt-0.5 text-[13px] text-ink-tertiary">or click to browse</div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-danger-tint px-4 py-3 text-[13px] text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <div>
            {error.reason === "empty-file" && <p>Choose a file before processing.</p>}
            {error.reason === "missing-columns" && (
              <>
                <p className="font-medium">This file is missing required columns.</p>
                <p className="mt-0.5 text-danger/80">
                  Expected: {error.missingColumns?.join(", ")}. Nothing was processed — fix the
                  export and try again.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
            <Calendar className="size-3.5" strokeWidth={2} />
            Game night date
          </span>
          <input
            type="date"
            value={gameNightDate}
            onChange={(e) => setGameNightDate(e.target.value)}
            className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-secondary">
            Your name (optional)
          </span>
          <input
            type="text"
            value={uploadedBy}
            onChange={(e) => setUploadedBy(e.target.value)}
            placeholder="Admin"
            className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
      </div>

      <Button
        className="mt-5"
        disabled={!file || isPending}
        onClick={onSubmit}
      >
        {isPending ? "Matching against player history…" : "Process roster"}
        {!isPending && <ArrowRight className="size-4" strokeWidth={2} />}
      </Button>
    </div>
  );
}

function wordDiffers(a: string, b: string): boolean {
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
}

const diffMark = "text-accent-ink underline decoration-accent decoration-2 underline-offset-4";

/** Highlights whichever of first/last name actually differs from `other`. */
function NameWithDiff({
  firstName,
  lastName,
  otherFirstName,
  otherLastName,
}: {
  firstName: string;
  lastName: string;
  otherFirstName: string;
  otherLastName: string;
}) {
  const firstDiffers = wordDiffers(firstName, otherFirstName);
  const lastDiffers = wordDiffers(lastName, otherLastName);
  return (
    <>
      <span className={firstDiffers ? diffMark : undefined}>{firstName}</span>{" "}
      <span className={lastDiffers ? diffMark : undefined}>{lastName}</span>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border-strong bg-surface-subtle px-1 font-sans text-[11px] font-medium text-ink-tertiary">
      {children}
    </kbd>
  );
}

/**
 * A dot-separated meta line whose separators travel with the segment that
 * follows them, so a wrap at 390px cannot strand a "·" at the end of a line.
 */
function MetaLine({ parts }: { parts: Array<string | false | undefined> }) {
  const kept = parts.filter((part): part is string => !!part);
  return (
    <div className="mt-1 flex flex-wrap gap-y-1 text-[13px] text-ink-secondary">
      {kept.map((part, i) => (
        <span key={part}>
          {i > 0 && <span className="mx-2 text-ink-tertiary">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}

/**
 * How often this person has turned up, in one line.
 *
 * Registered and came are held apart because they differ by a third across
 * the season, and the difference is exactly what tells an established regular
 * from a single stray row — and a single stray row is usually the mis-keyed
 * duplicate you are being asked about.
 */
function HistoryLine({ history }: { history?: PlayerHistory }) {
  if (!history || history.nightsRegistered === 0) {
    return (
      <div className="mt-2 text-[12px] text-ink-tertiary">No nights on record for this player.</div>
    );
  }

  const nights = `${history.nightsRegistered} ${history.nightsRegistered === 1 ? "night" : "nights"} registered`;
  const came =
    history.nightsAttended > 0
      ? `came to ${history.nightsAttended}`
      : "never checked in at the door";

  const rest = [came, history.lastRegisteredDate && `last ${history.lastRegisteredDate}`, history.frequentSport]
    .filter((part): part is string => !!part);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-secondary">
      <HistoryIcon className="size-3 shrink-0 text-ink-tertiary" strokeWidth={2} aria-hidden />
      <span className="tabular-nums text-ink">{nights}</span>
      {/* Each separator travels with the segment that follows it, so a wrap
          at 390px cannot leave a "·" stranded at the end of a line. */}
      {rest.map((part) => (
        <span key={part} className="tabular-nums">
          <span className="mr-2 text-ink-tertiary">·</span>
          {part}
        </span>
      ))}
    </div>
  );
}

/**
 * The phone line, stated as a verdict rather than as two numbers to compare.
 *
 * Mobile is the strongest identity signal the roster carries: 1,007 of 1,080
 * players have one and 998 of those are distinct, so a match is very nearly
 * proof and a mismatch very nearly refutation. Making the reader diff two
 * eleven-digit strings themselves would waste that.
 *
 * Masked to the last four. The reviewer needs to know whether the numbers
 * agree, which the verdict already says; printing the rest would put a
 * thousand phone numbers on screen to answer a yes/no question.
 */
function MobileSignal({ verdict, masked }: { verdict: MobileVerdict; masked?: string }) {
  if (verdict === "same") return <Signal state="met">Same mobile number {masked}</Signal>;
  if (verdict === "differs") return <Signal state="failed">Different mobile number {masked}</Signal>;
  return <Signal state="unknown">No mobile number to compare</Signal>;
}

function TriageStep({
  item,
  histories,
  index,
  total,
  isPending,
  onResolve,
}: {
  item: AmbiguousItem;
  histories: Record<string, PlayerHistory>;
  index: number;
  total: number;
  isPending: boolean;
  onResolve: (action: ReviewAction) => void;
}) {
  const primaryCandidate = item.candidates[0];
  // The matcher ranks a phone match above any spelling, so if one is on this
  // card at all it is the first candidate.
  const mobileFlagged =
    !!primaryCandidate && compareMobile(item.row.mobileNumber, primaryCandidate.mobileNumber) === "same";

  // Linear-style keyboard-fast triage: 1 links the top candidate, N adds as
  // new, S skips — the brief named Linear specifically for this step.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isPending) return;
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "1" && primaryCandidate) {
        onResolve({ kind: "linkExisting", playerId: primaryCandidate.playerId });
      } else if (e.key.toLowerCase() === "n") {
        onResolve({ kind: "addNew" });
      } else if (e.key.toLowerCase() === "s") {
        onResolve({ kind: "skip" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, primaryCandidate, onResolve]);

  return (
    <div key={index}>
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Possible duplicate
        </h1>
        <Badge tone="accent" className="tabular-nums">
          {index + 1} of {total}
        </Badge>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        No email match — but {mobileFlagged ? "someone in the inventory shares this surname and phone number" : "this name is close to someone already in the inventory"}. The highlighted word is
        what&apos;s different; the signals under each candidate are what agrees and what does not.
      </p>

      <Panel className="mt-8 p-5">
        <div className="text-[13px] font-medium text-ink-secondary">This week&apos;s submission</div>
        <div className="mt-1.5 text-[15px] font-semibold text-ink">
          {primaryCandidate ? (
            <NameWithDiff
              firstName={item.row.firstName}
              lastName={item.row.lastName}
              otherFirstName={primaryCandidate.firstName}
              otherLastName={primaryCandidate.lastName}
            />
          ) : (
            formatNameNatural(item.row)
          )}
        </div>
        <MetaLine
          parts={[
            item.row.email || "No email provided",
            maskMobile(item.row.mobileNumber) ?? "No mobile number",
            item.row.sportSelected,
            displayNickname(item.row) && `goes by ${displayNickname(item.row)}`,
          ]}
        />
      </Panel>

      <div className="mt-4 space-y-3">
        {item.candidates.map((candidate, candidateIndex) => {
          const verdict = compareMobile(item.row.mobileNumber, candidate.mobileNumber);
          const incomingNickname = displayNickname(item.row);
          const candidateNickname = displayNickname(candidate);
          const sharesNickname =
            !!incomingNickname &&
            !!candidateNickname &&
            incomingNickname.toLowerCase() === candidateNickname.toLowerCase();

          return (
            <Panel
              key={candidate.playerId}
              // A matching phone is close to proof, and the matcher already
              // put that candidate first. Ringing it says which row to read
              // rather than leaving the reviewer to find it in the signals.
              emphasis={verdict === "same"}
            >
              <div className="flex flex-col items-stretch gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-ink-secondary">
                      Already in inventory
                    </span>
                    {verdict === "same" && <Badge tone="accent">Same phone</Badge>}
                  </div>
                  <div className="mt-1.5 text-[15px] font-semibold text-ink">
                    <NameWithDiff
                      firstName={candidate.firstName}
                      lastName={candidate.lastName}
                      otherFirstName={item.row.firstName}
                      otherLastName={item.row.lastName}
                    />
                  </div>
                  <MetaLine
                    parts={[candidate.email, candidateNickname && `goes by ${candidateNickname}`]}
                  />

                  <SignalList>
                    <MobileSignal
                      verdict={verdict}
                      masked={maskMobile(candidate.mobileNumber)}
                    />
                    {/* A shared nickname is real evidence these two rows are
                        the same person — often better evidence than the
                        spelling of a legal first name. */}
                    {incomingNickname && candidateNickname && (
                      <Signal state={sharesNickname ? "met" : "failed"}>
                        {sharesNickname
                          ? `Both go by ${candidateNickname}`
                          : `Goes by ${candidateNickname}, not ${incomingNickname}`}
                      </Signal>
                    )}
                    <Signal
                      state={
                        candidate.churchAffiliation && item.row.churchAffiliation
                          ? candidate.churchAffiliation === item.row.churchAffiliation
                            ? "met"
                            : "failed"
                          : "unknown"
                      }
                    >
                      {candidate.churchAffiliation
                        ? `Attends ${candidate.churchAffiliation}`
                        : "No church on file"}
                    </Signal>
                  </SignalList>

                  <HistoryLine history={histories[candidate.playerId]} />
                </div>

                <Button
                  variant="secondary"
                  className="shrink-0 whitespace-nowrap"
                  disabled={isPending}
                  onClick={() => onResolve({ kind: "linkExisting", playerId: candidate.playerId })}
                >
                  <Check className="size-4" strokeWidth={2} />
                  Same person
                  {candidateIndex === 0 && <Kbd>1</Kbd>}
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={isPending}
          onClick={() => onResolve({ kind: "addNew" })}
        >
          <UserPlus className="size-4" strokeWidth={2} />
          Different person, add as new
          <Kbd>N</Kbd>
        </Button>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => onResolve({ kind: "skip" })}
        >
          <SkipForward className="size-4" strokeWidth={2} />
          Skip
          <Kbd>S</Kbd>
        </Button>
      </div>
    </div>
  );
}

function DuplicateStep({
  existing,
  gameNightDate,
  isPending,
  onCancel,
  onConfirm,
}: {
  existing: GameNight;
  gameNightDate: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="flex size-11 items-center justify-center rounded-full bg-danger-tint text-danger">
        <AlertCircle className="size-5" strokeWidth={2} />
      </div>
      <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-ink">
        {gameNightDate} is already uploaded.
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        Nothing has been saved yet. A game night for this date already exists, uploaded from{" "}
        <span className="font-medium text-ink">{existing.sourceFilename}</span> with{" "}
        {existing.rowCount} {existing.rowCount === 1 ? "row" : "rows"}.
      </p>

      <Panel className="mt-6 p-5">
        <div className="text-[13px] font-medium text-ink-secondary">If you continue</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
          This becomes a <span className="font-medium text-ink">second, separate</span> game night on{" "}
          {gameNightDate}. Everyone in the file is counted twice for that date, on the dashboard and in
          every player&apos;s attendance history. Only continue if two genuinely different sessions ran
          that day.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
          To correct a bad upload instead, delete the existing game night and its participation rows in
          the Sheet first, then upload this file again.
        </p>
      </Panel>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel, nothing was saved
        </Button>
        <Button type="button" variant="ghost" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Uploading…" : "Add as a second game night"}
        </Button>
      </div>
    </div>
  );
}

function SummaryStep({
  summary,
  matchResult,
  onReset,
}: {
  summary: CommitSummary;
  matchResult: ParseAndMatchResult;
  onReset: () => void;
}) {
  const gn = summary.gameNight;
  const hadFlags = gn.flaggedCount > 0;

  const headline = useMemo(() => {
    if (!hadFlags) return "Clean pass — nothing needed review.";
    return "Batch resolved.";
  }, [hadFlags]);

  return (
    <div>
      <div className="flex size-11 items-center justify-center rounded-full bg-success-tint text-success">
        <Check className="size-5" strokeWidth={2} />
      </div>
      <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-ink">{headline}</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        {gn.gameNightDate} · {gn.sourceFilename}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricPanel label="Rows in file" value={gn.rowCount} />
        <MetricPanel label="New players" value={summary.newPlayerCount} accent />
        <MetricPanel label="Returning players" value={summary.returningPlayerCount} />
        <MetricPanel
          label="Records updated"
          value={summary.refreshedPlayerCount}
          note="Newer answers than we had"
        />
        <MetricPanel label="Duplicates collapsed" value={matchResult.withinBatchDuplicatesCollapsed} />
        <MetricPanel label="Unusable rows" value={matchResult.unusableRowCount} />
        <MetricPanel label="Flagged for review" value={gn.flaggedCount} />
      </div>

      {hadFlags && (
        <Panel className="mt-4 p-5">
          <div className="text-[13px] font-medium text-ink-secondary">Review outcomes</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="success">
              <Users className="mr-1 size-3" strokeWidth={2} />
              {gn.resolvedLinkExistingCount} linked to existing
            </Badge>
            <Badge tone="accent">
              <UserPlus className="mr-1 size-3" strokeWidth={2} />
              {gn.resolvedAddNewCount} added as new
            </Badge>
            <Badge tone="neutral">
              <SkipForward className="mr-1 size-3" strokeWidth={2} />
              {gn.resolvedSkipCount} skipped
            </Badge>
          </div>
        </Panel>
      )}

      <Button variant="secondary" className="mt-8 w-full" onClick={onReset}>
        <RotateCcw className="size-4" strokeWidth={2} />
        Upload another roster
      </Button>
    </div>
  );
}

