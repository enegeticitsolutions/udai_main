import { Heart, GraduationCap, Hammer, Sprout, Users, BookOpen } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Programs() {
  const programs = [
    {
      icon: Heart,
      title: "Healthcare & Rehabilitation",
      description:
        "We are committed to improving the physical, mental, and emotional well-being of individuals through holistic healthcare and rehabilitation services. Our programs focus on enabling individuals with special needs and health challenges to lead independent and dignified lives.",
      image: "/images/healthcare.png",
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
      image: "/images/skill.png",
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
      image: "/images/community.png",
      services: [
        "Community awareness and engagement programs",
        "Support for underprivileged and marginalized groups",
        "Collaboration with local stakeholders and organizations",
        "Development of inclusive and supportive environments",
      ],
    },
    {
      icon: Users, // Can use a more appropriate icon like Baby if available, but Users works
      title: "Mom and Me",
      description:
        "A specialized program designed to strengthen the bond between mothers and their children through interactive and developmental activities.",
      image: "/images/mom_and_me.png", // Assuming a placeholder or if they have an image
      services: [
        "Early childhood development activities",
        "Parenting workshops and support groups",
        "Interactive play and bonding sessions",
        "Guidance on child nutrition and care",
      ],
    },
    {
      icon: Users,
      title: "Women & Youth Empowerment",
      description:
        "We empower women and youth by providing them with opportunities, skills, and confidence to lead independent and impactful lives.",
      image: "/images/youth.jpg",
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
      image: "/images/awareness.png",
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
            <h1 className="text-3xl sm:text-4xl font-semibold mb-2 text-[#2b1b15]">
              Our <span className="text-[#ff3d39]">Programs</span>
            </h1>
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
                  <div className={`relative h-80 sm:h-[480px] rounded-2xl overflow-hidden bg-white p-2 border border-[#ece4dd] shadow-lg ${!isEven ? 'md:col-start-1 md:row-start-1' : ''}`}>
                    <ImageWithFallback
                      src={program.image}
                      alt={program.title}
                      className="w-full h-full object-contain bg-white rounded-xl"
                    />
                  </div>
                </div>
              );
            })}
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
