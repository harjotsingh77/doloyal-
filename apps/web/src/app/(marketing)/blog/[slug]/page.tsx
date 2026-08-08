import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { getPost, BLOG_POSTS } from "@/marketing/data/blog";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPost(params.slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
  });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="pt-32 sm:pt-40">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-[14px] font-semibold text-[rgb(var(--color-muted-foreground))] transition-colors hover:text-[rgb(var(--color-foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>

        <div className={cn("mb-6 inline-flex h-1.5 w-14 rounded-full bg-gradient-to-r", post.gradient)} />
        <span className="text-[13px] font-bold uppercase tracking-wider text-[#2563EB]">{post.category}</span>
        <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
          {post.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-[rgb(var(--color-border))] py-5 text-[13.5px] text-[rgb(var(--color-subtle))]">
          <span className="font-semibold text-[rgb(var(--color-foreground))]">{post.author}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="mt-10 space-y-7">
          {post.content.map((block, i) => (
            <div key={i}>
              {block.h ? <h2 className="mb-3 text-2xl font-bold tracking-[-0.02em]">{block.h}</h2> : null}
              {block.p ? (
                <p className="leading-relaxed text-[17px] text-[rgb(var(--color-muted-foreground))]">{block.p}</p>
              ) : null}
              {block.ul ? (
                <ul className="mt-2 space-y-3">
                  {block.ul.map((li) => (
                    <li key={li} className="flex items-start gap-3 text-[16.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                      <span className={cn("mt-2.5 h-1.5 w-4 shrink-0 rounded-full bg-gradient-to-r", post.gradient)} />
                      {li}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-3xl bg-[#0F172A] p-8 text-white sm:flex-row sm:p-10">
          <div>
            <h3 className="text-xl font-bold tracking-[-0.01em]">Put it into practice today</h3>
            <p className="mt-1 text-sm text-white/60">
              Try every idea in this article free for 14 days — no credit card.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-[#0F172A] shadow-[0_1px_2px_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#F1F5F9]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-14 border-t border-[rgb(var(--color-border))] pt-12 pb-20 sm:pb-24">
          <h2 className="mb-6 text-xl font-bold tracking-[-0.01em]">Keep reading</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col rounded-2xl border border-[rgb(var(--color-border))] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.22)]"
              >
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#2563EB]">{p.category}</span>
                <h3 className="mt-2 flex-1 text-[14px] font-bold leading-snug">{p.title}</h3>
                <span className="mt-3 text-[11.5px] text-[rgb(var(--color-subtle))]">{p.readTime}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}