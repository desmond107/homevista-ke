"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";

export function ProfileForms({ name, hasPassword }: { name: string; hasPassword: boolean }) {
  return (
    <div className="space-y-6">
      <ActionForm action={updateProfileAction} className="card space-y-4 p-6">
        <h2 className="text-xl">Edit profile</h2>
        <Field label="Full name" htmlFor="p-name">
          <input id="p-name" name="name" defaultValue={name} required minLength={2} className="input" />
        </Field>
        <SubmitButton>Save</SubmitButton>
      </ActionForm>
      <ActionForm action={changePasswordAction} className="card space-y-4 p-6" resetOnSuccess>
        <h2 className="text-xl">{hasPassword ? "Change password" : "Set a password"}</h2>
        {hasPassword && (
          <Field label="Current password" htmlFor="p-cur">
            <input id="p-cur" name="current" type="password" autoComplete="current-password" required className="input" />
          </Field>
        )}
        <Field label="New password" htmlFor="p-new" hint="At least 8 characters with letters and numbers. Other devices will be signed out.">
          <input id="p-new" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </Field>
        <SubmitButton>Update password</SubmitButton>
      </ActionForm>
    </div>
  );
}
