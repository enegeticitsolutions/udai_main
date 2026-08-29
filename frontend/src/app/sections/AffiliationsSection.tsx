import { motion } from "motion/react";
import { getImageUrl } from "../lib/imageUtils";

export function AffiliationsSection() {
  const affiliations = [
    {
      id: "pwd",
      title: "Rights of Persons with Disabilities Act 2016",
      image: "/images/affiliations/pwd-act-2016.png",
    },
    {
      id: "trust",
      title: "Indian Trust Act 1882",
      image: "/images/affiliations/indian-trust-act.png",
    },
    {
      id: "12a-80g",
      title: "Income Tax 12A & 80G Exemption",
      image: "/images/affiliations/12a-80g.png",
    },
    {
      id: "national-trust",
      title: "The National Trust 1999",
      image: "/images/affiliations/national-trust.png",
    },
    {
      id: "niti-aayog",
      title: "NITI Aayog",
      image: "/images/affiliations/niti-aayog.png",
    },
    {
      id: "mca",
      title: "Ministry of Corporate Affairs",
      image: "/images/affiliations/mca-gov.png",
    },
    {
      id: "scert",
      title: "SCERT Delhi",
      image: "/images/affiliations/scert-delhi.png",
    },
    {
      id: "msme",
      title: "MSME",
      image: "/images/affiliations/msme.png",
    },
    {
      id: "fcra",
      title: "FCRA",
      image: "/images/affiliations/fcra.png",
    },
  ];

  const topAffiliations = affiliations.slice(0, 5);
  const bottomAffiliations = affiliations.slice(5);

  return (
    <section className="bg-[#fcfaf7] border-b border-[#eee5dc] py-16 sm:py-20" id="affiliations">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14"
        >
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c95b38]">
            <span className="h-2 w-2 rounded-full bg-[#c95b38]" />
            Official Credentials & Approvals
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1b2b52] sm:text-5xl">
            Registrations / Affiliations
          </h2>
          <p className="mt-4 text-base leading-7 text-[#6e635c] sm:text-lg">
            Recognized and registered under leading national acts, ministries, and governmental bodies for special education, therapy, and social welfare.
          </p>
        </motion.div>

        {/* Logos Grid: 5 Top, 4 Bottom Center-Aligned */}
        <div className="space-y-4 lg:space-y-6">
          {/* Top Row: 5 items */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-5 gap-4 lg:gap-6 justify-center"
          >
            {topAffiliations.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#e2d9d0] bg-white shadow-[0_4px_14px_rgba(40,28,19,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c95b38]/40 hover:shadow-[0_12px_24px_rgba(40,28,19,0.1)]"
              >
                <img
                  src={getImageUrl(item.image)}
                  alt={item.title}
                  title={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom Row: 4 items Center-Aligned */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 lg:gap-6"
          >
            {bottomAffiliations.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (index + 5) * 0.05 }}
                className="group relative flex aspect-[4/3] w-[calc(50%-8px)] min-[480px]:w-[calc(33.333%-11px)] md:w-[calc((100%-4*1rem)/5)] lg:w-[calc((100%-4*1.5rem)/5)] items-center justify-center overflow-hidden rounded-2xl border border-[#e2d9d0] bg-white shadow-[0_4px_14px_rgba(40,28,19,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c95b38]/40 hover:shadow-[0_12px_24px_rgba(40,28,19,0.1)]"
              >
                <img
                  src={getImageUrl(item.image)}
                  alt={item.title}
                  title={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}

