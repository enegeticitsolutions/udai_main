import { Heart, Eye, Target, Award } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function About() {
  const values = [
    {
      icon: Heart,
      title: "Compassion",
      description: "We approach every individual and community with empathy, understanding, and genuine care.",
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "We maintain open communication and accountability in all our operations and programs.",
    },
    {
      icon: Target,
      title: "Impact",
      description: "We focus on creating measurable, sustainable change that transforms lives and communities.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We strive for the highest standards in program delivery and community engagement.",
    },
  ];

  const team = [
    {
      name: "Dr. Sarah Mutesi",
      role: "Executive Director",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzM2ODU5MjA3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      name: "John Okello",
      role: "Programs Director",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTczNjg1OTIwN3ww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      name: "Grace Nalongo",
      role: "Community Outreach Lead",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHdvbWFuJTIwc21pbGluZ3xlbnwxfHx8fDE3MzY4NTkyMDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
  ];

  return (
    <div className="bg-[#f7f6f3]">
      {/* Hero Section */}
      <section className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-white px-5 py-7 shadow-[0_18px_45px_rgba(32,24,18,0.08)] sm:px-10 sm:py-10">
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-[#111111] sm:text-5xl lg:text-6xl">
                About UDAIREHAB
              </h1>
              <div className="mt-8 space-y-4 text-gray-600 sm:mt-10 sm:space-y-5">
                <h2 className="text-2xl text-[#111111] sm:text-4xl">Our Story</h2>
                <p className="text-sm leading-6 sm:text-base sm:leading-7">
                  UDAIREHAB is a non-profit rehabilitation and special education organization based in Delhi, India. It works primarily with children and young adults with special needs, helping them develop the skills required for independent and meaningful living.
                </p>
                <p className="text-sm leading-6 sm:text-base sm:leading-7">
                  The organization provides a combination of special education, therapy, and vocational training through a structured and supportive environment. Its approach focuses on the overall development of individuals social, emotional, cognitive, and physical.
                </p>
                <p className="text-sm leading-6 sm:text-base sm:leading-7">
                  UDAIREHAB also offers rehabilitation programs and independent living training, enabling individuals to become more self-reliant and confident in their daily lives.
                </p>
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-[1.8rem] bg-[#dfe8f7] shadow-[0_16px_34px_rgba(39,63,107,0.12)] sm:h-[28rem]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1739298061740-5ed03045b280?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwbWVldGluZyUyMGNvbGxhYm9yYXRpb258ZW58MXx8fHwxNzczNjgxNTQwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="About UDAIREHAB"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-[linear-gradient(180deg,#f8f3ec_0%,#f5efe7_100%)] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            <div className="relative min-h-0 overflow-hidden rounded-[1.5rem] border border-[#e8dfd7] bg-white px-4 py-5 shadow-[0_18px_38px_rgba(36,24,18,0.08)] before:absolute before:left-0 before:top-0 before:h-full before:w-[4px] before:rounded-l-[1.5rem] before:bg-[#18a94c] sm:min-h-[18rem] sm:rounded-[2rem] sm:px-9 sm:py-9 sm:before:w-[6px] sm:before:rounded-l-[2rem]">
              <h2 className="text-xl font-semibold tracking-tight text-[#2b1b15] sm:text-[2.25rem]">
                Mission
              </h2>
              <p className="mt-3 max-w-xl text-[0.9rem] leading-5 break-words text-[#7a6b63] sm:mt-6 sm:text-[1.2rem] sm:leading-[1.95]">
                We provide special education and therapeutic support to build independence and life skills. Through vocational training and family guidance, we empower every child to thrive.
              </p>
            </div>

            <div className="relative min-h-0 overflow-hidden rounded-[1.5rem] border border-[#e8dfd7] bg-white px-4 py-5 shadow-[0_18px_38px_rgba(36,24,18,0.08)] before:absolute before:left-0 before:top-0 before:h-full before:w-[4px] before:rounded-l-[1.5rem] before:bg-[#ff8a00] sm:min-h-[18rem] sm:rounded-[2rem] sm:px-9 sm:py-9 sm:before:w-[6px] sm:before:rounded-l-[2rem]">
              <h2 className="text-xl font-semibold tracking-tight text-[#2b1b15] sm:text-[2.25rem]">
                Vision
              </h2>
              <p className="mt-3 max-w-xl text-[0.9rem] leading-5 break-words text-[#7a6b63] sm:mt-6 sm:text-[1.2rem] sm:leading-[1.95]">
                To create an inclusive world where individuals with special needs are empowered to live with dignity, independence, and confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Our Core Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These principles guide everything we do and shape our approach to community development and service delivery.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="text-center">
                  <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="size-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl mb-3">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Our Leadership Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Meet the dedicated professionals leading UDAIREHAB's mission to transform communities.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="h-64 overflow-hidden">
                  <ImageWithFallback
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl mb-1">{member.name}</h3>
                  <p className="text-emerald-600 text-sm">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-16 sm:py-24 bg-white text-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Our Impact</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real numbers that demonstrate our commitment to creating lasting change.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">50,000+</div>
              <div className="text-gray-600">Lives Impacted</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">25+</div>
              <div className="text-gray-600">Active Programs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">15+</div>
              <div className="text-gray-600">Years of Service</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">100+</div>
              <div className="text-gray-600">Partner Organizations</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
