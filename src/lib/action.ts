import "server-only";
import { ZodError } from "zod";
import { AuthError, UserError } from "./errors";

export { UserError };

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };


/** Runs a server action body and turns thrown errors into a friendly result. */
export async function safeAction<T = undefined>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError || e instanceof UserError) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the form." };
    // Next.js redirect()/notFound() must propagate.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error("[action]", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** FormData → plain object of strings (multi-value keys become arrays). */
export function formObject(fd: FormData) {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const prev = out[k];
    if (prev === undefined) out[k] = v;
    else out[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}
