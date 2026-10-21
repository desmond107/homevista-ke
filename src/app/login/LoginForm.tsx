"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4" refresh={false} messageFirst>
      <input type="hidden" name="next" value={next} />
      <Field label="Email address" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full !py-3" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
