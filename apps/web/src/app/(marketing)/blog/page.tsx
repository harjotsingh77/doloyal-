import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ArrowRight, Calendar, Clock } from "lucide-react";
import { BLOG_POSTS } from "@/marketing/data/blog";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Doloyal Blog | Customer Retention & Business Growth",
  description:
    "Practical ideas, strategies, and guides to help local businesses attract, retain, and grow their customers.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Doloyal Resources</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            Insights for Growing Local Businesses
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Practical ideas, strategies, and guides to help local businesses attract, retain, and grow their customers.
          </p>
        </div>
      </section>

      {/* Article Grid */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div>
                  {/* Category & Thumbnail Gradient */}
                  <div
                    className={`h-40 w-full rounded-2xl bg-gradient-to-br ${post.gradient} p-5 flex flex-col justify-between`}
                  >
                    <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider backdrop-blur-md">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {post.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-6 text-xl font-bold text-[#282628] leading-snug group-hover:text-[#2563EB] transition-colors">
                    {post.title}
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-gray-600 line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] transition-all group-hover:gap-3"
                  >
                    <span>Read article</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}