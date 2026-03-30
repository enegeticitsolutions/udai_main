import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { useState } from "react";
import { apiPost } from "../lib/api";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setError(null);
      await apiPost("/forms/contact", formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
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

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: ["info@udairehab.org", "support@udairehab.org"],
    },
    {
      icon: Phone,
      title: "Phone",
      details: ["+91 9899681972", "+91 8377066832"],
    },
    {
      icon: MapPin,
      title: "Address",
      details: ["Plot 123, Main Street", "Kampala, Uganda"],
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: ["Monday - Friday: 8:00 AM - 5:00 PM", "Saturday: 9:00 AM - 1:00 PM"],
    },
  ];

  return (
    <div>
      <section className="bg-gray-900 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-4xl sm:text-5xl">Contact Us</h1>
            <p className="text-lg text-gray-300 sm:text-xl">
              Have questions or want to get involved? We&apos;d love to hear from you. Reach out to us and we&apos;ll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="mb-2 block text-sm text-gray-700">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select a subject</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Donation">Donation</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Program Support">Program Support</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="mb-2 block text-sm text-gray-700">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full resize-none rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder="Tell us more about your inquiry..."
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
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                >
                  {submitted ? (
                    "Message Sent!"
                  ) : (
                    <>
                      <Send className="size-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            <div>
              <h2 className="mb-6 text-3xl">Contact Information</h2>
              <p className="mb-8 text-gray-600">
                You can also reach us through any of the following channels. We&apos;re here to help and answer any questions you may have.
              </p>

              <div className="space-y-6">
                {contactInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                        <Icon className="size-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg">{info.title}</h3>
                        {info.details.map((detail, detailIndex) => (
                          <p key={detailIndex} className="text-sm text-gray-600">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex h-64 items-center justify-center rounded-lg bg-gray-200">
                <div className="text-center text-gray-500">
                  <MapPin className="mx-auto mb-2 size-12" />
                  <p className="text-sm">Map Location</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl sm:text-4xl">Make a Donation</h2>
            <p className="mb-8 text-gray-600">
              Your generous donations help us continue our mission to transform lives. Every contribution makes a difference.
            </p>

            <div className="rounded-lg bg-white p-8 shadow-md">
              <h3 className="mb-4 text-xl">Bank Transfer Details</h3>
              <div className="mx-auto max-w-md space-y-3 text-left text-sm text-gray-600">
                <div className="flex justify-between border-b border-gray-200 py-2">
                  <span className="font-medium">Bank Name:</span>
                  <span>Stanbic Bank Uganda</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 py-2">
                  <span className="font-medium">Account Name:</span>
                  <span>UDAI Rehabilitation Foundation</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 py-2">
                  <span className="font-medium">Account Number:</span>
                  <span>0123456789</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 py-2">
                  <span className="font-medium">Swift Code:</span>
                  <span>SBICUGKX</span>
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                For online donation intent capture, use the donation form on the homepage. It is connected to the backend now.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
