import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";


export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden sm:-mt-4">
      <div className="absolute inset-0 z-0">
        <div className="h-full w-full">
          <ImageWithFallback
            src="/images/section.png"
            alt="Children learning together"
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-black/14" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/14" />
      </div>

      <div className="relative h-[360px] w-full min-[390px]:h-[390px] sm:h-auto sm:aspect-[1530/547]">
        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4 py-4 text-center sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl text-center"
        >
          <h1 className="mb-3 text-[1.7rem] font-semibold leading-[1.08] tracking-tight text-white min-[390px]:text-3xl sm:text-5xl lg:text-6xl">
            <span className="block">Empowering Children</span>
            <span className="mt-2 block text-amber-400">with Special Needs</span>
          </h1>
          <p className="mx-auto mb-5 max-w-4xl text-[13px] leading-5 text-slate-100 min-[390px]:text-sm min-[390px]:leading-6 sm:mb-6 sm:text-base sm:leading-7">
            We provide specialized education, therapies, and skill-building programs that empower children and young adults with special needs to live independent, confident, and fulfilling lives.
          </p>
          <div className="mx-auto flex max-w-[280px] flex-col items-stretch justify-center gap-2 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
            <Link
              to="/#donate"
              onClick={(e) => {
                if (window.location.pathname === "/") {
                  const el = document.getElementById("donate");
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.history.pushState(null, "", "/#donate");
                  }
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 sm:min-w-[220px] sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              Donate Now
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <Link
              to="/about"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/70 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-slate-950 sm:min-w-[220px] sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              View Our Story
            </Link>
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
}
