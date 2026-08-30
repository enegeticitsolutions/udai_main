import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Heart } from "lucide-react";
import { motion } from "motion/react";

export function AboutSection() {
  return (
    <section className="bg-[#fcf8f3] py-10 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto w-full max-w-lg lg:max-w-none"
          >
            <div className="absolute -left-4 -top-4 hidden h-28 w-28 rounded-full bg-amber-200/60 blur-[1px] sm:block" />
            <div className="relative overflow-hidden rounded-[1.2rem] border border-[#f0e4d8] bg-white shadow-[0_24px_50px_rgba(41,29,22,0.14)] sm:rounded-[2rem]">
              <ImageWithFallback
                src="/images/about.png"
                alt="About UDAI - Moments of Joy and Learning"
                className="w-full h-auto block object-contain"
              />
            </div>

            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10 w-[88%] max-w-[270px] rounded-[1rem] border border-[#eedfd4] bg-white/95 px-4 py-2.5 text-center shadow-[0_16px_36px_rgba(55,35,21,0.15)] backdrop-blur-md sm:-bottom-6 sm:max-w-[340px] sm:rounded-[1.2rem] sm:px-5 sm:py-3.5">
              <p className="text-xs font-semibold italic leading-snug text-[#d67852] sm:text-sm sm:leading-snug">
                &quot;Every child deserves a chance to dream.&quot;
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="sm:pt-4 lg:pt-8"
          >
            <div className="mb-3 flex items-center gap-2 text-blue-700 sm:mb-4">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-base font-medium sm:text-lg">Who We Are</span>
            </div>

            <h2 className="mb-3 text-2xl font-semibold leading-tight tracking-tight text-[#2b1b15] sm:mb-4 sm:text-4xl lg:text-5xl">
              <span className="block">Nurturing Potential,</span>
              <span className="block text-blue-700">Building Futures.</span>
            </h2>

            <p className="mb-3 text-xs leading-5 text-[#6f625c] sm:mb-4 sm:text-[15px] sm:leading-7">
              At <strong>UDAI – Working Together Works</strong>, we believe every child, regardless of ability, deserves the opportunity to learn, grow, and lead a fulfilling life.
            </p>

            <p className="mb-3 text-xs leading-5 text-[#6f625c] sm:mb-4 sm:text-[15px] sm:leading-7">
              Children with developmental delays and special needs deserve more than care — they deserve opportunities to thrive. At UDAI, we partner with families to provide holistic education, therapeutic support, life skills training, and vocational development tailored to each child&apos;s unique journey.
            </p>

            <p className="mb-3 text-xs leading-5 text-[#6f625c] sm:mb-4 sm:text-[15px] sm:leading-7">
              As a registered charitable trust, we are committed to nurturing every child&apos;s social, emotional, cognitive, and functional growth in an inclusive and supportive environment where abilities are celebrated and potential is unlocked.
            </p>

            <p className="mb-4 text-xs leading-5 text-[#6f625c] sm:mb-6 sm:text-[15px] sm:leading-7">
              We believe every child deserves the chance to discover their strengths, build confidence, and create a future filled with possibilities.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
