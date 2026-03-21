import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import productsData from "../data/products.json";

export function ShopSection() {
  // Show first 6 products
  const displayProducts = productsData.slice(0, 6);

  return (
    <section className="py-16 sm:py-24 bg-gray-50" id="shop">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-gray-900">Our Shop</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Quality educational tools and therapeutic resources for children with special needs
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {displayProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
            >
              <div className="relative h-64 overflow-hidden bg-gray-100">
                <ImageWithFallback
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {!product.inStock && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
                    Out of Stock
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="text-sm text-gray-500 mb-1">{product.category}</div>
                <h3 className="text-lg mb-3 text-gray-900">{product.title}</h3>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl text-blue-600">${product.price.toFixed(2)}</span>
                </div>
                <button
                  disabled={!product.inStock}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  <ShoppingCart className="size-4" />
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
                </button>
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
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 font-medium shadow-lg group">
            View All Products
            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
