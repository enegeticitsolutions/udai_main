import { Palette, Music, Camera } from "lucide-react";
import { motion } from "motion/react";

export function ArtsSection() {
  const programs = [
    {
      icon: Palette,
      title: "Art Workshops",
      description: "Painting, drawing, and sculpting classes that allow children to explore colors and forms, fostering imagination and fine motor skills.",
    },
    {
      icon: Music,
      title: "Music & Dance",
      description: "Traditional and contemporary dance, choir, and instrument lessons that build rhythm, confidence, and cultural appreciation.",
    },
    {
      icon: Camera,
      title: "Media Arts",
      description: "Photography and storytelling workshops that empower youth to document their lives and share their unique perspectives with the world.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#2f5597] py-20 text-white sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_40%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2b4f8d] to-transparent" />
      <div className="absolute left-0 top-0 h-full w-full opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:90px_90px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd86b]">
            Arts & Culture
          </div>
          <h2 className="mb-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Unleashing Creativity
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-white/70">
            Art heals, inspires, and connects. We provide safe spaces for children to express themselves through various creative mediums.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {programs.map((program, index) => {
            const Icon = program.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-[1.3rem] border border-white/8 bg-white/14 p-8 backdrop-blur-sm"
              >
                <Icon className="mb-8 h-7 w-7 text-[#ffd86b]" />
                <h3 className="mb-4 text-2xl font-semibold text-white">{program.title}</h3>
                <p className="text-base leading-8 text-white/74">{program.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
