import { Heart, GraduationCap, Hammer, Sprout, Users, BookOpen } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Programs() {
  const programs = [
    {
      icon: Heart,
      title: "Healthcare & Rehabilitation",
      description: "Comprehensive medical services and rehabilitation programs for individuals with physical and mental health challenges.",
      image: "https://images.unsplash.com/photo-1589104759909-e355f8999f7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwY2FyZSUyMHZvbHVudGVlcnN8ZW58MXx8fHwxNzczNzI4NTIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      services: [
        "Physical therapy and occupational therapy",
        "Mental health counseling and support",
        "Medical outreach clinics",
        "Assistive device provision and training",
      ],
    },
    {
      icon: GraduationCap,
      title: "Education & Skills Training",
      description: "Empowering individuals through quality education and vocational training programs that build sustainable livelihoods.",
      image: "https://images.unsplash.com/photo-1765223111660-cdf94396832a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZHVjYXRpb24lMjBjaGlsZHJlbiUyMGxlYXJuaW5nfGVufDF8fHx8MTc3MzY5MjU0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      services: [
        "Adult literacy programs",
        "Vocational skills training",
        "Scholarship programs for vulnerable children",
        "Computer and digital literacy courses",
      ],
    },
    {
      icon: Hammer,
      title: "Community Development",
      description: "Building infrastructure and creating sustainable economic opportunities within communities.",
      image: "https://images.unsplash.com/photo-1761039808159-f02b58f07032?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBkZXZlbG9wbWVudCUyMGFmcmljYXxlbnwxfHx8fDE3NzM2NzcyOTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      services: [
        "Water and sanitation projects",
        "Community center construction",
        "Microfinance and small business support",
        "Agricultural development initiatives",
      ],
    },
    {
      icon: Sprout,
      title: "Food Security & Agriculture",
      description: "Promoting sustainable agriculture and ensuring food security for vulnerable communities.",
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMGZhcm1pbmd8ZW58MXx8fHwxNzM2ODU5MjA3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      services: [
        "Training in modern farming techniques",
        "Seed and tool distribution",
        "Nutrition education programs",
        "Community garden initiatives",
      ],
    },
    {
      icon: Users,
      title: "Women & Youth Empowerment",
      description: "Specialized programs supporting women and youth to become leaders and changemakers in their communities.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGVtcG93ZXJtZW50JTIwZ3JvdXB8ZW58MXx8fHwxNzM2ODU5MjA3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      services: [
        "Women's entrepreneurship training",
        "Youth leadership development",
        "Gender-based violence prevention",
        "Mentorship programs",
      ],
    },
    {
      icon: BookOpen,
      title: "Advocacy & Awareness",
      description: "Raising awareness and advocating for the rights and inclusion of marginalized communities.",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZvY2FjeSUyMGNvbW11bml0eXxlbnwxfHx8fDE3MzY4NTkyMDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      services: [
        "Community sensitization workshops",
        "Rights-based advocacy campaigns",
        "Policy dialogue and engagement",
        "Inclusion and accessibility initiatives",
      ],
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl mb-6">Our Programs</h1>
            <p className="text-lg sm:text-xl text-gray-300">
              Discover our comprehensive range of programs designed to address critical needs and create lasting positive change in communities.
            </p>
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {programs.map((program, index) => {
              const Icon = program.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div key={index} className={`grid md:grid-cols-2 gap-8 items-center ${!isEven ? 'md:grid-flow-dense' : ''}`}>
                  <div className={!isEven ? 'md:col-start-2' : ''}>
                    <div className="size-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
                      <Icon className="size-6 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl mb-4">{program.title}</h2>
                    <p className="text-gray-600 mb-6">{program.description}</p>
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
      <section className="py-16 sm:py-24 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl mb-6">Support Our Programs</h2>
          <p className="text-lg text-emerald-100 mb-8">
            Your contribution helps us expand our reach and deepen our impact. Together, we can transform more lives and strengthen more communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-8 py-3 bg-white text-emerald-600 rounded-md hover:bg-gray-100 transition-colors"
            >
              Make a Donation
            </a>
            <a
              href="/get-involved"
              className="px-8 py-3 border border-white text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              Volunteer
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
