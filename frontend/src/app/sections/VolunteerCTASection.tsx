import { Heart, Users, Calendar, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

export function VolunteerCTASection() {
  const benefits = [
    "Make a meaningful impact in children's lives",
    "Gain valuable experience in special education",
    "Join a passionate community of changemakers",
    "Flexible scheduling to fit your lifestyle",
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Heart className="size-12 text-white fill-white" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl">Join Our Volunteer Team</h2>
            </div>
            
            <p className="text-xl text-red-50 mb-8 leading-relaxed">
              Be the change you wish to see. Your time and skills can transform lives and create lasting impact in our community.
            </p>

            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle className="size-6 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-lg text-red-50">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all transform hover:scale-105 font-medium shadow-xl inline-flex items-center justify-center gap-2">
                <Users className="size-5" />
                Become a Volunteer
              </button>
              <button className="px-8 py-4 border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all inline-flex items-center justify-center gap-2">
                <Calendar className="size-5" />
                View Open Roles
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-6"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl sm:text-5xl mb-2">500+</div>
              <div className="text-red-100">Active Volunteers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl sm:text-5xl mb-2">25+</div>
              <div className="text-red-100">Volunteer Programs</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl sm:text-5xl mb-2">10,000+</div>
              <div className="text-red-100">Volunteer Hours</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl sm:text-5xl mb-2">95%</div>
              <div className="text-red-100">Satisfaction Rate</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
