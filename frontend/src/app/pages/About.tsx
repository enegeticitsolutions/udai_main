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

  const governingBody = [
    {
      name: "Smt. Tanu Rajput",
      role: "Business | Chairman",
      image: "/images/tanu.jpeg",
    },
    {
      name: "Dr. Kanchan Sharma",
      role: "Sr. Consultant & Educator | Vice Chairman",
      image: "/images/kanchan.png",
    },
    {
      name: "Smt. Savita Sharma",
      role: "Microbiologist | Secretary",
      image: "/images/savita.png",
    },
    {
      name: "Sh. Praveen Kumar",
      role: "Rtd. Civil Engineer | Treasurer",
      image: "/images/praveen.png",
    },
    {
      name: "Sh. Surjeet Singh Duggal",
      role: "Business | Executive Member",
      image: "/images/surjeet.png",
    },
    {
      name: "Smt. Kajal Chanana",
      role: "Business | Executive Member",
      image: "/images/kajal.png",
    },
    {
      name: "Smt. Diksha Bharti",
      role: "Consultant | Executive Member",
      image: "/images/diksha.png",
    },
    {
      name: "Sh. Harish Kumar Chandna",
      role: "Rtd. Govt Servant | Executive Member",
      image: "/images/harish.png",
    },
  ];

  const team = [
    {
      name: "Ms. Tanu Rajput",
      role: "Founder Trustee",
      image: "/images/tanu.jpeg",
    },
    {
      name: "Ms. Harsimran Kaur",
      role: "HOD Occupational Therapy",
      image: "/images/harsimran.jpeg",
    },
    {
      name: "Ms. Poonam Sagar",
      role: "Project Manager",
      image: "/images/poonam.jpeg",
    },
    {
      name: "Ms. Manisha Shandilya",
      role: "Administration",
      image: "/images/manisha.jpeg",
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
                UDAI Working Together Works
              </h1>
              <div className="mt-8 space-y-4 text-gray-600 sm:mt-10 sm:space-y-5">
                <h2 className="text-2xl text-[#111111] sm:text-4xl">Our Story</h2>
                <p className="text-sm leading-6 sm:text-base sm:leading-7">
                  UDAI Working Together Works is a non-profit rehabilitation and special education organization based in Delhi, India. It works primarily with children and young adults with special needs, helping them develop the skills required for independent and meaningful living.
                </p>
                <p className="text-sm leading-6 sm:text-base sm:leading-7">
                  The organization provides a combination of special education, therapy, and vocational training through a structured and supportive environment. Its approach focuses on the overall development of individuals social, emotional, cognitive, and physical.
                </p>
                <p className="text-sm leading-6 sm:text-base sm:leading-7">
                  UDAI Working Together Works also offers rehabilitation programs and independent living training, enabling individuals to become more self-reliant and confident in their daily lives.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.8rem] shadow-[0_16px_34px_rgba(39,63,107,0.12)]">
              <ImageWithFallback
                src="/images/mobile-unit.png"
                alt="UDAI Working Together Works Mobile Unit"
                className="w-full h-auto block"
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

      {/* Board of Trustees & Governing Body Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* First Row: Board of Trustees */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4 text-[#111111]">Board of Trustees</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our esteemed Board of Trustees who provide strategic direction and governance to the organization.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {governingBody.slice(0, 4).map((member, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-[3/4] overflow-hidden bg-gray-50">
                  <ImageWithFallback
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2 text-[#111111]">{member.name}</h3>
                  <div className="text-emerald-600 text-base font-bold leading-tight">
                    {member.role.split(" | ").map((part, i) => (
                      <span key={i} className="block">{part}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Second Row: Governing Body Members */}
          <div className="text-center mt-16 sm:mt-20 mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4 text-[#111111]">Governing Body Members</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Meet the dedicated members who contribute their expertise, leadership, and experience to support UDAI’s mission and continued growth.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {governingBody.slice(4).map((member, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-[3/4] overflow-hidden bg-gray-50">
                  <ImageWithFallback
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2 text-[#111111]">{member.name}</h3>
                  <div className="text-emerald-600 text-base font-bold leading-tight">
                    {member.role.split(" | ").map((part, i) => (
                      <span key={i} className="block">{part}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Our Leadership Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Meet the dedicated professionals leading UDAI Working Together Works' mission to transform communities.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <div className="text-emerald-600 text-lg font-bold leading-tight">
                    {member.role.split(" | ").map((part, i) => (
                      <span key={i} className="block">{part}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
