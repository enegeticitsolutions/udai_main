import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { EducationProgramDetail } from "../types/api";

const defaultPrograms: EducationProgramDetail[] = [
  {
    slug: "after-school-tutoring",
    title: "After-School Tutoring",
    shortDescription: "Providing personalized academic support to help students master core subjects and build confidence in their abilities.",
    heroImage: "/images/afterschool.png",
    gallery: ["/images/afterschool.png", "/images/arteducation.png"],
    accent: "from-[#2046b6] to-[#5a9ae8]",
    overview: [],
    highlights: [],
    outcomes: [],
  },
  {
    slug: "sponsorship-fund",
    title: "Sponsored Projects",
    shortDescription: "Sponsorship donations help support children and young adults with special needs by contributing toward their education, therapy, development, and related support.",
    heroImage: "/images/fund.png",
    gallery: ["/images/fund.png", "/images/mobile-unit.png"],
    accent: "from-[#2b922f] to-[#63b853]",
    overview: [],
    highlights: [],
    outcomes: [],
  },
  {
    slug: "digital-literacy",
    title: "Digital Literacy",
    shortDescription: "Equipping children and young adults with special needs with practical technology skills to engage confidently with digital tools.",
    heroImage: "/images/digital.png",
    gallery: ["/images/digital.png", "/images/digital.png"],
    accent: "from-[#f2a007] to-[#ffd15d]",
    overview: [],
    highlights: [],
    outcomes: [],
  },
  {
    slug: "special-education",
    title: "Special Education",
    shortDescription: "Providing specialized education and developmental support for children and young adults with special needs, focusing on individualized learning, skill building, and independence.",
    heroImage: "/images/arteducation.png",
    gallery: ["/images/arteducation.png", "/images/aboutsection.png"],
    accent: "from-[#8b20b6] to-[#b85ae8]",
    overview: [],
    highlights: [],
    outcomes: [],
  },
];

export function EducationSection() {
  const { data: apiPrograms, isLoading, error } = useApiData<EducationProgramDetail[]>(
    "/content/education-programs",
    defaultPrograms,
    defaultPrograms,
  );
  const programs = apiPrograms && apiPrograms.length > 0 ? apiPrograms : defaultPrograms;

  return (
    <section className="bg-[#f7f9ff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-9 max-w-3xl text-center sm:mb-14"
        >
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2a007]">
            Our Core Pillars
          </div>
          <h2 className="mb-4 text-3xl font-semibold tracking-tight text-[#2f5597] sm:text-5xl">
            Education for All
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-[#776a66]">
            We believe education is the key to breaking the cycle of poverty. Our programs are designed to support children at every stage of their learning journey.
          </p>
        </motion.div>

        {isLoading && !programs.length ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading programs...
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="flex min-h-0 flex-1 flex-col p-5 pb-3 sm:min-h-[238px] sm:p-6 sm:pb-4">
                <h3 className="max-w-[220px] text-xl font-semibold leading-tight text-[#20325c] sm:text-2xl">
                  {program.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#5a4f4a] sm:mt-5 sm:leading-8">{program.shortDescription}</p>
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
