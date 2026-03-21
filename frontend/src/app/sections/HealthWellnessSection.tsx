import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Dumbbell, Stethoscope, Apple, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

export function HealthWellnessSection() {
  const features = [
    {
      icon: Dumbbell,
      title: "Sports & Recreation",
      description: "Adaptive physical activities and sports programs that promote fitness, coordination, and social interaction.",
    },
    {
      icon: Stethoscope,
      title: "Medical Camps",
      description: "Regular health check-ups and medical camps providing comprehensive healthcare services to our children.",
    },
    {
      icon: Apple,
      title: "Nutrition Programs",
      description: "Balanced meal plans and nutrition education ensuring optimal physical and cognitive development.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6 text-gray-900">
              Health & Wellness
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              We believe in a holistic approach to child development. Our health and wellness programs ensure that children not only receive therapeutic support but also develop healthy lifestyles.
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="size-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Icon className="size-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl mb-2 text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 p-6 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="size-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Comprehensive Care</h4>
                  <p className="text-sm text-gray-600">
                    All programs are supervised by qualified healthcare professionals and tailored to each child's specific needs.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <div className="h-64 rounded-2xl overflow-hidden shadow-lg">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400"
                  alt="Children playing sports"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="h-80 rounded-2xl overflow-hidden shadow-lg">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400"
                  alt="Nutrition"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
            </div>
            <div className="space-y-4 pt-12">
              <div className="h-80 rounded-2xl overflow-hidden shadow-lg">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400"
                  alt="Medical care"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="h-64 rounded-2xl overflow-hidden shadow-lg">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400"
                  alt="Recreation"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
