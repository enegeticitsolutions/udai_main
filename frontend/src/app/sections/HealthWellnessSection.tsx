import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Activity, HeartPulse, Apple } from "lucide-react";
import { motion } from "motion/react";

export function HealthWellnessSection() {
  const features = [
    {
      icon: Activity,
      title: "Sports & Recreation",
      description: "Inclusive sports and recreational activities that build fitness, coordination, confidence, and teamwork.",
    },
    {
      icon: HeartPulse,
      title: "Medical Camps",
      description: "Regular health screenings, dental check-ups, vaccinations, and preventive care to support early intervention and overall well-being.",
    },
    {
      icon: Apple,
      title: "Nutrition Program",
      description: "Nutritious meals and family nutrition education that encourage healthy growth and lifelong eating habits.",
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[#2b1b15] sm:text-5xl lg:text-6xl">
              Health &amp; Wellness
            </h2>
            <div className="mt-2.5 text-sm font-bold uppercase tracking-[0.18em] text-[#d66943] sm:text-base">
              Strong Bodies, Strong Minds
            </div>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#6f625c] sm:mt-8 sm:text-lg sm:leading-10">
              Good health is the foundation of every child&apos;s growth, learning, and independence. UDAI&apos;s Health &amp; Wellness Program promotes physical, emotional, and nutritional well-being through preventive healthcare, active living, and healthy lifestyle practices.
            </p>

            <div className="mt-7 space-y-5 sm:mt-10 sm:space-y-7">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#f1e7dd] bg-white shadow-[0_6px_12px_rgba(40,28,19,0.06)]">
                      <Icon className="h-5 w-5 text-[#d66943]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#2b1b15] sm:text-2xl">{feature.title}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-[#776a66] sm:text-base sm:leading-8">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-3 sm:gap-5"
          >
            {/* First row: 2 images side-by-side with equal size */}
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)] transition-transform duration-300 hover:-translate-y-1">
                <ImageWithFallback
                  src="/images/item1.png"
                  alt="Sports & Recreation"
                  className="h-[140px] w-full object-cover sm:h-[220px] md:h-[240px]"
                />
              </div>
              <div className="overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)] transition-transform duration-300 hover:-translate-y-1">
                <ImageWithFallback
                  src="/images/healthcare.png"
                  alt="Medical Camps"
                  className="h-[140px] w-full object-cover sm:h-[220px] md:h-[240px]"
                />
              </div>
            </div>

            {/* Second row: 1 image centered directly below the two images */}
            <div className="flex justify-center">
              <div className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.625rem)] overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)] transition-transform duration-300 hover:-translate-y-1">
                <ImageWithFallback
                  src="/images/item2.png"
                  alt="Nutrition Program"
                  className="h-[140px] w-full object-cover sm:h-[220px] md:h-[240px]"
                  style={{ objectPosition: "center top" }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
