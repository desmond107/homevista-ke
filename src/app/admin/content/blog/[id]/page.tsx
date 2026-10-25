import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { saveBlogPostAction } from "@/app/actions/admin";

export default async function EditBlogPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("content");
  const { id } = await params;
  const p = id === "new" ? null : await prisma.blogPost.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <>
      <DashHeader title={p ? "Edit article" : "New article"} />
      <ActionForm action={saveBlogPostAction} className="card max-w-4xl space-y-4 p-6">
        {p && <input type="hidden" name="id" value={p.id} />}
        <Field label="Title" htmlFor="b-title"><input id="b-title" name="title" defaultValue={p?.title} required className="input text-lg" /></Field>
        <Field label="Excerpt" htmlFor="b-ex" hint="Shown on the blog index and in search results."><textarea id="b-ex" name="excerpt" rows={2} defaultValue={p?.excerpt} className="input" /></Field>
        <Field label="Body" htmlFor="b-body" hint="Blank line between paragraphs · ## Heading · - list · **bold** · [link](https://…)">
          <textarea id="b-body" name="body" rows={20} defaultValue={p?.body} required className="input font-mono text-xs leading-relaxed" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Author" htmlFor="b-author"><input id="b-author" name="author" defaultValue={p?.author ?? "HomeVista Editorial"} className="input" /></Field>
          <Field label="Tags" htmlFor="b-tags" hint="Comma separated"><input id="b-tags" name="tags" defaultValue={p?.tags.join(", ")} className="input" /></Field>
          <Field label="Cover image" htmlFor="b-cover"><input id="b-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="w-full min-w-0 text-sm" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="published" defaultChecked={p?.published ?? true} className="h-4 w-4 accent-[var(--navy)]" /> Published</label>
        <SubmitButton>Save article</SubmitButton>
      </ActionForm>
    </>
  );
}
