"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cx } from "./ui";

type Result = { ok: true; data?: unknown; message?: string } | { ok: false; error: string } | null;

const PendingContext = createContext(false);

export function SubmitButton({ children, className = "btn-primary", pendingText, ...rest }: { children: ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending: formPending } = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = formPending || ctxPending;
  return (
    <button type="submit" disabled={pending || rest.disabled} className={className} {...rest}>
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: Result }) {
  if (!state) return null;
  if (state.ok && !state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cx(
        "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm",
        state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      {state.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
      <span>{state.ok ? state.message : state.error}</span>
    </div>
  );
}

/**
 * A <form> bound to a server action with inline success/error messages.
 * `resetOnSuccess` clears inputs; `refresh` re-renders server data after success.
 */
export function ActionForm<S extends Result>({
  action,
  children,
  className,
  resetOnSuccess,
  refresh = true,
  onSuccess,
  messageFirst,
}: {
  action: (prev: S | null, fd: FormData) => Promise<S>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  refresh?: boolean;
  onSuccess?: (s: S) => void;
  messageFirst?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      if (refresh) router.refresh();
      onSuccess?.(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    // Submitting via a transition (not <form action>) so React 19 doesn't clear the inputs when validation fails.
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext.Provider value={pending}>
        {messageFirst && <FormMessage state={state} />}
        {children}
        {!messageFirst && <FormMessage state={state} />}
      </PendingContext.Provider>
    </form>
  );
}

export function Field({ label, hint, children, className, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A button that runs a server action with a confirm() and refreshes. */
export function ConfirmButton({
  action,
  confirm: question,
  children,
  className = "btn-outline btn-sm",
}: {
  action: () => Promise<{ ok: boolean; error?: string; message?: string } | void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (question && !window.confirm(question)) return;
        const r = await action();
        if (r && !r.ok && r.error) window.alert(r.error);
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
