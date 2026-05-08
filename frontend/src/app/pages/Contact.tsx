import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { adminApiPost, apiPost } from "../lib/api";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setError(null);
      const payload = {
        ...formData,
        subject: "Website Inquiry",
      };

      try {
        await apiPost("/forms/contact", payload);
      } catch (primaryError) {
        const message = primaryError instanceof Error ? primaryError.message : "";
        if (!/route not found|404/i.test(message)) {
          throw primaryError;
        }
        await adminApiPost("/contacts", payload);
      }

      setSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
      window.setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    }
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  return (
    <div>
      <section className="bg-[#f6f7fb] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr]">
            <div className="max-w-xl pt-8 lg:pt-16">
              <h1 className="mb-5 text-4xl font-semibold tracking-tight text-[#111111] sm:text-5xl">
                Contact Us
              </h1>
              <p className="max-w-lg text-[17px] leading-8 text-[#6d6d6d]">
                We are committed to processing the information in order to contact you and talk about your project.
              </p>

              <div className="mt-10 space-y-6">
                {[
                  { icon: MapPin, text: "Wz 12B, Asalatpur Rd, near A3 block, Block A3, Janakpuri, New Delhi, Delhi, 110058" },
                  { icon: Mail, text: "info@udairehab.org" },
                  { icon: Phone, text: "8377066832" },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="mt-1 flex size-9 items-center justify-center rounded-full bg-[#ffe4c8]">
                        <Icon className="size-4 text-[#f2994a]" />
                      </div>
                      <p className="whitespace-pre-line text-base leading-7 text-[#3d3d3d]">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#fffdf8] p-4 shadow-[0_18px_40px_rgba(28,31,50,0.08)]">
              <div className="rounded-[1.2rem] bg-white p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 outline-none placeholder:text-[#9ca3af] focus:border-[#d1d5db]"
                      placeholder="Name*"
                    />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 outline-none placeholder:text-[#9ca3af] focus:border-[#d1d5db]"
                      placeholder="Email*"
                    />
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full resize-none rounded-md border border-[#e5e7eb] px-4 py-3 outline-none placeholder:text-[#9ca3af] focus:border-[#d1d5db]"
                      placeholder="Message"
                    />
                  </div>

                  {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitted}
                    className="w-full rounded-md bg-gradient-to-r from-[#8b5cf6] via-[#e85c8d] to-[#ff8a34] px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitted ? "Message Sent!" : "Submit"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
