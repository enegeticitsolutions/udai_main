import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { WhatsAppBookingForm } from "../components/WhatsAppBookingForm";
import { apiGet } from "../lib/api";
import type { Therapist } from "../types/api";

const FALLBACK_THERAPISTS: Therapist[] = [
  {
    id: "harsimran-01",
    name: "Ms. Harsimran Kaur",
    role: "Occupational Therapist (OT)",
    department: "Counselling / Home Programme",
    image: "/images/harsimran.jpeg",
    active: true,
  },
  {
    id: "nikki-01",
    name: "Ms. Nikki",
    role: "Occupational Therapist (OT)",
    department: "OT",
    image: "/images/kanchan.png",
    active: true,
  },
  {
    id: "divya-01",
    name: "Ms. Divya",
    role: "Physiotherapist",
    department: "Physiotherapy",
    image: "/images/divya.jpg",
    active: true,
  },
  {
    id: "sonia-01",
    name: "Ms. Sonia",
    role: "Special Educator",
    department: "Remedial and Academics Support",
    image: "/images/sonia.jpg",
    active: true,
  },
  {
    id: "shobha-01",
    name: "Ms. Shobha",
    role: "Special Educator",
    department: "Remedial and Academics Support",
    image: "/images/shobha.jpg",
    active: true,
  },
  {
    id: "ranjana-01",
    name: "Ms. Ranjana",
    role: "Special Educator",
    department: "Special Education",
    image: "/images/savita.png",
    active: true,
  },
  {
    id: "sakshi-01",
    name: "Ms. Sakshi",
    role: "Speech Therapist",
    department: "Speech Therapy",
    image: "/images/sakshi.jpg",
    active: true,
  },
  {
    id: "atal-01",
    name: "Mr. Atal",
    role: "Speech Therapist",
    department: "Speech Therapy",
    image: "/images/harish.png",
    active: true,
  },
  {
    id: "durgesh-01",
    name: "Mr. Durgesh",
    role: "Physical Therapist",
    department: "Physical Therapy",
    image: "/images/durgesh.jpg",
    active: true,
  },
  {
    id: "tanu-01",
    name: "Ms. Tanu Rajput",
    role: "Counselling / Home Programme",
    department: "Counselling / Home Programme",
    image: "/images/tanu.jpeg",
    active: true,
  },
];

export function TherapistsSection() {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>(FALLBACK_THERAPISTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTherapists() {
      try {
        const data = await apiGet<Therapist[]>("/content/therapists");
        if (isMounted && Array.isArray(data) && data.length > 0) {
          // Filter only active therapists
          const activeList = data.filter(
            (t) => t.active !== false && (t as any).isActive !== false
          );
          setTherapists(activeList);
        }
      } catch (err) {
        console.warn("Could not fetch live therapists, using fallback:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTherapists();

    // Re-fetch when window gains focus so changes in admin panel show up instantly upon returning
    const handleFocus = () => {
      loadTherapists();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <section className="scroll-mt-40 bg-[#f7f4ef] py-16 sm:py-20" id="therapists">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Block with Title & Book Appointment Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto mb-8 max-w-7xl text-center lg:text-left"
        >
          <div className="mx-auto max-w-4xl lg:mx-0 lg:pr-44">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#d36f47]">
              Our Therapists
            </div>
            <h2 className="mb-3 text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
              Meet Our Team
            </h2>
            <p className="text-base leading-8 text-[#7b706a]">
              Our dedicated team of multidisciplinary specialists provides compassionate, tailored care to help every child grow, learn, and achieve independence.
            </p>
            <p className="mt-3 text-sm font-medium leading-7 text-[#d36f47]">
              *Therapists are assigned automatically according to each child’s specific needs and availability.
            </p>
          </div>

          <a
            href="https://wa.me/918882724057?text=hello"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-fit items-center justify-center rounded-full bg-[#ef3c32] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(239,60,50,0.24)] transition hover:bg-[#da2f26] lg:absolute lg:right-0 lg:top-24 lg:mt-0"
          >
            Book Appointment
          </a>
        </motion.div>

        <AnimatePresence>
          {isWhatsAppOpen && (
            <WhatsAppBookingForm onClose={() => setIsWhatsAppOpen(false)} />
          )}
        </AnimatePresence>

        {/* Dynamic Unified Outer Frame with Infinite Continuous Loop */}
        <div className="therapist-marquee rounded-3xl bg-white p-3.5 sm:p-5 shadow-md border border-[#e8dfd8] overflow-hidden">
          <div className="therapist-marquee-track">
            {[...therapists, ...therapists].map((item, index) => (
              <article
                key={`${String(item.id ?? item.name)}-${index}`}
                className="therapist-marquee-card group flex h-full flex-col overflow-hidden rounded-2xl border border-[#241912]/[0.08] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="h-60 sm:h-64 md:h-72 w-full overflow-hidden bg-[#f7f4f1]">
                  <ImageWithFallback
                    src={item.image || "/images/doctor2.png"}
                    fallbackImage="/images/doctor2.png"
                    alt={item.name}
                    className="h-full w-full object-cover object-[center_top] transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-3.5 bg-white">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#24396f] leading-snug">
                      {item.name}
                    </h3>
                    {item.role && (
                      <div className="mt-1 text-[11px] font-semibold text-[#d36f47] leading-tight">
                        {item.role}
                      </div>
                    )}
                    {item.department ? (
                      <div className="mt-0.5 text-[11px] font-medium text-[#7b706a] leading-tight">
                        {item.department}
                      </div>
                    ) : null}
                    {item.experience ? (
                      <div className="mt-1 text-[10px] text-[#91857e]">
                        Exp: {item.experience}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
