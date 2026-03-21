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
    <div>
      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl mb-6">About UDAIREHAB</h1>
            <p className="text-lg sm:text-xl text-gray-300">
              Building resilient communities through rehabilitation, education, and sustainable development since 2011.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl mb-6">Our Story</h2>
              <p className="text-gray-600 mb-4">
                Founded in 2011, UDAIREHAB emerged from a vision to address the critical rehabilitation and development needs in underserved communities across Uganda. What started as a small grassroots initiative has grown into a comprehensive organization serving thousands of individuals annually.
              </p>
              <p className="text-gray-600 mb-4">
                Our journey has been marked by partnerships with local communities, international organizations, and dedicated volunteers who share our commitment to creating lasting change. Through evidence-based programs and community-centered approaches, we've expanded our reach while maintaining our core focus on dignity, empowerment, and sustainable development.
              </p>
              <p className="text-gray-600">
                Today, UDAIREHAB operates multiple programs across healthcare, education, and community development, touching the lives of over 50,000 individuals and families.
              </p>
            </div>
            <div className="relative h-96 rounded-lg overflow-hidden shadow-lg">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1739298061740-5ed03045b280?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwbWVldGluZyUyMGNvbGxhYm9yYXRpb258ZW58MXx8fHwxNzczNjgxNTQwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team collaboration"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="size-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
                <Target className="size-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl mb-4">Our Mission</h2>
              <p className="text-gray-600">
                To empower communities through comprehensive rehabilitation services, quality education, and sustainable development programs that promote dignity, self-reliance, and lasting positive change.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="size-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
                <Eye className="size-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl mb-4">Our Vision</h2>
              <p className="text-gray-600">
                A world where every individual has access to the resources, support, and opportunities needed to achieve their full potential and contribute meaningfully to their communities.
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
      <section className="py-16 sm:py-24 bg-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Our Impact</h2>
            <p className="text-emerald-100 max-w-2xl mx-auto">
              Real numbers that demonstrate our commitment to creating lasting change.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">50,000+</div>
              <div className="text-emerald-100">Lives Impacted</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">25+</div>
              <div className="text-emerald-100">Active Programs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">15+</div>
              <div className="text-emerald-100">Years of Service</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2">100+</div>
              <div className="text-emerald-100">Partner Organizations</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
