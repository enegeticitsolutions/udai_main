import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Instagram, Heart } from "lucide-react";
import { motion } from "motion/react";

export function SocialGallerySection() {
  const images = [
    { id: 1, url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400", likes: 342 },
    { id: 2, url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400", likes: 256 },
    { id: 3, url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400", likes: 421 },
    { id: 4, url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400", likes: 389 },
    { id: 5, url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400", likes: 512 },
    { id: 6, url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400", likes: 298 },
    { id: 7, url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400", likes: 367 },
    { id: 8, url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400", likes: 445 },
  ];

  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Instagram className="size-8 text-pink-600" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-gray-900">Follow Our Journey</h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay connected with daily updates, stories, and moments from our community
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer"
            >
              <ImageWithFallback
                src={image.url}
                alt={`Gallery image ${image.id}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                  <Heart className="size-5 fill-white" />
                  <span className="font-medium">{image.likes}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium shadow-lg">
            <Instagram className="size-5" />
            Follow @udairehab
          </button>
        </motion.div>
      </div>
    </section>
  );
}
