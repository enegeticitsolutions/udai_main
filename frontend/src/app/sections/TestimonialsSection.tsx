import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Quote } from "lucide-react";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { Testimonial } from "../types/api";

export function TestimonialsSection() {
  const { data: testimonials, isLoading, error } = useApiData<Testimonial[]>(
    "/content/testimonials",
    [],
  );
  const featuredTestimonials = testimonials.slice(0, 3);

  return (
    <section className="bg-[#f3f3f1] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
            Voices of <span className="text-[#2f5597]">Change</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-[#776a66]">
            Hear from the people who make our community vibrant and strong.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading testimonials...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredTestimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative rounded-[1.2rem] border border-[#eee7e1] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.05)]"
              >
                <Quote className="absolute right-6 top-5 h-8 w-8 text-[#f0d5ca]" />

                <p className="mb-8 pr-8 text-lg leading-10 text-[#4d413b]">
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="size-12 overflow-hidden rounded-full">
                    <ImageWithFallback
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-[#2b1b15]">{testimonial.name}</div>
                    <div className="text-sm text-[#d66943]">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
