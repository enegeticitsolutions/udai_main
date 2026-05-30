import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Heart } from "lucide-react";
import { motion } from "motion/react";

export function AboutSection() {
  return (
    <section className="bg-[#fcf8f3] py-10 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-7 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="absolute -left-6 -top-6 hidden h-28 w-28 rounded-full bg-amber-200/60 blur-[1px] sm:block" />
            <div className="relative overflow-hidden rounded-[1.2rem] shadow-[0_24px_50px_rgba(41,29,22,0.16)] sm:rounded-[2rem]">
              <ImageWithFallback
                src="/images/about.png"
                alt="About UDAI"
                className="h-[230px] w-full object-cover sm:h-[520px]"
              />
            </div>

            <div className="relative mx-auto -mt-6 w-[82%] rounded-[1rem] bg-white px-4 py-3 shadow-[0_20px_40px_rgba(55,35,21,0.14)] sm:-mt-10 sm:ml-auto sm:mr-0 sm:w-[42%] sm:rounded-[1.1rem] sm:px-5 sm:py-4">
              <p className="text-sm leading-5 text-[#d67852] sm:text-lg sm:leading-7">
                "Every child deserves a chance to dream."
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
              UDAI - Working Together Works is a registered charitable trust committed to serving children and young adults with special needs. Since its inception, the organization has focused on holistic rehabilitation through education, therapy, and skill development programs.
            </p>

            <p className="mb-4 text-xs leading-5 text-[#6f625c] sm:mb-6 sm:text-[15px] sm:leading-7">
              Founded with the vision of holistic development, UDAI provides structured programs that nurture the social, emotional, cognitive, and life skills of children with special needs.
            </p>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="rounded-[1rem] border border-[#e7e1da] border-l-[4px] border-l-green-600 bg-white p-3 shadow-[0_16px_36px_rgba(41,29,22,0.12)] sm:rounded-[1.2rem] md:aspect-[2.2/1]"
              >
                <h3 className="mb-1 text-sm font-semibold text-[#2b1b15] sm:mb-1.5 sm:text-lg">Mission</h3>
                <p className="text-[11px] leading-4 text-[#6f625c] sm:text-[13px] sm:leading-5">
                  We provide special education and therapeutic support to build independence and life skills. Through vocational training and family guidance, we empower every child to thrive.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="rounded-[1rem] border border-[#e7e1da] border-l-[4px] border-l-orange-400 bg-white p-3 shadow-[0_16px_36px_rgba(41,29,22,0.12)] sm:rounded-[1.2rem] md:aspect-[2.2/1]"
              >
                <h3 className="mb-1 text-sm font-semibold text-[#2b1b15] sm:mb-1.5 sm:text-lg">Vision</h3>
                <p className="text-[11px] leading-4 text-[#6f625c] sm:text-[13px] sm:leading-5">
                  To create an inclusive world where individuals with special needs are empowered to live with dignity, independence, and confidence.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
