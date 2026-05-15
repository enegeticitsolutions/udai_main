import { Link } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function VolunteerCTASection() {
  const benefits = [
    "Teach a skill or subject",
    "Mentor a young student",
    "Assist with event planning",
    "Help with administrative tasks",
  ];

  return (
    <section
      id="volunteer"
      className="scroll-mt-40 overflow-hidden bg-[#ff4b57] py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex rounded-full bg-white/12 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-white/95">
              Join Our Team
            </div>
            <h2 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Your Time Can Change a Life Forever
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-9 text-white/82">
              We are always looking for passionate individuals to join our mission. Whether you can spare an hour a week or a month a year, your contribution matters.
            </p>

            <div className="mt-8 space-y-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-base text-white/88">
                  <CheckCircle2 className="h-5 w-5 text-[#ffd4b2]" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/get-involved#volunteer-form"
                className="rounded-full bg-white px-8 py-4 text-center text-sm font-semibold text-[#d85c43] shadow-[0_12px_26px_rgba(108,39,39,0.2)] transition hover:bg-[#fff1ec]"
              >
                Become a Volunteer
              </Link>
              <Link
                to="/get-involved"
                className="rounded-full border border-white/75 px-8 py-4 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Open Roles
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[1.2rem] border border-black/10 shadow-[0_18px_40px_rgba(87,31,34,0.28)]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200"
                alt="Volunteer at a community event"
                className="h-[420px] w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
