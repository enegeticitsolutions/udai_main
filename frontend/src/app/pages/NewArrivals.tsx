import { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { apiGet } from "../lib/api";
import { addToCart, setCheckoutProduct } from "../lib/cart";
import { useAuth } from "../context/AuthContext";
import fallbackProducts from "../data/products.json";
import type { Product } from "../types/api";

export function NewArrivals() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const nextProducts = await apiGet<Product[]>("/content/products");
        setProducts(nextProducts);
        setError(null);
      } catch (err) {
        setProducts(fallbackProducts as Product[]);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categories = ["All Categories", ...Array.from(new Set(products.map((product) => product.category)))];
  const filteredProducts =
    selectedCategory === "All Categories"
      ? products
      : products.filter((product) => product.category === selectedCategory);
  const newArrivals = products.slice(0, 3);

  return (
    <div className="bg-[#f8f3ef]">
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 rounded-[1.5rem] bg-[#2b1b15] px-6 py-8 text-white shadow-[0_18px_36px_rgba(43,27,21,0.14)] sm:px-8">
            <div className="flex justify-between items-start mb-3">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd86b]">
                New Arrivals
              </div>
              <div className="flex gap-3">
                {!isAuthenticated ? (
                  <>
                    <Link to="/auth?mode=login" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Sign In</Link>
                    <Link to="/auth?mode=signup" className="rounded-full bg-[#ef3c32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#da2f26]">Sign Up</Link>
                  </>
                ) : (
                  <>
                    <Link to="/account/orders" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">My Orders</Link>
                    <button onClick={() => logout()} className="rounded-full bg-[#ef3c32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#da2f26]">Logout</button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Fresh products created by our UDAI craft team.
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/75 sm:text-base">
                  Discover a small selection of the latest handcrafted items available in our shop.
                </p>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center justify-center rounded-full bg-[#ffd86b] px-5 py-3 text-sm font-semibold text-[#2b1b15] transition hover:bg-[#ffcf4a]"
              >
                Shop New Arrivals
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {newArrivals.map((product) => (
                <div
                  key={`arrival-${product.id}`}
                  className="flex items-center gap-4 rounded-[1rem] bg-white/8 p-3 ring-1 ring-white/10"
                >
                  <div className="size-20 shrink-0 overflow-hidden rounded-[0.9rem] bg-white/10">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ffd86b]">
                      {product.category}
                    </div>
                    <h2 className="mt-1 truncate text-lg font-semibold text-white">
                      {product.title}
                    </h2>
                    <div className="mt-1 text-sm text-white/75">
                      ₹{product.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="collection" className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-[#2b1b15]">Shop Collection</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2f5597] shadow-sm">
                {filteredProducts.length} items
              </div>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="h-10 appearance-none rounded-full border border-[#d9d2cb] bg-white px-4 pr-10 text-sm font-medium text-[#4f4038] shadow-sm outline-none transition focus:border-[#2f5597]"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b6e68]" />
              </div>
            </div>
          </div>

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
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex h-full flex-col rounded-[1.2rem] bg-white p-4 shadow-[0_12px_24px_rgba(48,32,22,0.07)]"
                >
                  <div className="mb-4 aspect-[4/3] overflow-hidden rounded-[1rem] bg-[#f0ece7]">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4865a9]">
                    {product.category}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-[#2b1b15]">
                    {product.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#776a66]">
                    Handcrafted product from the UDAI collection.
                  </p>
                  <div className="mt-3 text-xl font-medium text-[#4f4038]">
                    ₹{product.price.toFixed(2)}
                  </div>
                  <div className="mt-auto pt-5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Add ${product.title} to cart`}
                        onClick={() => {
                          addToCart(product);
                          toast.success(`${product.title} added to cart.`);
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2f5597] bg-white text-[#2f5597] transition hover:bg-[#f3f6ff]"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutProduct(product);
                          if (!isAuthenticated) {
                            toast.error("Please sign in or sign up to purchase products.");
                            navigate("/auth?redirect=/checkout");
                          } else {
                            navigate("/checkout");
                          }
                        }}
                        className="flex-1 rounded-full bg-[#2f5597] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,85,151,0.22)] transition hover:bg-[#264882]"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
