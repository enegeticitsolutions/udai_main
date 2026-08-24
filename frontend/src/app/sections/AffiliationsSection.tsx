import { motion } from "motion/react";
import { ShieldCheck, Users2, Award } from "lucide-react";
import { getImageUrl } from "../lib/imageUtils";

export function AffiliationsSection() {
  /**
   * Affiliation Image Assets (Temporary placeholders using existing images).
   * To update with real affiliation images later, simply replace the file paths below:
   * e.g., image: "/images/affiliation1.png"
   */
  const affiliationImages = [
    {
      id: 1,
      image: "/images/certificate1.png", // Replace with "/images/affiliation1.png"
      alt: "Affiliation Certificate 1",
    },
    {
      id: 2,
      image: "/images/certificate2.png", // Replace with "/images/affiliation2.png"
      alt: "Affiliation Certificate 2",
    },
    {
      id: 3,
      image: "/images/certificate3.png", // Replace with "/images/affiliation3.png"
      alt: "Affiliation Certificate 3",
    },
    {
      id: 4,
      image: "/images/aboutsection.png", // Replace with "/images/affiliation4.png"
      alt: "Affiliation Certificate 4",
    },
  ];

  const highlights = [
    {
      icon: ShieldCheck,
      title: "Accredited Institutions",
      description: "Partnered with recognized national and state bodies ensuring quality standards.",
    },
    {
      icon: Users2,
      title: "Community & NGO Network",
      description: "Collaborating with local organizations to expand reach and resource delivery.",
    },
    {
      icon: Award,
      title: "Educational Alliances",
      description: "Joint initiatives providing specialized learning modules and skill training.",
    },
  ];

  return (
    <section className="bg-[#fffaf5]/60 border-b border-[#ede6df] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          
          {/* LEFT SIDE: 4 Image Cards (2x2 Grid) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4 sm:gap-5"
          >
            {affiliationImages.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#dad1ca] bg-white p-2 shadow-[0_4px_14px_rgba(40,28,19,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(40,28,19,0.12)]"
              >
                <img
                  src={getImageUrl(item.image)}
                  alt={item.alt}
                  className="h-full w-full rounded-lg object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </motion.div>
            ))}
          </motion.div>

          {/* RIGHT SIDE: Heading, Description & Affiliation Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8b817c]">
              <span className="h-2 w-2 rounded-full bg-[#c95b38]" />
              Partnerships & Credentials
            </div>
            
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#2b1b15] sm:text-4xl">
              Affiliations
            </h2>
            
            <p className="mt-4 text-base leading-7 text-[#7a6f69]">
              Our network of partner institutions, accredited bodies, and community organizations working together for social impact.
            </p>

            <div className="mt-8 grid gap-5">
              {highlights.map((point, idx) => {
                const IconComponent = point.icon;
                return (
                  <div key={idx} className="flex items-start gap-4 rounded-xl border border-[#ede5dd] bg-white p-4 shadow-sm transition-colors hover:border-[#dbcbbd]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff4df] text-[#c95b38]">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#2b1b15]">
                        {point.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#7a6f69]">
                        {point.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
