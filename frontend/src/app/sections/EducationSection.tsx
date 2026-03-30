import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { EducationProgramDetail } from "../types/api";

export function EducationSection() {
  const { data: programs, isLoading, error } = useApiData<EducationProgramDetail[]>(
    "/content/education-programs",
    [],
  );

  return (
    <section className="bg-[#f7f9ff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2a007]">
            Our Core Pillars
          </div>
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-[#2f5597] sm:text-5xl">
            Education for All
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-[#776a66]">
            We believe education is the key to breaking the cycle of poverty. Our programs are designed to support children at every stage of their learning journey.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading programs...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {programs.map((program, index) => (
            <motion.div
              key={program.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex h-full flex-col overflow-hidden rounded-[1.1rem] bg-white shadow-[0_12px_24px_rgba(48,32,22,0.12)]"
            >
              <div className={`h-6 w-full bg-gradient-to-r ${program.accent}`} />
              <div className="flex min-h-[238px] flex-1 flex-col p-6 pb-4">
                <h3 className="max-w-[220px] text-2xl font-semibold leading-tight text-[#20325c]">
                  {program.title}
                </h3>
                <p className="mt-5 text-sm leading-8 text-[#5a4f4a]">{program.shortDescription}</p>
              </div>
              <div className="overflow-hidden">
                <ImageWithFallback
                  src={program.heroImage}
                  alt={program.title}
                  className="h-44 w-full object-cover object-center"
                />
              </div>
              <div className="mt-auto p-6 pt-4">
                <Link
                  to={`/education/${program.slug}`}
                  className="block w-full rounded-full border border-[#1f1b1a] px-6 py-3 text-center text-lg font-semibold text-[#1f1b1a] transition hover:bg-[#f6f6f4]"
                >
                  Learn More
                </Link>
              </div>
            </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
