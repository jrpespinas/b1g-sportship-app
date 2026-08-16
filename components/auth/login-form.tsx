"use client";

import { useActionState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, type SignInState } from "@/app/login/actions";

/**
 * One field, one button.
 *
 * No username: the password itself selects the role, so a shared username
 * would add no entropy and one more thing for a quarterly visitor to have
 * forgotten. No "Welcome back", no illustration — a sign-in screen for a tool
 * three people use should look like the tool.
 */
export function LoginForm({ next, needsAdmin }: { next: string; needsAdmin: boolean }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="next" value={next} />

      <label htmlFor="password" className="block text-[13px] font-medium text-ink">
        {needsAdmin ? "Admin password" : "Password"}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        aria-describedby={state.error ? "signin-error" : undefined}
        aria-invalid={state.error ? true : undefined}
        className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {state.error ? (
        <p
          id="signin-error"
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-[13px] text-danger"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-4 w-full" disabled={pending}>
        <Lock className="size-4" strokeWidth={2} aria-hidden />
        {pending ? "Checking…" : "Sign in"}
      </Button>
    </form>
  );
}
