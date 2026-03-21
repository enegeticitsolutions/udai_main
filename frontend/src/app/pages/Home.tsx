import { Link } from "react-router";
import { Heart, Users, Target, Award, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Home() {
  const stats = [
    { label: "Lives Impacted", value: "50,000+" },
    { label: "Active Programs", value: "25+" },
    { label: "Volunteers", value: "500+" },
    { label: "Years of Service", value: "15+" },
  ];

  const programs = [
    {
      title: "Healthcare Services",
      description: "Providing essential medical care and rehabilitation services to underserved communities.",
      icon: Heart,
      image: "https://images.unsplash.com/photo-1589104759909-e355f8999f7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwY2FyZSUyMHZvbHVudGVlcnN8ZW58MXx8fHwxNzczNzI4NTIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      title: "Education & Skills",
      description: "Empowering youth and adults through education and vocational training programs.",
      icon: Users,
      image: "https://images.unsplash.com/photo-1765223111660-cdf94396832a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZHVjYXRpb24lMjBjaGlsZHJlbiUyMGxlYXJuaW5nfGVufDF8fHx8MTc3MzY5MjU0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      title: "Community Development",
      description: "Building sustainable communities through infrastructure and economic empowerment.",
      icon: Target,
      image: "https://images.unsplash.com/photo-1761039808159-f02b58f07032?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBkZXZlbG9wbWVudCUyMGFmcmljYXxlbnwxfHx8fDE3NzM2NzcyOTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1771340590660-61ffd7937f88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWhhYmlsaXRhdGlvbiUyMHN1cHBvcnQlMjBjb21tdW5pdHl8ZW58MXx8fHwxNzczNzI4NTIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Community support"
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6">
              Transforming Lives Through Compassion
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8">
              Join us in our mission to provide rehabilitation services, education, and sustainable development to communities in need.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/get-involved"
                className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-center"
              >
                Get Involved
              </Link>
              <Link
                to="/programs"
                className="px-6 py-3 border border-white text-white rounded-md hover:bg-white hover:text-gray-900 transition-colors text-center"
              >
                Our Programs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-emerald-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-emerald-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl mb-6">Our Mission</h2>
              <p className="text-gray-600 mb-6">
                UDAIREHAB is dedicated to empowering communities through comprehensive rehabilitation services, quality education, and sustainable development initiatives. We believe that every individual deserves access to resources that enable them to reach their full potential.
              </p>
              <p className="text-gray-600 mb-8">
                Through collaboration with local partners and international organizations, we work to create lasting positive change in the lives of those we serve.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
              >
                Learn More About Us
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="relative h-96 rounded-lg overflow-hidden shadow-lg">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1759709042164-0dd78a39028b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWxwaW5nJTIwaGFuZHMlMjBjaGFyaXR5fGVufDF8fHx8MTc3MzcyODUyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Helping hands"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Our Programs</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover how we're making a difference through our targeted programs designed to address the most critical needs in our communities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {programs.map((program, index) => {
              const Icon = program.icon;
              return (
                <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <div className="h-48 overflow-hidden">
                    <ImageWithFallback
                      src={program.image}
                      alt={program.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <Icon className="size-8 text-emerald-600 mb-4" />
                    <h3 className="text-xl mb-3">{program.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{program.description}</p>
                    <Link
                      to="/programs"
                      className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm"
                    >
                      Learn More
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl mb-6">Make a Difference Today</h2>
          <p className="text-lg text-emerald-100 mb-8">
            Your support can transform lives. Join us in our mission to create lasting positive change in communities that need it most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="px-8 py-3 bg-white text-emerald-600 rounded-md hover:bg-gray-100 transition-colors"
            >
              Donate Now
            </Link>
            <Link
              to="/get-involved"
              className="px-8 py-3 border border-white text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              Volunteer With Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
