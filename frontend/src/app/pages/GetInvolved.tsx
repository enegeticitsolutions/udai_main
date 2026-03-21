import { Heart, HandHeart, Users, Briefcase, Calendar, Gift } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function GetInvolved() {
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

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-16 sm:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1759709042164-0dd78a39028b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWxwaW5nJTIwaGFuZHMlMjBjaGFyaXR5fGVufDF8fHx8MTc3MzcyODUyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Helping hands"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl mb-6">Get Involved</h1>
            <p className="text-lg sm:text-xl text-gray-300">
              There are many ways to support UDAIREHAB's mission. Whether you volunteer your time, donate resources, or partner with us, your involvement makes a real difference.
            </p>
          </div>
        </div>
      </section>

      {/* Opportunities Grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Ways to Get Involved</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the option that best fits your interests and capacity to make a difference.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {opportunities.map((opportunity, index) => {
              const Icon = opportunity.icon;
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="size-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="size-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl mb-3">{opportunity.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{opportunity.description}</p>
                  <div className="space-y-2">
                    {opportunity.options.map((option, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="size-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0" />
                        <p className="text-gray-600 text-sm">{option}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Volunteer Spotlight */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 rounded-lg overflow-hidden shadow-lg">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1771340590660-61ffd7937f88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWhhYmlsaXRhdGlvbiUyMHN1cHBvcnQlMjBjb21tdW5pdHl8ZW58MXx8fHwxNzczNzI4NTIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Volunteer in action"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl mb-6">Volunteer Impact</h2>
              <p className="text-gray-600 mb-4">
                "Volunteering with UDAIREHAB has been one of the most rewarding experiences of my life. Seeing the direct impact of our work on people's lives is incredibly fulfilling."
              </p>
              <p className="text-gray-600 mb-6">
                Our volunteers are the backbone of our organization. They bring diverse skills, perspectives, and dedication that make our programs possible. Whether you have a few hours a month or can commit more regularly, there's a role for you.
              </p>
              <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-200">
                <h3 className="text-lg mb-2">Volunteer Requirements</h3>
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

      {/* Impact Statistics */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Your Impact in Numbers</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See how contributions from supporters like you translate into real change.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
              <div className="text-4xl text-emerald-600 mb-2">$50</div>
              <div className="text-gray-600 text-sm">Provides school supplies for 5 students</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
              <div className="text-4xl text-emerald-600 mb-2">$100</div>
              <div className="text-gray-600 text-sm">Funds one month of rehabilitation therapy</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
              <div className="text-4xl text-emerald-600 mb-2">$250</div>
              <div className="text-gray-600 text-sm">Supports vocational training for one person</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
              <div className="text-4xl text-emerald-600 mb-2">$500</div>
              <div className="text-gray-600 text-sm">Establishes a community health clinic</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl mb-6">Ready to Make a Difference?</h2>
          <p className="text-lg text-emerald-100 mb-8">
            Join our community of supporters and help us create lasting change. Every contribution, big or small, makes a real impact.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-8 py-3 bg-white text-emerald-600 rounded-md hover:bg-gray-100 transition-colors"
            >
              Get Started
            </a>
            <a
              href="/contact"
              className="px-8 py-3 border border-white text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
