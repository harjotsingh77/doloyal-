import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { SiteHeader } from "@/marketing/components/header";
import { SiteFooter } from "@/marketing/components/footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center pt-36 pb-20 px-5 text-center sm:pt-44 sm:pb-28">
        <div className="mx-auto max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Compass className="h-3.5 w-3.5" />
            <span>404 Error</span>
          </div>

          {/* Large 404 Display */}
          <h1 className="mt-6 text-7xl font-extrabold tracking-tight text-[#282628] sm:text-9xl">
            404
          </h1>

          {/* Heading */}
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#282628] sm:text-4xl">
            This Page Doesn’t Exist
          </h2>

          {/* Description */}
          <p className="mt-4 text-base sm:text-lg text-gray-600 font-normal max-w-md mx-auto">
            The page you’re looking for may have moved, been removed, or never existed.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="group flex items-center gap-3.5 rounded-full bg-[#232529] pl-6 pr-2.5 py-3 text-[15px] font-semibold text-white shadow-xl transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
            >
              <span>Back to Homepage</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#232529] group-hover:text-[#2563EB] shadow-sm transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </div>
            </Link>

            <Link
              href="/features"
              className="group flex items-center gap-2 px-3 py-3 text-[15px] font-semibold text-[#1F242B] hover:text-[#2563EB] transition-colors"
            >
              <span>Explore Features</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
