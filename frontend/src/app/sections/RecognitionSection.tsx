import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ZoomIn, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export function RecognitionSection() {
  const [selectedCertIndex, setSelectedCertIndex] = useState<number | null>(null);

  const certificates = [
    {
      id: 1,
      title: "Nationwide Awards 2022",
      subtitle: "Most Prominent Special School of the Year - Business Mint",
      image: "/images/certificate1.png",
      accent: "from-amber-500 via-amber-200 to-amber-700",
    },
    {
      id: 2,
      title: "Certificate of Recognition",
      subtitle: "Nation Wide Awards 2022 - India's Prestigious Awards",
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
  ];

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

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pt-3"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-[#2b1b15]">
              Recognition & Awards
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#7a6f69]">
              We are humbled to be recognized for our commitment to transparency and impact.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {certificates.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setSelectedCertIndex(index)}
                className="group relative cursor-pointer overflow-hidden rounded-[0.5rem] border border-[#dad1ca] bg-[#fffaf5] shadow-[0_8px_18px_rgba(40,28,19,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(40,28,19,0.14)]"
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${item.accent}`} />
                
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100 p-2">
                  <img
                    src={item.image}
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
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
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
              {/* Modal Header */}
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
                    href={certificates[selectedCertIndex].image}
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

              {/* Modal Image Area */}
              <div className="relative flex max-h-[75vh] items-center justify-center overflow-auto p-4 sm:p-6 bg-stone-950">
                <img
                  src={certificates[selectedCertIndex].image}
                  alt={certificates[selectedCertIndex].title}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                />

                {/* Lightbox Navigation Buttons */}
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

              {/* Modal Footer */}
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

