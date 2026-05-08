import { Heart, GraduationCap, Hammer, Sprout, Users, BookOpen } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Programs() {
  const programs = [
    {
      icon: Heart,
      title: "Healthcare & Rehabilitation",
      description:
        "We are committed to improving the physical, mental, and emotional well-being of individuals through holistic healthcare and rehabilitation services. Our programs focus on enabling individuals with special needs and health challenges to lead independent and dignified lives.",
      image: "https://images.unsplash.com/photo-1589104759909-e355f8999f7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwY2FyZSUyMHZvbHVudGVlcnN8ZW58MXx8fHwxNzczNzI4NTIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      services: [
        "Personalized therapy programs (physical, occupational, behavioral)",
        "Mental health support and counseling",
        "Rehabilitation for differently-abled individuals",
        "Long-term care and independent living training",
      ],
    },
    {
      icon: GraduationCap,
      title: "Education & Skills Training",
      description:
        "We believe education is the foundation of empowerment. Our programs are designed to provide inclusive learning opportunities and skill development that help individuals become self-reliant and confident.",
      image: "https://images.unsplash.com/photo-1765223111660-cdf94396832a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZHVjYXRpb24lMjBjaGlsZHJlbiUyMGxlYXJuaW5nfGVufDF8fHx8MTc3MzY5MjU0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      services: [
        "Special education with customized curriculum",
        "Vocational training for employment readiness",
        "Life skills development for daily independence",
        "Digital and practical skill-building programs",
      ],
    },
    {
      icon: Hammer,
      title: "Community Development",
      description:
        "We work closely with communities to create sustainable growth, social inclusion, and equal opportunities for all. Our initiatives aim to strengthen communities by addressing their real needs and challenges.",
      image: "https://images.unsplash.com/photo-1761039808159-f02b58f07032?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBkZXZlbG9wbWVudCUyMGFmcmljYXxlbnwxfHx8fDE3NzM2NzcyOTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      services: [
        "Community awareness and engagement programs",
        "Support for underprivileged and marginalized groups",
        "Collaboration with local stakeholders and organizations",
        "Development of inclusive and supportive environments",
      ],
    },
    {
      icon: Sprout,
      title: "Food Security & Agriculture",
      description:
        "Ensuring access to basic needs like food is essential for a healthy society. We support sustainable practices and initiatives that promote food security and self-sufficiency.",
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMGZhcm1pbmd8ZW58MXx8fHwxNzM2ODU5MjA3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      services: [
        "Food distribution and nutrition programs",
        "Support for sustainable agriculture practices",
        "Awareness on healthy eating and nutrition",
        "Livelihood support through farming initiatives",
      ],
    },
    {
      icon: Users,
      title: "Women & Youth Empowerment",
      description:
        "We empower women and youth by providing them with opportunities, skills, and confidence to lead independent and impactful lives.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGVtcG93ZXJtZW50JTIwZ3JvdXB8ZW58MXx8fHwxNzM2ODU5MjA3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      services: [
        "Skill development and employment programs",
        "Leadership and confidence-building initiatives",
        "Support for entrepreneurship and self-reliance",
        "Gender equality and social inclusion programs",
      ],
    },
    {
      icon: BookOpen,
      title: "Advocacy & Awareness",
      description:
        "We aim to create awareness and bring positive social change by addressing critical issues like mental health, disability inclusion, and social stigma.",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZvY2FjeSUyMGNvbW11bml0eXxlbnwxfHx8fDE3MzY4NTkyMDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      services: [
        "Awareness campaigns on mental health and disabilities",
        "Community outreach and education programs",
        "Promoting inclusivity and reducing stigma",
        "Policy advocacy and social impact initiatives",
      ],
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="text-[#2b1b15] py-5 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl mb-2">Our Programs</h1>
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 sm:space-y-14">
            {programs.map((program, index) => {
              const Icon = program.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div key={index} className={`grid md:grid-cols-2 gap-8 items-center ${!isEven ? 'md:grid-flow-dense' : ''}`}>
                  <div className={!isEven ? 'md:col-start-2' : ''}>
                    <div className="size-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="size-6 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl mb-3">{program.title}</h2>
                    <p className="text-gray-600 mb-4">{program.description}</p>
                    <div className="space-y-3">
                      {program.services.map((service, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="size-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-gray-600 text-sm">{service}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`relative h-96 rounded-lg overflow-hidden shadow-lg ${!isEven ? 'md:col-start-1 md:row-start-1' : ''}`}>
                    <ImageWithFallback
                      src={program.image}
                      alt={program.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Program Impact</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our programs have reached thousands of individuals across multiple communities, creating measurable and sustainable impact.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl text-emerald-600 mb-2">12,000+</div>
              <div className="text-gray-600 text-sm">Rehabilitation Services Provided</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl text-emerald-600 mb-2">8,500+</div>
              <div className="text-gray-600 text-sm">Students Educated</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl text-emerald-600 mb-2">150+</div>
              <div className="text-gray-600 text-sm">Communities Served</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl text-emerald-600 mb-2">3,200+</div>
              <div className="text-gray-600 text-sm">Families Supported</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-white text-[#2b1b15]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl mb-6">Support Our Programs</h2>
          <p className="text-lg text-gray-600 mb-8">
            Your contribution helps us expand our reach and deepen our impact. Together, we can transform more lives and strengthen more communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/#donate"
              className="px-8 py-3 bg-[#ef3c32] text-white rounded-md hover:bg-[#da2f26] transition-colors"
            >
              Make a Donation
            </a>
            <a
              href="/get-involved"
              className="px-8 py-3 border border-[#e7dfd7] text-[#2b1b15] rounded-md hover:bg-[#f7f2eb] transition-colors"
            >
              Volunteer
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
