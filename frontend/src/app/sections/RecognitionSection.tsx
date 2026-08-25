import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ZoomIn, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { getImageUrl } from "../lib/imageUtils";

export function RecognitionSection() {
  const [selectedCertIndex, setSelectedCertIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const certificates = [
    {
      id: 1,
      title: "Nationwide Awards 2022",
      subtitle: "Most Prominent Special School of the Year, Business Mint",
      image: "/images/certificate1.png",
      accent: "from-amber-500 via-amber-200 to-amber-700",
    },
    {
      id: 2,
      title: "Certificate of Recognition",
      subtitle: "Nation Wide Awards 2022, India's Prestigious Awards",
      image: "/images/certificate2.png",
      accent: "from-yellow-400 via-stone-200 to-amber-600",
    },
    {
      id: 3,
      title: "Divya Shakti Samman 2025",
      subtitle: "Cultural Program & Award Ceremony for Persons with Disability",
      image: "/images/certificate3.png",
      accent: "from-emerald-600 via-amber-200 to-amber-600",
    },
    {
      id: 4,
      title: "Best NGO Excellence Award",
      subtitle: "Outstanding Contribution to Special Education & Rehabilitation",
      image: "/images/certificate1.png",
      accent: "from-blue-500 via-indigo-200 to-purple-700",
    },
    {
      id: 5,
      title: "Inclusive Education Leadership Honor",
      subtitle: "Empowering Youth & Special Needs Children Across India",
      image: "/images/certificate2.png",
      accent: "from-rose-500 via-pink-200 to-red-600",
    },
    {
      id: 6,
      title: "National Welfare Citation",
      subtitle: "15+ Years of Dedicated Service & Measurable Social Impact",
      image: "/images/certificate3.png",
      accent: "from-teal-500 via-emerald-200 to-green-700",
    },
  ];

  // Auto-rotate every 4 seconds unless paused or modal is open
  useEffect(() => {
    if (isPaused || selectedCertIndex !== null) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % certificates.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused, selectedCertIndex, certificates.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCertIndex === null) return;
      if (e.key === "Escape") setSelectedCertIndex(null);
      if (e.key === "ArrowLeft") {
        setSelectedCertIndex((prev) => (prev === 0 ? certificates.length - 1 : prev! - 1));
      }
      if (e.key === "ArrowRight") {
        setSelectedCertIndex((prev) => (prev === certificates.length - 1 ? 0 : prev! + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCertIndex, certificates.length]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % certificates.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + certificates.length) % certificates.length);
  };

  // Compute indices for 3 visible cards desktop, 2 tablet, 1 mobile
  const getVisibleCards = () => {
    const len = certificates.length;
    return [
      { item: certificates[currentIndex], origIndex: currentIndex },
      { item: certificates[(currentIndex + 1) % len], origIndex: (currentIndex + 1) % len },
      { item: certificates[(currentIndex + 2) % len], origIndex: (currentIndex + 2) % len },
    ];
  };

  const visibleCards = getVisibleCards();

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0,
    }),
  };

  return (
    <section className="bg-white py-16 sm:py-20" id="recognition">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pt-3"
          >
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c95b38]">
              <span className="h-2 w-2 rounded-full bg-[#c95b38]" />
              Honors & Accolades
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#2b1b15] sm:text-4xl">
              Recognition & Awards
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[#7a6f69]">
              <p>
                We are humbled to be recognized for our commitment to transparency, inclusion, and meaningful social impact.
              </p>
              <p>
                For over 15 years, UDAI Working Together Works has been dedicated to empowering children and young adults with special needs through special education, therapy, rehabilitation, vocational training, and independent living programs.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2d9d0] bg-white text-[#2b1b15] shadow-sm transition hover:border-[#c95b38] hover:bg-[#fffaf5] hover:text-[#c95b38]"
                title="Previous Award"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2d9d0] bg-white text-[#2b1b15] shadow-sm transition hover:border-[#c95b38] hover:bg-[#fffaf5] hover:text-[#c95b38]"
                title="Next Award"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="ml-2 text-xs font-medium text-[#8b817c]">
                {currentIndex + 1} of {certificates.length}
              </span>
            </div>
          </motion.div>

          <div
            className="relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              >
                {visibleCards.map(({ item, origIndex }, cardIdx) => (
                  <div
                    key={`${item.id}-${origIndex}-${cardIdx}`}
                    onClick={() => setSelectedCertIndex(origIndex)}
                    className={`group relative cursor-pointer overflow-hidden rounded-[0.5rem] border border-[#dad1ca] bg-[#fffaf5] shadow-[0_8px_18px_rgba(40,28,19,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(40,28,19,0.14)] ${
                      cardIdx >= 1 ? "hidden sm:block" : ""
                    } ${cardIdx >= 2 ? "sm:hidden md:block" : ""}`}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${item.accent}`} />
                    
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100 p-2">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        className="h-full w-full rounded-[0.25rem] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-2 flex flex-col items-center justify-center rounded-[0.25rem] bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md transition-transform duration-300 group-hover:scale-110">
                          <ZoomIn className="h-5 w-5" />
                        </div>
                        <span className="mt-2.5 rounded-full bg-stone-900/80 px-3 py-1 text-[11px] font-medium text-white shadow-sm">
                          View Certificate
                        </span>
                      </div>
                    </div>

                    <div className="p-3 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b817c]">
                        Recognition
                      </div>
                      <h3 className="mt-1 line-clamp-1 text-xs font-semibold text-[#40322c]">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-center gap-1.5">
              {certificates.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "w-6 bg-[#c95b38]"
                      : "w-2 bg-[#e2d9d0] hover:bg-[#b5a79c]"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCertIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setSelectedCertIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-h-[92vh] max-w-4xl w-full overflow-hidden rounded-2xl bg-stone-900 shadow-2xl border border-stone-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-800 bg-stone-950/90 px-5 py-3.5 text-white">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">
                    {certificates[selectedCertIndex].title}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {certificates[selectedCertIndex].subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getImageUrl(certificates[selectedCertIndex].image)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-stone-700 hover:text-white"
                    title="Open original image in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setSelectedCertIndex(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-stone-700 hover:text-white"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative flex max-h-[75vh] items-center justify-center overflow-auto p-4 sm:p-6 bg-stone-950">
                <img
                  src={getImageUrl(certificates[selectedCertIndex].image)}
                  alt={certificates[selectedCertIndex].title}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                />

                {certificates.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCertIndex((prev) =>
                          prev === 0 ? certificates.length - 1 : prev! - 1
                        );
                      }}
                      className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90"
                      title="Previous Certificate"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCertIndex((prev) =>
                          prev === certificates.length - 1 ? 0 : prev! + 1
                        );
                      }}
                      className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90"
                      title="Next Certificate"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>

              <div className="border-t border-stone-800 bg-stone-950/90 px-5 py-2.5 text-center text-xs text-stone-400">
                Certificate {selectedCertIndex + 1} of {certificates.length} &bull; Use arrow keys or ESC to close
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
