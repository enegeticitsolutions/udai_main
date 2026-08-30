import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";

const heroImages = [
  {
    src: "/images/section.png",
    alt: "UDAI children celebrating at Skill Centre with Indian flags"
  },
  {
    src: "/images/hero-independence.jpg",
    alt: "Children and teachers celebrating with Autism awareness backdrop"
  }
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background Image Slider Carousel */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full"
          >
            <ImageWithFallback
              src={heroImages[currentIndex].src}
              alt={heroImages[currentIndex].alt}
              className="h-full w-full object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-6 bg-amber-400" : "w-2 bg-white/60 hover:bg-white"
              }`}
              aria-label={`Go to hero slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="relative min-h-[380px] w-full min-[390px]:min-h-[420px] sm:h-auto sm:min-h-[480px] lg:min-h-[540px] sm:aspect-[1530/547] flex items-center">
        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-12 lg:px-8 lg:py-16">
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
