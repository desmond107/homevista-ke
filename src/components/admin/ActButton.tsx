"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Result = { ok: boolean; error?: string; message?: string } | void;

/**
 * Runs a (bound) server action from an admin table row.
 * `ask` prompts for a reason that is passed as the action's last argument.
 */
export function ActButton({
  action,
  children,
  confirm: confirmText,
  ask,
  askRequired,
  className = "btn-outline btn-sm",
}: {
  action: (reason?: string) => Promise<Result>;
  children: ReactNode;
  confirm?: string;
  ask?: string;
  askRequired?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        let reason: string | undefined;
        if (ask) {
          const r = window.prompt(ask);
          if (r === null) return;
          if (askRequired && !r.trim()) return window.alert("A reason is required.");
          reason = r.trim();
        } else if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const res = await action(reason);
          if (res && !res.ok && res.error) window.alert(res.error);
          router.refresh();
        });
      }}
    >
      {pending && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}
