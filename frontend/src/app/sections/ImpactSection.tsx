import { Users, Calendar, DollarSign, Heart } from "lucide-react";
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
      value: 5000,
      suffix: "+",
      label: "Lives Impacted",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Calendar,
      value: 15,
      suffix: "+",
      label: "Years of Service",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      icon: DollarSign,
      value: 2500000,
      prefix: "$",
      suffix: "",
      label: "Funds Raised",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Heart,
      value: 1200,
      suffix: "+",
      label: "Active Donors",
      color: "from-rose-500 to-rose-600",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4">Our Impact in Numbers</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Real results from our commitment to transforming lives
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`size-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <Icon className="size-8 text-white" />
                </div>
                <div className="text-4xl sm:text-5xl mb-2">
                  {stat.prefix}
                  <CountUp end={stat.value} />
                  {stat.suffix}
                </div>
                <div className="text-lg text-blue-100">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
