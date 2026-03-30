import { motion } from "motion/react";

export function RecognitionSection() {
  const recognitions = [
    {
      title: "Certificate of Appreciation",
      subtitle: "Ministry of Development",
      accent: "from-green-500 via-white to-orange-400",
    },
    {
      title: "Certificate of Participation",
      subtitle: "Community Initiative Summit",
      accent: "from-orange-400 via-white to-blue-900",
    },
    {
      title: "Certificate of Participation",
      subtitle: "Children First Coalition",
      accent: "from-orange-400 via-white to-blue-900",
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pt-3"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-[#2b1b15]">
              Recognition & Awards
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#7a6f69]">
              We are humbled to be recognized for our commitment to transparency and impact.
            </p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {recognitions.map((item, index) => (
              <motion.div
                key={item.title + index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="overflow-hidden rounded-[0.4rem] border border-[#dad1ca] bg-[#fffaf5] shadow-[0_8px_18px_rgba(40,28,19,0.08)]"
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${item.accent}`} />
                <div className="relative p-5">
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-black/5" />
                  <div className="rounded-[0.25rem] border border-[#e6ddd6] bg-white px-4 py-6 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b817c]">
                      Recognition
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-[#40322c]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-[#8d817b]">{item.subtitle}</p>
                    <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-[#b39d8f]">
                      <span className="h-10 w-10 rounded-full border border-[#d8d0c8]" />
                      <span className="h-10 w-10 rounded-full border border-[#d8d0c8]" />
                      <span className="h-10 w-10 rounded-full border border-[#d8d0c8]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
