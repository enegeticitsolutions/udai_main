import { Heart, Sparkles, Users, HeartHandshake, GraduationCap, Smile, ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AffiliationsSection } from "../sections/AffiliationsSection";

export function About() {
  const values = [
    {
      number: "01",
      icon: HeartHandshake,
      title: "Inclusion with Heart",
      description: "We believe in a world where every individual is embraced, not judged, where abilities are celebrated and inclusion is a lived reality.",
      color: "bg-rose-50 text-rose-600 border-rose-200/60",
    },
    {
      number: "02",
      icon: Sparkles,
      title: "Empowerment with Purpose",
      description: "We strive to unlock every person's potential by nurturing confidence, independence, and a sense of purpose through meaningful opportunities.",
      color: "bg-amber-50 text-amber-600 border-amber-200/60",
    },
    {
      number: "03",
      icon: Users,
      title: "Respectful Relationships",
      description: "We build lasting, trust-based relationships with children, families, caregivers, and communities rooted in love, respect, and mutual growth.",
      color: "bg-blue-50 text-blue-600 border-blue-200/60",
    },
    {
      number: "04",
      icon: Heart,
      title: "Compassionate Care",
      description: "At the core of our work lies deep empathy. We walk with families on their journeys, sharing their struggles, joys, and hopes as our own.",
      color: "bg-emerald-50 text-emerald-600 border-emerald-200/60",
    },
    {
      number: "05",
      icon: GraduationCap,
      title: "Lifelong Learning",
      description: "We foster a culture of continuous learning and growth for our team, our students, and their families adapting and evolving together.",
      color: "bg-purple-50 text-purple-600 border-purple-200/60",
    },
    {
      number: "06",
      icon: Smile,
      title: "Emotional Connection & Belonging",
      description: "We create safe, nurturing spaces where everyone feels seen, heard, and valued because emotional well-being is essential to true inclusion.",
      color: "bg-orange-50 text-orange-600 border-orange-200/60",
    },
    {
      number: "07",
      icon: ShieldCheck,
      title: "Commitment to Long-Term Support",
      description: "We are here for the long haul walking alongside individuals and families through every life stage, offering unwavering care and connection.",
      color: "bg-teal-50 text-teal-600 border-teal-200/60",
    },
  ];

  const governingBody = [
    {
      name: "Smt. Tanu Rajput",
      role: "Sr. Counselor & Educator | Chairman",
      image: "/images/tanu.jpeg",
    },
    {
      name: "Dr. Kanchan Sharma",
      role: "Psychologist | Vice Chairman",
      image: "/images/kanchan.png",
    },
    {
      name: "Smt. Savita Sharma",
      role: "Microbiologist | Secretary",
      image: "/images/savita.png",
    },
    {
      name: "Sh. Praveen Kumar",
      role: "Civil Engineer | Treasurer",
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

            <div className="relative overflow-hidden rounded-[1.8rem] border border-[#ece4dd] bg-white shadow-[0_16px_34px_rgba(39,63,107,0.12)] p-2">
              <ImageWithFallback
                src="/images/mobile-unit.png"
                alt="UDAI Working Together Works Stage Ceremony"
                className="w-full h-auto object-contain bg-white rounded-[1.2rem] block"
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
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#faf7f2_0%,#f4eee6_100%)] py-20 sm:py-28">
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center sm:mb-18">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e4d7ca] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#d97706] shadow-sm">
              Our Guiding Principles
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[#20325c] sm:text-5xl">
              Core Values of UDAI
            </h2>
            <p className="mt-2 text-lg font-medium text-[#c88a2e] sm:text-xl">
              Working Together Works
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6e6057]">
              These core principles guide everything we do and shape our approach to rehabilitation, special education, and community empowerment.
            </p>
          </div>

          {/* Top Row: 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.slice(0, 4).map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="group relative flex flex-col justify-between rounded-[1.4rem] border border-[#e8dfd6] bg-white p-6 sm:p-7 shadow-[0_8px_24px_rgba(40,30,20,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#dbcac0] hover:shadow-[0_16px_34px_rgba(40,30,20,0.08)]"
                >
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <div className={`flex size-12 sm:size-13 items-center justify-center rounded-2xl border ${value.color} transition-transform duration-300 group-hover:scale-105`}>
                        <Icon className="size-6" />
                      </div>
                      <span className="rounded-full bg-[#f6f1ea] px-2.5 py-1 text-xs font-bold tracking-widest text-[#8c7e73]">
                        {value.number}
                      </span>
                    </div>
                    <h3 className="mb-2.5 text-lg font-bold tracking-tight text-[#20325c]">
                      {value.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#685b54]">
                      {value.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Row: 3 Cards Centered */}
          <div className="mt-6 flex flex-wrap justify-center gap-6">
            {values.slice(4).map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="group relative w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] flex flex-col justify-between rounded-[1.4rem] border border-[#e8dfd6] bg-white p-6 sm:p-7 shadow-[0_8px_24px_rgba(40,30,20,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#dbcac0] hover:shadow-[0_16px_34px_rgba(40,30,20,0.08)]"
                >
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <div className={`flex size-12 sm:size-13 items-center justify-center rounded-2xl border ${value.color} transition-transform duration-300 group-hover:scale-105`}>
                        <Icon className="size-6" />
                      </div>
                      <span className="rounded-full bg-[#f6f1ea] px-2.5 py-1 text-xs font-bold tracking-widest text-[#8c7e73]">
                        {value.number}
                      </span>
                    </div>
                    <h3 className="mb-2.5 text-lg font-bold tracking-tight text-[#20325c]">
                      {value.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#685b54]">
                      {value.description}
                    </p>
                  </div>
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

      {/* Registrations & Affiliations Section */}
      <AffiliationsSection />

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
