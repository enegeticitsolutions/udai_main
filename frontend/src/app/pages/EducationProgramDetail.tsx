import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useApiData } from "../hooks/useApiData";
import type { EducationProgramDetail as EducationProgram } from "../types/api";

export function EducationProgramDetail() {
  const { slug } = useParams();
  const { data: program, isLoading, error } = useApiData<EducationProgram | null>(
    slug ? `/content/education-programs/${slug}` : "",
    null,
  );

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f8f5f1] text-[#5b504a]">
        Loading program...
      </div>
    );
  }

  if (error || !program) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-[#f8f5f1]">
      <section className="bg-[#20325c] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <div className={`mb-4 inline-flex rounded-full bg-gradient-to-r px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white ${program.accent}`}>
                Education Program
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {program.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                {program.shortDescription}
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.4rem] bg-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.22)]">
              <ImageWithFallback
                src={program.heroImage}
                alt={program.title}
                className="h-[300px] w-full object-cover sm:h-[380px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.3rem] bg-white p-5 shadow-[0_16px_30px_rgba(44,29,20,0.08)] sm:p-8">
              <h2 className="text-2xl font-semibold text-[#20325c] sm:text-3xl">Program Overview</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[#5b504a] sm:mt-6 sm:space-y-5 sm:text-base sm:leading-8">
                {program.overview.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="rounded-[1.3rem] bg-[#fffaf4] p-5 shadow-[0_16px_30px_rgba(44,29,20,0.06)] sm:p-8">
              <h2 className="text-2xl font-semibold text-[#20325c]">Key Highlights</h2>
              <div className="mt-6 space-y-4">
                {program.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className={`mt-2 size-2 rounded-full bg-gradient-to-r ${program.accent}`} />
                    <p className="text-sm leading-7 text-[#5b504a]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {program.gallery.map((image, index) => (
              <div
                key={`${program.slug}-${index}`}
                className="overflow-hidden rounded-[1.3rem] bg-white shadow-[0_16px_30px_rgba(44,29,20,0.08)]"
              >
                <ImageWithFallback
                  src={image}
                  alt={`${program.title} ${index + 1}`}
                  className="h-[260px] w-full object-cover sm:h-[320px]"
                />
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[1.3rem] bg-white p-5 shadow-[0_16px_30px_rgba(44,29,20,0.08)] sm:p-8">
            <h2 className="text-2xl font-semibold text-[#20325c]">Expected Outcomes</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {program.outcomes.map((item) => (
                <div
                  key={item}
                  className="rounded-[1rem] border border-[#ebe1d8] bg-[#fcfaf8] px-5 py-4 text-sm leading-7 text-[#5b504a]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 rounded-[1.3rem] bg-[#20325c] px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
            <div>
              <h3 className="text-2xl font-semibold">Interested In This Program?</h3>
              <p className="mt-2 text-sm leading-7 text-white/75">
                Connect with us to learn how this program supports children and young adults in a structured, meaningful way.
              </p>
            </div>
            <Link
              to="/#donate"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#20325c] transition hover:bg-[#f3eee8]"
            >
              Contact Us
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
