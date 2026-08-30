import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { WhatsAppBookingForm } from "../components/WhatsAppBookingForm";

// Exactly 10 unique team members
const THERAPISTS = [
  {
    id: "harsimran-01",
    name: "Ms. Harsimran Kaur",
    role: "Occupational Therapist (OT)",
    department: "Counselling / Home Programme",
    image: "/images/harsimran.jpeg"
  },
  {
    id: "nikki-01",
    name: "Ms. Nikki",
    role: "Occupational Therapist (OT)",
    department: "",
    image: "/images/kanchan.png"
  },
  {
    id: "divya-01",
    name: "Ms. Divya",
    role: "Physiotherapist",
    department: "",
    image: "/images/divya.jpg"
  },
  {
    id: "sonia-01",
    name: "Ms. Sonia",
    role: "Special Educator",
    department: "Remedial and Academics Support",
    image: "/images/sonia.jpg"
  },
  {
    id: "shobha-01",
    name: "Ms. Shobha",
    role: "Special Educator",
    department: "Remedial and Academics Support",
    image: "/images/shobha.jpg"
  },
  {
    id: "ranjana-01",
    name: "Ms. Ranjana",
    role: "Special Educator",
    department: "",
    image: "/images/savita.png"
  },
  {
    id: "sakshi-01",
    name: "Ms. Sakshi",
    role: "Speech Therapist",
    department: "",
    image: "/images/sakshi.jpg"
  },
  {
    id: "atal-01",
    name: "Mr. Atal",
    role: "Speech Therapist",
    department: "",
    image: "/images/harish.png"
  },
  {
    id: "durgesh-01",
    name: "Mr. Durgesh",
    role: "Physical Therapist",
    department: "",
    image: "/images/durgesh.jpg"
  },
  {
    id: "tanu-01",
    name: "Ms. Tanu Rajput",
    role: "Counselling / Home Programme",
    department: "",
    image: "/images/tanu.jpeg"
  }
];

export function TherapistsSection() {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

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

        {/* Single Unified Outer Frame Wrapping All 10 Cards in a Clean 5x2 Desktop Grid */}
        <div className="rounded-3xl bg-white p-3.5 sm:p-5 shadow-md border border-[#e8dfd8] overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {THERAPISTS.map((item) => (
              <article
                key={item.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#241912]/[0.08] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="h-44 sm:h-48 md:h-52 w-full overflow-hidden bg-[#f7f4f1]">
                  <ImageWithFallback
                    src={item.image || "/images/doctor2.png"}
                    fallbackImage="/images/doctor2.png"
                    alt={item.name}
                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-3.5 bg-white">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#24396f] leading-snug">
                      {item.name}
                    </h3>
                    <div className="mt-1 text-[11px] font-semibold text-[#d36f47] leading-tight">
                      {item.role}
                    </div>
                    {item.department ? (
                      <div className="mt-0.5 text-[11px] font-medium text-[#7b706a] leading-tight">
                        {item.department}
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
