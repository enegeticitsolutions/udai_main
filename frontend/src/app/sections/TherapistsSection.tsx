import { motion, AnimatePresence } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { Therapist } from "../types/api";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useState } from "react";
import { WhatsAppBookingForm } from "../components/WhatsAppBookingForm";

export function TherapistsSection() {
  const { data: therapists, isLoading, error } = useApiData<Therapist[]>(
    "/content/therapists",
    [],
  );
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const loopingTherapists = [...therapists, ...therapists];

  return (
    <section className="scroll-mt-40 bg-[#f7f4ef] py-16 sm:py-20" id="therapists">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto mb-8 max-w-6xl text-center lg:text-left"
        >
          <div className="mx-auto max-w-4xl lg:mx-0 lg:pr-44">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#d36f47]">
              Our Therapists
            </div>
            <h2 className="mb-3 text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
              Meet Our Team
            </h2>
            <p className="text-base leading-8 text-[#7b706a]">
              Our dedicated therapists specialize in supporting children with special needs, providing compassionate care to help them grow, learn, and thrive.
            </p>
            <p className="mt-3 text-sm font-medium leading-7 text-[#d36f47]">
              *Therapists are assigned automatically according to each child’s specific needs and their availability.
            </p>
          </div>

          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="mt-6 inline-flex h-fit items-center justify-center rounded-full bg-[#ef3c32] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(239,60,50,0.24)] transition hover:bg-[#da2f26] lg:absolute lg:right-0 lg:top-24 lg:mt-0"
          >
            Book Appointment
          </button>
        </motion.div>

        <AnimatePresence>
          {isWhatsAppOpen && (
            <WhatsAppBookingForm onClose={() => setIsWhatsAppOpen(false)} />
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading therapists...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          <div className="therapist-marquee">
            <div className="therapist-marquee-track">
              {loopingTherapists.map((therapist, index) => (
                <article
                  key={`${therapist.id}-${index}`}
                  className="therapist-marquee-card"
                >
                  <div className="therapist-marquee-image">
                    <ImageWithFallback
                      src={therapist.image}
                      alt={therapist.name}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: "center 12%" }}
                    />
                  </div>
                  <div className="therapist-marquee-copy">
                    <h3>{therapist.name}</h3>
                    <div className="therapist-marquee-department">{therapist.role}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
