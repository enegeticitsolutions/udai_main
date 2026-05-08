import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Clock3, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import type { CareerOpportunity } from "../types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export function Careers() {
  const { data: careers, isLoading, error } = useApiData<CareerOpportunity[]>(
    "/content/careers",
    [],
  );
  const [selectedCareer, setSelectedCareer] = useState<CareerOpportunity | null>(null);

  return (
    <div className="bg-[#f8f4ef]">
      <section className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-left text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
            Join Our Mission
          </h1>
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
              Loading career opportunities...
            </div>
          ) : error ? (
            <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
              {error}
            </div>
          ) : careers.length === 0 ? (
            <div className="rounded-[1.2rem] border border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
              No open roles are available right now.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {careers.map((career, index) => (
                <motion.article
                  key={career.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="rounded-[1.4rem] border border-[#ddd8d1] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.07)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex rounded-full bg-[#f3f6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2f5597]">
                        {career.department}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold text-[#2b1b15]">
                        {career.title}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[#776a66]">
                        {career.description}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f8f4ef] px-4 py-3 text-sm font-medium text-[#5e5048]">
                      Open Position
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-[#5a4f4a] sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#2f5597]" />
                      <span>{career.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BriefcaseBusiness className="h-4 w-4 text-[#2f5597]" />
                      <span>{career.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[#2f5597]" />
                      <span>{career.experience}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[#776a66]">
                      Click About to see the full role details.
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setSelectedCareer(career)}
                        className="inline-flex items-center justify-center rounded-full border border-[#2f5597] px-5 py-3 text-sm font-semibold text-[#2f5597] transition hover:bg-[#f3f6ff]"
                      >
                        About
                      </button>
                      <a
                        href={career.applyLink}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2f5597] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#264882]"
                      >
                        Apply Now
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={Boolean(selectedCareer)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCareer(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCareer?.department} - {selectedCareer?.title}
            </DialogTitle>
            <DialogDescription>
              Full details for the open position in {selectedCareer?.location}.
            </DialogDescription>
          </DialogHeader>

          {selectedCareer ? (
            <div className="space-y-5">
              <div className="grid gap-3 text-sm text-[#5a4f4a] sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#2f5597]" />
                  <span>{selectedCareer.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-[#2f5597]" />
                  <span>{selectedCareer.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#2f5597]" />
                  <span>{selectedCareer.experience}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f5597]">
                  Responsibilities
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5a4f4a]">
                  {selectedCareer.responsibilities.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 rounded-full bg-[#2f5597]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f5597]">
                  Requirements
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5a4f4a]">
                  {selectedCareer.requirements.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 rounded-full bg-[#d96d4b]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end">
                <a
                  href={selectedCareer.applyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2f5597] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#264882]"
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
