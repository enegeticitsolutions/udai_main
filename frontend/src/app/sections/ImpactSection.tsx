import { Users, Calendar, HandCoins, HeartHandshake } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export function ImpactSection() {
  const stats = [
    {
      icon: Users,
      value: 15000,
      suffix: "+",
      label: "Lives Impacted",
    },
    {
      icon: Calendar,
      value: 12,
      suffix: "",
      label: "Year of Service",
    },
    {
      icon: HandCoins,
      value: 250,
      prefix: "",
      suffix: "k",
      label: "Funds Raised",
    },
    {
      icon: HeartHandshake,
      value: 500,
      suffix: "+",
      label: "Generous donor",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#2f5597] py-18 text-white sm:py-22">
      <div className="absolute left-1/2 top-28 h-[420px] w-[1100px] -translate-x-1/2 rounded-[50%] bg-white/8 blur-[1px]" />
      <div className="absolute left-1/2 bottom-[-260px] h-[520px] w-[1200px] -translate-x-1/2 rounded-[50%] bg-white/10" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Our Impact at a Glance
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-white/68">
            Numbers tell only part of the story, but they represent real lives changed through your support.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-[1.1rem] border border-[#c8a85d]/35 bg-white/5 px-6 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/8">
                  <Icon className="h-8 w-8 text-[#f6d46d]" />
                </div>
                <div className="text-4xl font-semibold text-[#f6d46d]">
                  {stat.prefix}
                  <CountUp end={stat.value} />
                  {stat.suffix}
                </div>
                <div className="mt-2 text-sm text-white/80">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
