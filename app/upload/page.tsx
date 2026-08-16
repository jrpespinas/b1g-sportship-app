"use client";

import { useState } from "react";
import { ClipboardCheck, FileSpreadsheet } from "lucide-react";
import { UploadFlow } from "@/components/upload/upload-flow";
import { AttendanceFlow } from "@/components/upload/attendance-flow";
import { Panel } from "@/components/ui/panel";

type FileKind = "registration" | "attendance";

/**
 * Two files describe a game night and they are not the same measurement.
 * Registration is who signed up; attendance is who came through the door. On
 * 2026-05-30 that was 183 against 131 — a 56% show-up rate — so conflating
 * them overstated attendance by nearly a factor of two.
 */
const CHOICES: { kind: FileKind; label: string; blurb: string; icon: typeof FileSpreadsheet }[] = [
  {
    kind: "registration",
    label: "Registration",
    blurb: "The Google Form export. Creates the game night, adds new players, and records who signed up.",
    icon: FileSpreadsheet,
  },
  {
    kind: "attendance",
    label: "Attendance",
    blurb: "The door check-in list. Marks who actually turned up on a night that registration already created.",
    icon: ClipboardCheck,
  },
];

export default function UploadPage() {
  const [kind, setKind] = useState<FileKind | null>(null);

  if (kind === "registration") return <UploadFlow />;
  if (kind === "attendance") return <AttendanceFlow onBack={() => setKind(null)} />;

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">What are you uploading?</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        Registering and turning up are different events, and the gap is wide — on May 30, 183 people registered and
        131 came. Each file answers one of those questions.
      </p>

      <div className="mt-8 space-y-3">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          return (
            <Panel key={choice.kind} className="p-0">
              <button
                type="button"
                onClick={() => setKind(choice.kind)}
                className="flex w-full items-start gap-4 rounded-[16px] p-5 text-left outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-tint">
                  <Icon className="size-4 text-accent-ink" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{choice.label}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-secondary">{choice.blurb}</span>
                </span>
              </button>
            </Panel>
          );
        })}
      </div>
      </div>
    </div>
  );
}
