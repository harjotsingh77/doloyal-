"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Isolated into its own module so react-markdown + remark-gfm land in an
 * async chunk that is only fetched when the support panel actually renders
 * an AI/system message — not on every page that hosts the floating button.
 */
export default function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-headings:text-[rgb(var(--color-foreground))] prose-p:text-[rgb(var(--color-foreground))] prose-strong:text-[rgb(var(--color-foreground))] prose-li:text-[rgb(var(--color-foreground))] prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-a:text-[rgb(var(--color-primary))] prose-code:rounded prose-code:bg-[rgb(var(--color-muted))] prose-code:px-1 prose-code:py-0.5 prose-pre:bg-[rgb(var(--color-muted))] prose-pre:text-[rgb(var(--color-foreground))]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
