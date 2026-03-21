import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BookOpen, GraduationCap, Laptop, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function EducationSection() {
  const programs = [
    {
      icon: BookOpen,
      title: "After-School Tutoring",
      description: "Personalized learning support to help children excel academically with specialized teaching methods.",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600",
    },
    {
      icon: GraduationCap,
      title: "Scholarship Fund",
      description: "Financial assistance ensuring every child has access to quality education regardless of economic status.",
      image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600",
    },
    {
      icon: Laptop,
      title: "Digital Literacy",
      description: "Technology training programs preparing children for the digital age with adaptive learning tools.",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-gray-900">Education Programs</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Empowering minds through inclusive and adaptive learning experiences
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {programs.map((program, index) => {
            const Icon = program.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="relative h-64 overflow-hidden">
                  <ImageWithFallback
                    src={program.image}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 size-12 bg-white rounded-xl flex items-center justify-center">
                    <Icon className="size-6 text-blue-600" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl mb-3 text-gray-900">{program.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">{program.description}</p>
                  <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm group-hover:gap-3 transition-all">
                    Learn More
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
