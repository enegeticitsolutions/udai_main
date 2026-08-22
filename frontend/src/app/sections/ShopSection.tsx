import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useApiData } from "../hooks/useApiData";
import fallbackProducts from "../data/products.json";
import type { Product } from "../types/api";

export function ShopSection() {
  const navigate = useNavigate();
  const { data: products, isLoading, error } = useApiData<Product[]>(
    "/content/products?type=product",
    [],
    fallbackProducts as Product[],
  );
  const displayProducts = products.slice(0, 4);

  return (
    <section className="scroll-mt-40 bg-[#fbf6f3] py-16 sm:py-20" id="shop">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f39a3d]">
              Shop for Good
            </div>
            <h2 className="mb-4 text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
              Crafted by talented hands, <span className="text-[#ff3d39]">fueled by extraordinary spirits.</span>
            </h2>
            <p className="text-base leading-8 text-[#776a66]">
              At UDAI, our vocational unit "Ek Prayas" (An Effort) is where therapy meets creativity. We believe that every individual has a unique skill. Our young adults with special needs are trained to create high-quality, handcrafted products that promote self-reliance and dignity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/new-arrivals")}
            className="relative z-10 inline-flex cursor-pointer items-center gap-2 self-start rounded-full border border-[#ff6a58] px-6 py-3 text-sm font-semibold text-[#ff3d39] transition hover:bg-[#fff0ec] lg:self-center"
          >
            Shop New Arrivals
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {isLoading ? (
          <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
            Loading products...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {displayProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div className="relative mb-3 overflow-hidden rounded-[1.15rem] bg-[#f0ece7]">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.title}
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="text-xs font-medium text-[#4865a9]">{product.category}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#2b1b15]">{product.title}</h3>
                <div className="mt-2 text-sm font-medium text-[#4f4038]">₹{product.price.toFixed(2)}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
