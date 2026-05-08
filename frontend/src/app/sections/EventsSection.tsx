import { useState } from "react";
import { Clock3, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import { apiPost } from "../lib/api";
import fallbackEvents from "../data/events.json";
import type { EventItem } from "../types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export function EventsSection() {
  const { data: events, isLoading, error } = useApiData<EventItem[]>(
    "/content/events",
    [],
    fallbackEvents as EventItem[],
  );
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    attendees: 1,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const upcomingEvents = events.slice(0, 3);
  const futureRoadmap = events.slice(3);

  const formatDay = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { day: "2-digit" });

  const formatMonth = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short" });

  const formatQuarter = (date: string) => {
    const month = new Date(date).getMonth();
    return `Q${Math.floor(month / 3) + 1} ${new Date(date).getFullYear()}`;
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEvent) {
      return;
    }

    try {
      setIsSubmitting(true);
      await apiPost("/forms/events/rsvp", {
        eventId: selectedEvent.id,
        ...formData,
      });
      setFeedback("RSVP submitted successfully.");
      setFormData({ name: "", email: "", attendees: 1 });
      setSelectedEvent(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Unable to submit RSVP");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-white py-16 sm:py-20" id="events">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.55fr] lg:items-start">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8 text-4xl font-semibold tracking-tight text-[#2b1b15]"
            >
              Upcoming Events
            </motion.h2>

            {feedback ? (
              <div className="mb-4 rounded-[1rem] border border-[#bddcc3] bg-[#edf8ef] px-4 py-3 text-sm text-[#2f6c3e]">
                {feedback}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
                Loading events...
              </div>
            ) : error ? (
              <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
                {error}
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((eventItem, index) => (
                  <motion.div
                    key={eventItem.id}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="grid gap-4 rounded-[1.2rem] bg-[#e7f0ff] p-4 sm:grid-cols-[118px_1fr]"
                  >
                    <div className="flex min-h-[118px] flex-col items-center justify-center rounded-[1rem] bg-white text-center">
                      <div className="text-4xl font-semibold text-[#d66943]">{formatDay(eventItem.date)}</div>
                      <div className="mt-1 text-sm font-medium text-[#8c7266]">{formatMonth(eventItem.date)}</div>
                    </div>

                    <div className="py-2 pr-2">
                      <h3 className="text-2xl font-semibold text-[#2b1b15]">{eventItem.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#7c6e67]">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{eventItem.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{eventItem.location}</span>
                        </div>
                      </div>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#655853]">{eventItem.description}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(eventItem);
                          setFeedback(null);
                        }}
                        className="mt-5 rounded-full border border-[#ff876a] px-4 py-2 text-xs font-semibold text-[#d66943] transition hover:bg-white"
                      >
                        RSVP Now
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-24"
          >
            <div className="rounded-[1.2rem] bg-[#2f5597] p-6 text-white shadow-[0_20px_40px_rgba(47,85,151,0.22)]">
              <h3 className="text-2xl font-semibold">Future Roadmap</h3>
              <p className="mt-4 text-sm leading-7 text-white/70">
                We are constantly looking forward. Here is what we have planned for the next year to expand our impact.
              </p>

              <div className="relative mt-8">
                <div className="absolute left-[9px] top-2 bottom-10 w-px bg-white/25" />

                <div className="space-y-8">
                  {futureRoadmap.map((eventItem) => (
                    <div key={eventItem.id} className="relative pl-7">
                      <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full bg-[#ff7b6a]" />
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        {formatQuarter(eventItem.date)}
                      </div>
                      <h4 className="mt-2 text-lg font-semibold text-white">{eventItem.title}</h4>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-10 text-xs leading-6 text-white/45">
                "Planning is bringing the future into the present so that you can do something about it now."
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RSVP for {selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              Submit your details and we will record your RSVP in the backend.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              required
            />
            <Input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email address"
              required
            />
            <Input
              type="number"
              min={1}
              max={20}
              value={formData.attendees}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  attendees: Number(event.target.value || 1),
                }))
              }
              placeholder="Attendees"
              required
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit RSVP"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
