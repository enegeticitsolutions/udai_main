import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useApiData } from "../hooks/useApiData";
import type { BlogStoryDetail as BlogStory } from "../types/api";

export function BlogStoryDetail() {
  const { id } = useParams();
  const { data: story, isLoading, error } = useApiData<BlogStory | null>(
    id ? `/content/blog-stories/${id}` : "",
    null,
  );

  if (!id) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f8f4ef] text-[#5a4f4a]">
        Loading story...
      </div>
    );
  }

  if (error || !story) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-[#f8f4ef]">
      <section className="bg-[#2b1b15] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/78 transition hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Stories
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd86b]">
                {story.category}
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {story.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span>{new Date(story.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                <span>{story.author}</span>
                <span>{story.readTime}</span>
              </div>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                {story.excerpt}
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] shadow-[0_22px_50px_rgba(0,0,0,0.22)]">
              <ImageWithFallback
                src={story.heroImage}
                alt={story.title}
                className="h-[320px] w-full object-cover sm:h-[400px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[1.4rem] bg-white p-5 shadow-[0_16px_30px_rgba(44,29,20,0.08)] sm:p-8">
              <div className="space-y-4 text-sm leading-7 text-[#5a4f4a] sm:space-y-5 sm:text-base sm:leading-8">
                {story.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-10 space-y-10">
                {story.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-2xl font-semibold text-[#2b1b15]">
                      {section.heading}
                    </h2>
                    <div className="mt-4 space-y-4 text-sm leading-7 text-[#5a4f4a] sm:text-base sm:leading-8">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <div className="space-y-6">
              {story.gallery.map((image, index) => (
                <div
                  key={`${story.id}-${index}`}
                  className="overflow-hidden rounded-[1.3rem] bg-white shadow-[0_16px_30px_rgba(44,29,20,0.08)]"
                >
                  <ImageWithFallback
                    src={image}
                    alt={`${story.title} ${index + 1}`}
                    className="h-[220px] w-full object-cover sm:h-[260px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-[1.4rem] bg-[#20325c] px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Want To Know More?</h3>
                <p className="mt-2 text-sm leading-7 text-white/75">
                  Connect with our team to learn more about the work behind these stories and the impact they represent.
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
        </div>
      </section>
    </div>
  );
}
