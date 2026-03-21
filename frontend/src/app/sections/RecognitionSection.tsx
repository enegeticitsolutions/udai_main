import { Award, Shield, Star, Trophy } from "lucide-react";
import { motion } from "motion/react";

export function RecognitionSection() {
  const recognitions = [
    {
      icon: Award,
      title: "ISO 9001:2015 Certified",
      description: "Quality Management",
    },
    {
      icon: Shield,
      title: "NGO Registration",
      description: "Government Accredited",
    },
    {
      icon: Star,
      title: "Best NGO Award 2024",
      description: "Children's Services",
    },
    {
      icon: Trophy,
      title: "Community Impact",
      description: "Excellence Award",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl mb-4 text-gray-900">Recognition & Certifications</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Trusted and accredited by leading organizations
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {recognitions.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-center group hover:-translate-y-2"
              >
                <div className="size-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="size-8 text-blue-600" />
                </div>
                <h3 className="text-lg mb-2 text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
