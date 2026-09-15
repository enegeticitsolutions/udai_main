import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ExternalLink, 
  Sparkles
} from "lucide-react";
import { Link } from "react-router";
import { galleryImages, type GalleryImage } from "../data/galleryData";
import { getImageUrl } from "../lib/imageUtils";

const INITIAL_PAGE_SIZE = 24;
const PAGE_INCREMENT = 16;

export function Gallery() {
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_PAGE_SIZE);
  
  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Items currently displayed
  const displayedItems = useMemo(() => {
    return galleryImages.slice(0, visibleCount);
  }, [visibleCount]);

  // Lightbox Active Item
  const activeLightboxItem: GalleryImage | null = useMemo(() => {
    if (lightboxIndex === null || lightboxIndex < 0 || lightboxIndex >= galleryImages.length) {
      return null;
    }
    return galleryImages[lightboxIndex];
  }, [lightboxIndex]);

  // Handlers for Lightbox Navigation
  const handlePrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setZoomScale(1);
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : galleryImages.length - 1));
  }, [lightboxIndex]);

  const handleNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setZoomScale(1);
    setLightboxIndex((prev) => (prev !== null && prev < galleryImages.length - 1 ? prev + 1 : 0));
  }, [lightboxIndex]);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(null);
    setZoomScale(1);
  }, []);

  // Keyboard Navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseLightbox();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [lightboxIndex, handlePrev, handleNext, handleCloseLightbox]);

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2f5597] to-[#1e3b6e] text-white py-14 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 rounded-full bg-[#ef3c32]/10 blur-3xl pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#ffd86b] backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Photo Gallery
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Moments & Memories
          </motion.h1>
        </div>
      </section>

      {/* Gallery Grid Section - Pure Pictures Only */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Responsive Masonry Pictures Grid - Auto-adjusting & Zero Cropping */}
        <div className="columns-1 min-[480px]:columns-2 md:columns-3 lg:columns-4 gap-4 sm:gap-6 [column-fill:_balance]">
          {displayedItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.3, delay: (idx % 6) * 0.03 }}
              onClick={() => {
                setLightboxIndex(idx);
                setZoomScale(1);
              }}
              className="group relative mb-4 sm:mb-6 break-inside-avoid cursor-pointer overflow-hidden rounded-2xl border border-[#e4dcce] bg-white shadow-[0_4px_14px_rgba(40,28,19,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(47,85,151,0.18)] hover:border-[#2f5597]/40"
            >
              {/* Natural Auto-Adjusting Image Box */}
              <div className="relative w-full overflow-hidden bg-[#f4efe8]">
                <img
                  src={getImageUrl(item.src)}
                  alt="UDAI Gallery"
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                />

                {/* Subtle Hover Overlay with Zoom Icon */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#1b2b52]/35 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2f5597] shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <ZoomIn className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleCount < galleryImages.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + PAGE_INCREMENT)}
              className="inline-flex items-center gap-2 rounded-full bg-[#2f5597] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#2f5597]/25 transition-all duration-300 hover:bg-[#25447b] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Load More Photos</span>
            </button>
          </div>
        )}
      </section>

      {/* Lightbox Modal - Pure Photo View */}
      <AnimatePresence>
        {activeLightboxItem && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-3 sm:p-6 select-none"
            onClick={handleCloseLightbox}
          >
            {/* Top Toolbar */}
            <div 
              className="flex w-full max-w-6xl items-center justify-end gap-4 text-white z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 2.5))}
                  className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomScale((prev) => Math.max(prev - 0.25, 0.75))}
                  className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                {zoomScale !== 1 && (
                  <button
                    onClick={() => setZoomScale(1)}
                    className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <a
                  href={getImageUrl(activeLightboxItem.src)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="Open Original"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={handleCloseLightbox}
                  className="rounded-full bg-[#ef3c32] p-2 text-white transition hover:bg-[#d63229]"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Main Image Area with Previous / Next Arrows */}
            <div 
              className="relative flex flex-1 w-full max-w-5xl items-center justify-center overflow-hidden my-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Previous Arrow */}
              <button
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white hover:text-black shadow-lg"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Centered Image */}
              <div className="relative flex max-h-[75vh] max-w-full items-center justify-center overflow-hidden p-2">
                <motion.img
                  key={activeLightboxItem.id}
                  src={getImageUrl(activeLightboxItem.src)}
                  alt="Gallery"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: zoomScale }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl transition-transform duration-200"
                />
              </div>

              {/* Next Arrow */}
              <button
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white hover:text-black shadow-lg"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Bottom Thumbnails */}
            <div 
              className="w-full max-w-4xl text-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
                {galleryImages.slice(Math.max(0, lightboxIndex - 4), Math.min(galleryImages.length, lightboxIndex + 5)).map((thumb) => {
                  const actualIdx = galleryImages.findIndex(i => i.id === thumb.id);
                  const isCurrent = actualIdx === lightboxIndex;
                  return (
                    <button
                      key={thumb.id}
                      onClick={() => {
                        setLightboxIndex(actualIdx);
                        setZoomScale(1);
                      }}
                      className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        isCurrent
                          ? "border-[#ffd86b] scale-110 shadow-lg"
                          : "border-white/30 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={getImageUrl(thumb.src)}
                        alt="Thumbnail"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom CTA Section */}
      <section className="border-t border-[#e7dfd7] bg-[#f7f2ea] py-12 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-[#1b2b52] sm:text-3xl">
            Want to support our transformative initiatives?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6e635c]">
            Every gift, volunteering hour, or corporate partnership directly creates real smiles and life-changing skills.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/#donate"
              className="rounded-full bg-[#ef3c32] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#ef3c32]/25 transition hover:bg-[#da2f26]"
            >
              Donate Now
            </Link>
            <Link
              to="/get-involved"
              className="rounded-full border border-[#2f5597] bg-white px-7 py-3 text-sm font-bold text-[#2f5597] shadow-sm transition hover:bg-[#2f5597] hover:text-white"
            >
              Get Involved
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
