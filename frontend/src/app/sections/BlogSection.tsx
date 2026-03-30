import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { BlogStoryDetail } from "../types/api";

export function BlogSection() {
  const { data: posts, isLoading, error } = useApiData<BlogStoryDetail[]>(
    "/content/blog-stories",
    [],
  );
  const featuredPosts = posts.slice(0, 3);

  return (
    <section className="bg-[#fbf7f4] py-16 sm:py-20" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
            <span className="text-[#2f5597]">Stories</span> from the Field
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-[#776a66]">
            Read about the latest updates, success stories, and insights from our team and the communities we serve.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading stories...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {featuredPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex h-full flex-col overflow-hidden rounded-[1.2rem] border border-[#eee7e1] bg-white shadow-[0_12px_24px_rgba(48,32,22,0.06)]"
              >
                <div className="relative h-56 overflow-hidden">
                  <ImageWithFallback
                    src={post.heroImage}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#2f5597] shadow-sm">
                    {post.category}
                  </div>
                </div>

                <div className="flex h-full flex-1 flex-col p-5">
                  <div className="mb-3 text-xs leading-5 text-[#9a8d86]">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  <h3 className="mb-3 text-2xl font-semibold leading-snug text-[#2b1b15]">
                    {post.title}
                  </h3>

                  <p className="mb-6 text-sm leading-7 text-[#776a66]">
                    {post.excerpt}
                  </p>

                  <Link
                    to={`/stories/${post.id}`}
                    className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-[#2f5597] transition hover:gap-3"
                  >
                    Read Full Story
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
