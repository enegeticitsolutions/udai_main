import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Clock,
  Menu,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Tag,
  UserCircle,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { apiGet } from "../lib/api";
import { addToCart, setCheckoutProduct } from "../lib/cart";
import { useAuth } from "../context/AuthContext";
import fallbackProducts from "../data/products.json";
import type { Product } from "../types/api";

const departments = [
  "All Departments",
  "Corporate Gifts",
  "New Arrivals",
  "Home Decor",
  "Accessories",
  "Fashion",
  "Art",
  "Sensory",
  "Toys",
  "Offers",
];

const heroImage =
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1800&q=80";

function money(total: number) {
  return `₹${total.toFixed(2)}`;
}

function getProductImage(product: Product) {
  return product.image || product.gallery?.[0] || "/images/logo_udai.png";
}

function getSavings(product: Product) {
  const originalPrice = product.originalPrice ?? Math.round(product.price * 1.5);
  const savings = Math.max(originalPrice - product.price, 0);
  const percent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
  return {
    originalPrice,
    savings,
    percent,
  };
}

export function NewArrivals() {
  const navigate = useNavigate();
  const { cart, isAuthenticated, logout, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("View All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"featured" | "price-low" | "price-high">("featured");
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const nextProducts = await apiGet<Product[]>("/content/products?type=product");
        setProducts(nextProducts);
        setError(null);
      } catch {
        setProducts(fallbackProducts as Product[]);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedImage(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const categories = ["View All", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))];

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = selectedCategory === "View All" || product.category === selectedCategory;
      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "price-low") return a.price - b.price;
      if (sortMode === "price-high") return b.price - a.price;
      return 0;
    });
  }, [products, searchQuery, selectedCategory, sortMode]);

  const visibleProducts = filteredProducts;
  const bestSellers = products.slice(0, 4);
  const dealProducts = products.slice(2, 4);

  function handleAddToCart(product: Product) {
    addToCart(product);
    toast.success(`${product.title} added to cart.`);
  }

  function handleBuyNow(product: Product) {
    setCheckoutProduct(product);
    if (!isAuthenticated) {
      toast.error("Please sign in or sign up to purchase products.");
      navigate("/auth?redirect=/checkout");
      return;
    }

    navigate("/checkout");
  }

  return (
    <div className="overflow-x-hidden bg-[#f4f1ec] text-[#111827]">
      <section className="border-b border-[#d9e2ec] bg-[#0f263d] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <div className="order-3 flex min-w-full overflow-hidden rounded-full border border-white/20 bg-white text-[#1f2937] shadow-sm sm:order-none sm:min-w-0 sm:flex-1">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search for products, brands and more..."
              className="min-w-0 flex-1 px-5 py-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => undefined}
              className="flex w-16 items-center justify-center bg-[#f58220] text-white transition hover:bg-[#e26f12]"
              aria-label="Search products"
            >
              <Search className="h-6 w-6" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs sm:text-sm">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => logout()}
              className="flex items-center gap-2 rounded-full px-2 py-1 text-left transition hover:bg-white/10"
              >
                <UserCircle className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />
                <span className="hidden sm:block">
                  <span className="block text-white/75">My Account</span>
                  <span className="font-semibold">{user?.name ?? "Account"}</span>
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/auth?mode=login"
              className="inline-flex rounded-full px-2.5 py-2 font-semibold transition hover:bg-white/10 sm:px-3"
              >
                Sign In
              </Link>
            )}

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="relative flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10"
            >
              <ShoppingCart className="h-8 w-8" />
              {cartQuantity > 0 ? (
                <span className="absolute -top-1 left-6 rounded-full bg-[#f7c948] px-1.5 text-[11px] font-bold text-[#0f263d]">
                  {cartQuantity}
                </span>
              ) : null}
              <span className="hidden text-left font-semibold sm:block">
                Cart
                <span className="block text-white/75">{money(cartTotal)}</span>
              </span>
            </button>

            <Link to="/account/orders" className="hidden font-semibold leading-tight transition hover:text-[#f7c948] md:block">
              Returns
              <span className="block">& Orders</span>
            </Link>
          </div>
        </div>

        <nav className="border-t border-white/10 bg-[#173552]">
          <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-3 py-2 text-sm font-medium sm:px-6 lg:px-8">
            {departments.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item === "All Departments") setSelectedCategory("View All");
                  if (categories.includes(item)) setSelectedCategory(item);
                }}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-white/90 transition hover:text-white"
              >
                {index === 0 ? <Menu className="h-5 w-5" /> : null}
                {item}
              </button>
            ))}
          </div>
        </nav>
      </section>

      <section
        className="relative min-h-[17rem] overflow-hidden bg-cover bg-center sm:min-h-[22rem]"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 58%, rgba(255,255,255,0.22) 100%), url(${heroImage})` }}
      >
        <div className="mx-auto flex min-h-[17rem] max-w-7xl items-center px-4 py-7 sm:min-h-[22rem] sm:px-8 sm:py-10">
          <div className="max-w-2xl">
            <h1 className="font-serif text-2xl font-black uppercase leading-tight tracking-tight text-black min-[390px]:text-3xl sm:text-5xl lg:text-6xl">
              Premium Handcrafted Gifting Solutions
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black sm:mt-5 sm:text-lg sm:leading-7">
              Sustainable, handcrafted gift packs for your clients and partners with care by the UDAI team.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5 sm:gap-4">
              <button
                type="button"
                onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="font-semibold text-black underline underline-offset-4"
              >
                Discover Our Collections
              </button>
              <Link
                to="/corporate-gifting"
                className="rounded-full bg-[#f7c948] px-4 py-2.5 text-xs font-bold text-[#1f2937] shadow-sm transition hover:bg-[#f4b400] sm:px-6 sm:py-3 sm:text-sm"
              >
                Explore Corporate Gifts
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="collection" className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h2 className="text-2xl font-extrabold tracking-tight text-black sm:text-4xl">New Arrivals</h2>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <div className="min-w-0 rounded-full bg-[#e8dfc8] px-4 py-2 text-center text-sm font-bold text-[#2b1b15] sm:px-5 sm:text-xl">
                Trending Now
              </div>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
                className="h-10 rounded-full border border-[#d8d0c8] bg-white px-3 text-sm font-semibold outline-none"
              >
                <option value="featured">Sort</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="mb-6 flex gap-3 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
                  selectedCategory === category
                    ? "bg-[#858b91] text-white"
                    : "bg-[#e5e5e5] text-black hover:bg-[#d7d7d7]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-dashed border-[#d7cfc8] bg-white p-10 text-center text-sm text-[#776a66]">
              Loading products...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#f1c8bc] bg-[#fff4f1] p-6 text-center text-sm text-[#b04d2f]">
              {error}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
                  {visibleProducts.map((product, index) => {
                    const savings = getSavings(product);
                    return (
                      <article
                        key={product.id}
                        className="flex min-h-[17.5rem] flex-col rounded-[0.75rem] border border-[#e4e7eb] bg-white p-2 shadow-[0_8px_18px_rgba(15,38,61,0.12)] sm:min-h-[21rem] sm:p-3"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedImage({ src: getProductImage(product), alt: product.title })}
                          className="aspect-[4/3] overflow-hidden rounded-[0.55rem] bg-[#eef2f6] text-left"
                        >
                          <ImageWithFallback
                            src={getProductImage(product)}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#64748b] sm:mt-3 sm:text-[10px] sm:tracking-[0.18em]">
                          {product.category}
                        </div>
                        <h3 className="mt-1 line-clamp-2 min-h-9 text-sm font-extrabold leading-[1.15rem] text-[#171717] sm:min-h-12 sm:text-lg sm:leading-6">
                          {product.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
                          <span className="flex text-[#f2b01e]">
                            {Array.from({ length: 5 }).map((_, starIndex) => (
                              <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                            ))}
                          </span>
                          <span>4.5 | {index % 2 === 0 ? "120" : "80"} Ratings</span>
                        </div>
                        <div className="mt-2 text-base font-extrabold text-black sm:mt-3 sm:text-xl">{money(product.price)}</div>
                        <div className="text-[11px] text-[#4b5563] sm:text-sm">
                          MRP <span className="line-through">{money(savings.originalPrice)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#238636] sm:text-sm">
                          <Tag className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
                          Save {money(savings.savings)} ({savings.percent}% off)
                        </div>
                        <div className="mt-auto flex items-center gap-1.5 pt-3 sm:gap-2 sm:pt-4">
                          <button
                            type="button"
                            aria-label={`Add ${product.title} to cart`}
                            onClick={() => handleAddToCart(product)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2f5597] bg-white text-[#2f5597] transition hover:bg-[#f3f6ff] sm:h-11 sm:w-11"
                          >
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBuyNow(product)}
                            className="min-w-0 flex-1 rounded-full bg-[#2f62b3] px-2 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#234f95] sm:px-4 sm:py-3 sm:text-sm"
                          >
                            Buy Now
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-[#e4e7eb] bg-white p-4 shadow-[0_8px_18px_rgba(15,38,61,0.12)]">
                  <h3 className="text-xl font-extrabold text-black">Best Sellers & Top Picks</h3>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <span className="flex text-[#f2b01e]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ))}
                    </span>
                    <span>4.5 | 120 reviews</span>
                  </div>
                  <div className="mt-4 space-y-4">
                    {bestSellers.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleBuyNow(product)}
                        className="grid w-full grid-cols-[4.2rem_1fr_auto] gap-3 text-left"
                      >
                        <div
                          className="h-16 overflow-hidden rounded-lg bg-[#eef2f6]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedImage({ src: getProductImage(product), alt: product.title });
                          }}
                        >
                          <ImageWithFallback src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-[#1f2937]">{product.title}</p>
                          <p className="text-xs text-[#64748b]">{product.category}</p>
                        </div>
                        <span className="text-sm font-bold text-black">{money(product.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e4e7eb] bg-white p-4 shadow-[0_8px_18px_rgba(15,38,61,0.12)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-extrabold text-black">Deals of the Day</h3>
                    <Clock className="h-5 w-5 text-[#f58220]" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {dealProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="grid w-full grid-cols-[4rem_1fr_auto] gap-3 text-left"
                      >
                        <div
                          className="h-16 overflow-hidden rounded-lg bg-[#eef2f6]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedImage({ src: getProductImage(product), alt: product.title });
                          }}
                        >
                          <ImageWithFallback src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="line-clamp-2 text-sm font-semibold text-[#1f2937]">{product.title}</p>
                          <p className="text-xs text-[#238636]">Bank Offers</p>
                        </div>
                        <span className="text-sm font-bold text-black">{money(product.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {selectedImage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4">
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="max-h-[92vh] max-w-[96vw] rounded-lg object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          />
        </div>
      ) : null}
    </div>
  );
}
