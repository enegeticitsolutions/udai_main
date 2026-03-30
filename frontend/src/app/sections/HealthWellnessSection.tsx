import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Activity, HeartPulse, Apple } from "lucide-react";
import { motion } from "motion/react";

export function HealthWellnessSection() {
  const features = [
    {
      icon: Activity,
      title: "Sports & Recreation",
      description: "Weekly soccer, basketball, and yoga sessions to promote fitness and teamwork.",
    },
    {
      icon: HeartPulse,
      title: "Medical Camps",
      description: "Quarterly free health screenings, dental check-ups, and vaccination drives.",
    },
    {
      icon: Apple,
      title: "Nutrition Program",
      description: "Providing daily nutritious meals and teaching families about balanced diets.",
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2a007]">
              Health & Wellness
            </div>
            <h2 className="text-5xl font-semibold leading-tight tracking-tight text-[#2b1b15] sm:text-6xl">
              <span className="block">Strong Bodies,</span>
              <span className="block">Strong Minds</span>
            </h2>

            <p className="mt-8 max-w-xl text-lg leading-10 text-[#6f625c]">
              Physical health is the foundation of a child's development. We organize regular sports activities, health check-ups, and nutrition workshops to ensure our children grow up healthy and active.
            </p>

            <div className="mt-10 space-y-7">
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
                      <h3 className="text-2xl font-semibold text-[#2b1b15]">{feature.title}</h3>
                      <p className="mt-2 max-w-lg text-base leading-8 text-[#776a66]">
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
            className="grid grid-cols-[1fr_1fr] gap-5"
          >
            <div className="self-end overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)]">
              <ImageWithFallback
                src="/images/item1.png"
                alt="Children in outdoor wellness activity"
                className="h-[300px] w-full object-cover"
              />
            </div>
            <div className="mt-[-40px] overflow-hidden rounded-[1.15rem] shadow-[0_16px_28px_rgba(40,28,19,0.14)]">
              <ImageWithFallback
                src="/images/item2.png"
                alt="Physical wellness session"
                className="h-[360px] w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
