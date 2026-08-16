import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth";

export const metadata = { title: "Sign in — B1G Sportship" };

/**
 * The gate.
 *
 * A linear task column at 640px, the same measure `/upload` uses — DESIGN.md's
 * two-tier width rule puts one-decision-at-a-time flows here and reserves the
 * wider 1280px measure for reading surfaces. Centred vertically because this
 * is the only screen in the app with nothing else on it.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; need?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const needsAdmin = params.need === "admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 py-12">
      <div className="w-full max-w-[400px]">
        <Image
          src="/b1g-sportship-mark.png"
          alt="B1G Sportship"
          width={228}
          height={66}
          className="h-7 w-auto"
          priority
        />

        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
            {needsAdmin ? "That page needs the admin password" : "Sign in"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            {needsAdmin
              ? "Uploading a roster is the one action that rewrites the source of truth, so it sits behind its own password."
              : "This app holds real contact details for everyone in the ministry. Ask whoever runs it for the password."}
          </p>

          <LoginForm next={next} needsAdmin={needsAdmin} />
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-secondary">
          Signing in keeps you signed in on this device for 30 days.
        </p>
      </div>
    </div>
  );
}
