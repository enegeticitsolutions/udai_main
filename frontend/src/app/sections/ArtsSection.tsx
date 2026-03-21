import { Palette, Music, Camera, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function ArtsSection() {
  const programs = [
    {
      icon: Palette,
      title: "Art Workshops",
      description: "Creative expression through painting, drawing, and sculpture, fostering imagination and motor skills.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Music,
      title: "Music & Dance",
      description: "Rhythm, movement, and melody therapy that enhances coordination, memory, and emotional expression.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Camera,
      title: "Media Arts",
      description: "Digital storytelling, photography, and video production developing technical and creative skills.",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4">Arts & Creative Expression</h2>
          <p className="text-xl text-blue-50 max-w-2xl mx-auto">
            Unlocking potential through creativity, imagination, and artistic exploration
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
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition-all group border border-white/20"
              >
                <div className={`size-16 bg-gradient-to-br ${program.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="size-8 text-white" />
                </div>
                <h3 className="text-2xl mb-4">{program.title}</h3>
                <p className="text-blue-50 mb-6 leading-relaxed">{program.description}</p>
                <button className="inline-flex items-center gap-2 text-white hover:gap-3 transition-all font-medium">
                  Explore Program
                  <ArrowRight className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-lg text-blue-50 mb-6">
            Every child is an artist. Help us provide the tools and support they need.
          </p>
          <button className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 font-medium shadow-xl">
            Support Arts Programs
          </button>
        </motion.div>
      </div>
    </section>
  );
}
