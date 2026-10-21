import type { ReactNode } from "react";

/*
 * A deliberately tiny, safe markdown renderer for blog posts and legal pages.
 * Supports: ## / ### headings, paragraphs, "- " lists, **bold**, *italic*, [links](https://…).
 * Output is React elements — raw HTML is never injected, so stored content can't cause XSS.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("*")) out.push(<em key={k}>{t.slice(1, -1)}</em>);
    else {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      const external = href!.startsWith("http");
      out.push(
        <a key={k} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
          {label}
        </a>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const block = b.trim();
        if (!block) return null;
        if (block.startsWith("### ")) return <h3 key={i}>{inline(block.slice(4), `h${i}`)}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{inline(block.slice(3), `h${i}`)}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ""), `l${i}-${j}`)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+\. /.test(l)))
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+\. /, ""), `o${i}-${j}`)}</li>
              ))}
            </ol>
          );
        return <p key={i}>{inline(lines.join(" "), `p${i}`)}</p>;
      })}
    </>
  );
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.split(/\s+/).length / 220));
}
