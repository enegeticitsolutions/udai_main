import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import { useNavigate } from "react-router";
import type { Therapist } from "../types/api";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const departmentOrder = [
  "Occupational Therapy",
  "Special Education",
  "Speech Therapy",
  "Physical Therapy",
  "Remedial Support",
  "Counselling / Home Programme",
];

const departmentDescriptions: Record<string, string> = {
  "Occupational Therapy":
    "Supports motor, sensory, and daily living development through structured therapy.",
  "Special Education":
    "Helps children build learning independence through individualized classroom support.",
  "Speech Therapy":
    "Supports children with speech, language, and communication development.",
  "Physical Therapy":
    "Supports movement, strength, coordination, and physical rehabilitation goals.",
  "Remedial Support":
    "Provides remedial support for academics, focus, and learning progress.",
  "Counselling / Home Programme":
    "Provides counseling and home-program guidance for family-centered support.",
};

export function TherapistsSection() {
  const navigate = useNavigate();
  const { data: therapists, isLoading, error } = useApiData<Therapist[]>(
    "/content/therapists",
    [],
  );

  const groupedTherapists = departmentOrder
    .map((department) => ({
      department,
      therapists: therapists.filter((therapist) => therapist.department === department).slice(0, 3),
    }))
    .filter((group) => group.therapists.length > 0);

  const openAppointmentForm = (department: string) => {
    navigate(`/appointment?department=${encodeURIComponent(department)}`);
  };

  return (
    <section className="bg-[#f3f6ff] py-16 sm:py-20" id="therapists">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-10 max-w-4xl text-center"
        >
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2a007]">
            Our Therapy Teams
          </div>
          <h2 className="mb-3 text-4xl font-semibold tracking-tight text-[#2f5597] sm:text-5xl">
            Department-wise Support
          </h2>
          <p className="text-base leading-8 text-[#7b706a]">
            We recommend a team-based approach. Book by department through the appointment form, and our internal team will assign the right therapist based on availability and the child&apos;s needs.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading therapy teams...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTherapists.map((group, groupIndex) => (
              <motion.div
                key={group.department}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: groupIndex * 0.05 }}
                className="overflow-hidden rounded-[1.6rem] border border-[#ddd8d1] bg-white shadow-[0_10px_26px_rgba(41,29,22,0.08)]"
              >
                <div className="flex flex-col gap-4 border-b border-[#ece4dc] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d36f47]">
                      Department
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold text-[#24396f]">
                      {group.department}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[#756761]">
                      {departmentDescriptions[group.department]}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAppointmentForm(group.department)}
                    className="inline-flex items-center justify-center rounded-full bg-[#2f5597] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#264882]"
                  >
                    Book Appointment
                  </button>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
                  {group.therapists.map((therapist) => (
                    <div
                      key={therapist.id}
                      className="overflow-hidden rounded-[1.15rem] border border-[#e3ddd6] bg-[#fffdfb]"
                    >
                      <div className="p-3">
                        <div className="overflow-hidden rounded-[0.8rem]">
                        <ImageWithFallback
                          src={therapist.image}
                          alt={therapist.name}
                          className="h-72 w-full bg-[#f7f4f1] object-contain p-2"
                        />
                      </div>
                    </div>

                      <div className="px-4 pb-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d36f47]">
                          {therapist.department}
                        </div>
                        <h4 className="mt-2 text-2xl font-semibold text-[#24396f]">
                          {therapist.name}
                        </h4>
                        <p className="mt-2 text-lg font-medium text-[#556794]">
                          {therapist.role}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[#6f6460]">
                          {therapist.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
