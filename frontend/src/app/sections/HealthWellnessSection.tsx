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
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2a007]">
              Health & Wellness
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#2b1b15] sm:text-6xl">
              <span className="block">Strong Bodies,</span>
              <span className="block">Strong Minds</span>
            </h2>

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
            className="grid grid-cols-2 gap-3 sm:gap-5"
          >
            <div className="self-end overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)]">
              <ImageWithFallback
                src="/images/item1.png"
                alt="Children in outdoor wellness activity"
                className="h-[190px] w-full object-cover sm:h-[300px]"
              />
            </div>
            <div className="mt-[-20px] overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)] sm:mt-[-40px]">
              <ImageWithFallback
                src="/images/item2.png"
                alt="Physical wellness session"
                className="h-[230px] w-full object-cover sm:h-[360px]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
