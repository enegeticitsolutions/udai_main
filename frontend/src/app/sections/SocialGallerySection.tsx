import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Instagram, Facebook, Twitter } from "lucide-react";
import { motion } from "motion/react";

export function SocialGallerySection() {
  const images = [
    { id: 1, url: "/images/Social1.png" },
    { id: 2, url: "/images/social2.png" },
    { id: 3, url: "/images/social3.png" },
    { id: 4, url: "/images/social4.png" },
  ];

  return (
    <section className="bg-white py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#2b1b15] sm:text-4xl">
              @HeartAndSoil on Social
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[#b9aca5]">
            <Instagram className="h-5 w-5" />
            <Twitter className="h-5 w-5" />
            <Facebook className="h-5 w-5" />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-[0.9rem]"
            >
              <ImageWithFallback
                src={image.url}
                alt={`Gallery image ${image.id}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-black/20 text-white backdrop-blur-sm">
                  <Instagram className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
