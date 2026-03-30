import { useState } from "react";
import { Heart, HandHeart, Users, Briefcase, Calendar, Gift } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { apiPost } from "../lib/api";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export function GetInvolved() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    interestArea: "Community outreach",
    availability: "Weekends",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const opportunities = [
    {
      icon: HandHeart,
      title: "Volunteer",
      description: "Join our team of dedicated volunteers and make a direct impact in communities.",
      options: [
        "Program implementation support",
        "Skills-based volunteering (medical, education, IT)",
        "Community outreach and awareness",
        "Event support and coordination",
      ],
    },
    {
      icon: Gift,
      title: "Donate",
      description: "Your financial support enables us to expand our programs and reach more people.",
      options: [
        "One-time donations",
        "Monthly recurring support",
        "Program-specific funding",
        "In-kind donations (equipment, supplies)",
      ],
    },
    {
      icon: Briefcase,
      title: "Partner With Us",
      description: "Collaborate with UDAIREHAB to amplify impact through strategic partnerships.",
      options: [
        "Corporate social responsibility programs",
        "Research and academic partnerships",
        "Government and NGO collaboration",
        "Community-based organizations",
      ],
    },
    {
      icon: Users,
      title: "Sponsor a Program",
      description: "Support specific initiatives that align with your values and interests.",
      options: [
        "Education scholarships",
        "Healthcare equipment",
        "Community infrastructure projects",
        "Training and capacity building",
      ],
    },
    {
      icon: Calendar,
      title: "Attend Events",
      description: "Participate in our fundraising and awareness events throughout the year.",
      options: [
        "Annual fundraising gala",
        "Community awareness walks",
        "Skills training workshops",
        "Volunteer appreciation events",
      ],
    },
    {
      icon: Heart,
      title: "Spread Awareness",
      description: "Help us reach more people by sharing our mission and impact.",
      options: [
        "Share on social media",
        "Organize awareness campaigns",
        "Speak at community events",
        "Connect us with potential supporters",
      ],
    },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setFeedback(null);
      await apiPost("/forms/volunteers", formData);
      setFeedback("Volunteer application submitted successfully.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        interestArea: "Community outreach",
        availability: "Weekends",
        message: "",
      });
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Unable to submit volunteer form");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <section className="relative bg-gray-900 py-16 text-white sm:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1759709042164-0dd78a39028b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWxwaW5nJTIwaGFuZHMlMjBjaGFyaXR5fGVufDF8fHx8MTc3MzcyODUyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Helping hands"
            className="h-full w-full object-cover opacity-30"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-4xl sm:text-5xl">Get Involved</h1>
            <p className="text-lg text-gray-300 sm:text-xl">
              There are many ways to support UDAIREHAB&apos;s mission. Whether you volunteer your time, donate resources, or partner with us, your involvement makes a real difference.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl sm:text-4xl">Ways to Get Involved</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Choose the option that best fits your interests and capacity to make a difference.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opportunity, index) => {
              const Icon = opportunity.icon;
              return (
                <div key={index} className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-emerald-100">
                    <Icon className="size-6 text-emerald-600" />
                  </div>
                  <h3 className="mb-3 text-xl">{opportunity.title}</h3>
                  <p className="mb-4 text-sm text-gray-600">{opportunity.description}</p>
                  <div className="space-y-2">
                    {opportunity.options.map((option, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="mt-1.5 size-1.5 flex-shrink-0 rounded-full bg-emerald-600" />
                        <p className="text-sm text-gray-600">{option}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="relative h-96 overflow-hidden rounded-lg shadow-lg">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1771340590660-61ffd7937f88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWhhYmlsaXRhdGlvbiUyMHN1cHBvcnQlMjBjb21tdW5pdHl8ZW58MXx8fHwxNzczNzI4NTIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Volunteer in action"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="mb-6 text-3xl sm:text-4xl">Volunteer Impact</h2>
              <p className="mb-4 text-gray-600">
                "Volunteering with UDAIREHAB has been one of the most rewarding experiences of my life. Seeing the direct impact of our work on people&apos;s lives is incredibly fulfilling."
              </p>
              <p className="mb-6 text-gray-600">
                Our volunteers are the backbone of our organization. They bring diverse skills, perspectives, and dedication that make our programs possible. Whether you have a few hours a month or can commit more regularly, there&apos;s a role for you.
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="mb-2 text-lg">Volunteer Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Must be 18 years or older (or 16+ with parental consent)</li>
                  <li>• Complete volunteer orientation and training</li>
                  <li>• Commit to minimum time requirements for your role</li>
                  <li>• Background check for certain positions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="volunteer-form" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[1.5rem] border border-[#eadfd7] bg-[#fff8f4] p-8 shadow-[0_18px_40px_rgba(58,39,27,0.08)] sm:p-10">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex rounded-full bg-[#ffe2d7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d85c43]">
                Volunteer Form
              </div>
              <h2 className="mb-4 text-3xl text-[#2b1b15] sm:text-4xl">Apply to Become a Volunteer</h2>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-[#6f615a]">
                Fill out this form and our team will contact you with the next steps.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Full name"
                  required
                  className="bg-white"
                />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email address"
                  required
                  className="bg-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Phone number"
                  required
                  className="bg-white"
                />
                <Input
                  value={formData.availability}
                  onChange={(event) => setFormData((current) => ({ ...current, availability: event.target.value }))}
                  placeholder="Availability"
                  required
                  className="bg-white"
                />
              </div>
              <Input
                value={formData.interestArea}
                onChange={(event) => setFormData((current) => ({ ...current, interestArea: event.target.value }))}
                placeholder="Interest area"
                required
                className="bg-white"
              />
              <Textarea
                value={formData.message}
                onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))}
                placeholder="Tell us how you want to help"
                rows={5}
                className="bg-white"
              />

              {feedback ? (
                <div className="rounded-lg border border-[#bddcc3] bg-[#edf8ef] px-4 py-3 text-sm text-[#2f6c3e]">
                  {feedback}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#ff4b57] px-8 py-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(108,39,39,0.2)] transition hover:bg-[#ec3f4c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit Volunteer Form"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl sm:text-4xl">Your Impact in Numbers</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              See how contributions from supporters like you translate into real change.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-gray-200 bg-white p-6 text-center shadow-md">
              <div className="mb-2 text-4xl text-emerald-600">$50</div>
              <div className="text-sm text-gray-600">Provides school supplies for 5 students</div>
            </div>
            <div className="border border-gray-200 bg-white p-6 text-center shadow-md">
              <div className="mb-2 text-4xl text-emerald-600">$100</div>
              <div className="text-sm text-gray-600">Funds one month of rehabilitation therapy</div>
            </div>
            <div className="border border-gray-200 bg-white p-6 text-center shadow-md">
              <div className="mb-2 text-4xl text-emerald-600">$250</div>
              <div className="text-sm text-gray-600">Supports vocational training for one person</div>
            </div>
            <div className="border border-gray-200 bg-white p-6 text-center shadow-md">
              <div className="mb-2 text-4xl text-emerald-600">$500</div>
              <div className="text-sm text-gray-600">Establishes a community health clinic</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-emerald-600 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-3xl sm:text-4xl">Ready to Make a Difference?</h2>
          <p className="mb-8 text-lg text-emerald-100">
            Join our community of supporters and help us create lasting change. Every contribution, big or small, makes a real impact.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/#donate"
              className="rounded-md bg-white px-8 py-3 text-emerald-600 transition-colors hover:bg-gray-100"
            >
              Get Started
            </a>
            <a
              href="/contact"
              className="rounded-md border border-white px-8 py-3 text-white transition-colors hover:bg-emerald-700"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
