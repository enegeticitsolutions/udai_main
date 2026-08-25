import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { Therapist } from "../types/api";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { WhatsAppBookingForm } from "../components/WhatsAppBookingForm";

const DEFAULT_THERAPISTS: Therapist[] = [
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
    id: "harsimran-01",
    name: "Ms. Harsimran Kaur",
    role: "Occupational Therapist",
    department: "OT",
    image: "/images/harsimran.jpeg",
    active: true,
  },
  {
    id: "nikki-01",
    name: "Ms. Nikki",
    role: "Occupational Therapist",
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
    department: "Special Education",
    image: "/images/sonia.jpg",
    active: true,
  },
  {
    id: "shobha-01",
    name: "Ms. Shobha",
    role: "Special Educator",
    department: "Special Education",
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
  const { data: apiTherapists, isLoading, error } = useApiData<Therapist[]>(
    "/content/therapists",
    DEFAULT_THERAPISTS,
    DEFAULT_THERAPISTS,
  );
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const therapists = apiTherapists && apiTherapists.length > 0 ? apiTherapists : DEFAULT_THERAPISTS;
  const totalCount = therapists.length;

  // Auto-slide carousel continuously every 3.5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalCount);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, totalCount]);

  // Compute 4 visible cards starting from currentIndex (looping around infinitely)
  const visibleCards = [
    { item: therapists[currentIndex], key: currentIndex },
    { item: therapists[(currentIndex + 1) % totalCount], key: (currentIndex + 1) % totalCount },
    { item: therapists[(currentIndex + 2) % totalCount], key: (currentIndex + 2) % totalCount },
    { item: therapists[(currentIndex + 3) % totalCount], key: (currentIndex + 3) % totalCount },
  ];

  return (
    <section className="scroll-mt-40 bg-[#f7f4ef] py-16 sm:py-20" id="therapists">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Block with Title & Original Book Appointment Button */}
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

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading therapists...
          </div>
        ) : error && (!therapists || therapists.length === 0) ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          /* Smooth Infinite 4-Card Carousel */
          <div
            className="relative overflow-hidden py-2"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={() => setIsPaused(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                {visibleCards.map(({ item, key }, idx) => (
                  <div
                    key={`${item.id}-${key}-${idx}`}
                    className={`h-full ${idx >= 1 ? "hidden sm:block" : ""} ${
                      idx >= 2 ? "sm:hidden lg:block" : ""
                    }`}
                  >
                    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#241912]/[0.08] bg-white shadow-[0_14px_30px_rgba(41,29,22,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(41,29,22,0.14)]">
                      <div className="h-[280px] w-full overflow-hidden bg-[#f7f4f1]">
                        {item.image ? (
                          <ImageWithFallback
                            src={item.image}
                            fallbackImage="/images/doctor2.png"
                            alt={item.name}
                            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-[#f7f4f1]" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-5 bg-white">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d36f47]">
                            {item.role}
                          </div>
                          <h3 className="mt-1.5 text-xl font-semibold text-[#24396f] leading-tight">
                            {item.name}
                          </h3>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}




