"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { contactAction } from "@/app/actions/public";

export function ContactForm() {
  return (
    <ActionForm action={contactAction} className="card space-y-4 p-6 sm:p-8" resetOnSuccess refresh={false}>
      <h2 className="text-2xl">Send us a message</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name"><input id="c-name" name="name" autoComplete="name" required className="input" /></Field>
        <Field label="Email" htmlFor="c-email"><input id="c-email" name="email" type="email" autoComplete="email" required className="input" /></Field>
        <Field label="Phone (optional)" htmlFor="c-phone"><input id="c-phone" name="phone" type="tel" autoComplete="tel" className="input" /></Field>
        <Field label="Topic" htmlFor="c-topic">
          <select id="c-topic" name="topic" className="input">
            <option>General enquiry</option>
            <option>Payment / unlock issue</option>
            <option>Listing or subscription</option>
            <option>Verification (KYC)</option>
            <option>Report fraud</option>
            <option>Advertising & partnerships</option>
          </select>
        </Field>
      </div>
      <Field label="Message" htmlFor="c-msg"><textarea id="c-msg" name="message" rows={6} required className="input" /></Field>
      {/* Honeypot: hidden from people, filled in by bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <SubmitButton className="btn-primary" pendingText="Sending…">Send message</SubmitButton>
    </ActionForm>
  );
}
