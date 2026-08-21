import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Gift, Check, Send, Plus, Search, ShoppingCart, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { apiGet, apiPost, adminApiPost } from "../lib/api";
import { addToCart, setCheckoutProduct } from "../lib/cart";
import { useAuth } from "../context/AuthContext";
import fallbackProducts from "../data/products.json";
import type { Product } from "../types/api";

function money(total: number) {
  return `₹${total.toFixed(2)}`;
}

export function CorporateGifting() {
  const navigate = useNavigate();
  const { cart, isAuthenticated, logout, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    quantity: "100",
    message: "",
    selectedProduct: "Customized T-Shirt",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        // Fetch ONLY corporate gift products
        const nextProducts = await apiGet<Product[]>("/content/products?type=gift");
        setProducts(nextProducts);
      } catch (err) {
        // Fallback: filter gift products from local data
        const fallback = (fallbackProducts as any[]).filter((p: any) => p.isCorporateGift === true);
        setProducts(fallback as Product[]);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const displayGifts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    });
  }, [products, searchQuery]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        message: `Corporate Gift Inquiry:\nCompany: ${formData.companyName}\nPhone: ${formData.phone}\nSelected Product: ${formData.selectedProduct}\nQuantity: ${formData.quantity}\n\nNotes:\n${formData.message}`,
        subject: `Corporate Gifting Inquiry - ${formData.companyName}`,
      };

      try {
        await apiPost("/forms/contact", payload);
      } catch (primaryError) {
        const message = primaryError instanceof Error ? primaryError.message : "";
        if (!/route not found|404/i.test(message)) {
          throw primaryError;
        }
        await adminApiPost("/contacts", payload);
      }

      setSubmitted(true);
      toast.success("Thank you! Your corporate gifting inquiry has been submitted.");
      setFormData({
        name: "",
        companyName: "",
        email: "",
        phone: "",
        quantity: "100",
        message: "",
        selectedProduct: displayGifts[0]?.title || "Customized T-Shirt",
      });
      window.setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  function handleAddToCart(product: Product) {
    addToCart(product);
    toast.success(`${product.title} added to cart.`);
  }

  function handleBuyNow(product: Product) {
    setCheckoutProduct(product);
    if (!isAuthenticated) {
      toast.error("Please sign in or sign up to purchase this gift.");
      navigate("/auth?redirect=/checkout");
      return;
    }

    navigate("/checkout");
  }

  return (
    <div className="overflow-x-hidden bg-[#f8f3ef]">
      <section className="border-b border-[#d9e2ec] bg-[#0f263d] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <div className="order-3 flex min-w-full overflow-hidden rounded-full border border-white/20 bg-white text-[#1f2937] shadow-sm sm:order-none sm:min-w-0 sm:flex-1">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search corporate gifts..."
              className="min-w-0 flex-1 px-5 py-3 text-sm outline-none"
            />
            <button
              type="button"
              className="flex w-16 items-center justify-center bg-[#f58220] text-white transition hover:bg-[#e26f12]"
              aria-label="Search corporate gifts"
            >
              <Search className="size-6" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs sm:text-sm">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-2 rounded-full px-2 py-1 text-left transition hover:bg-white/10"
              >
                <UserCircle className="size-7 text-white/90 sm:size-8" />
                <span className="hidden sm:block">
                  <span className="block text-white/75">My Account</span>
                  <span className="font-semibold">{user?.name ?? "Account"}</span>
                </span>
                <ChevronDown className="size-4" />
              </button>
            ) : (
              <Link
                to="/auth?mode=login"
                className="inline-flex rounded-full px-3 py-2 font-semibold transition hover:bg-white/10"
              >
                Sign In
              </Link>
            )}

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="relative flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10"
            >
              <ShoppingCart className="size-8" />
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
      </section>

      {/* Premium Dark Slate Hero Banner */}
      <section className="py-8 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-[1rem] bg-[#1a2d42] px-4 py-7 text-white shadow-[0_18px_36px_rgba(26,45,66,0.14)] sm:mb-12 sm:rounded-[1.5rem] sm:px-10 sm:py-10">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd86b]">
                Corporate Gifting
              </div>
              <Link
                to="/new-arrivals"
                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 sm:px-4 sm:text-sm"
              >
                Back to Shop
              </Link>
            </div>
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold tracking-tight min-[390px]:text-3xl sm:text-5xl">
                Gifts that Empower, Connect, and Inspire.
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:mt-4 sm:text-lg sm:leading-8">
                Delight your clients and partners with sustainable, socially conscious gift packs. Every item is handcrafted by the talented team at UDAI rehabilitation and training center, making your brand values shine.
              </p>
            </div>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
            {/* Curated Products List */}
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-[#2b1b15] sm:text-3xl">Curated Corporate Collection</h2>
                <p className="mt-2 text-sm text-[#776a66]">
                  Select from our top handcrafted items ready for branding & custom packaging.
                </p>
              </div>

              {isLoading ? (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
                  Loading collection...
                </div>
              ) : displayGifts.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center text-sm text-[#776a66]">
                  <p className="font-semibold text-[#2b1b15] mb-1">No corporate gift products yet.</p>
                  <p>Add gift products from the <strong>Admin Panel → Products → Gift</strong> tab.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {displayGifts.map((product) => (
                    <article
                      key={product.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, selectedProduct: product.title }));
                        toast.info(`Selected "${product.title}" for your inquiry.`);
                      }}
                      className={`flex min-h-[20rem] cursor-pointer flex-col rounded-[0.85rem] bg-white p-2.5 border-2 transition shadow-[0_12px_24px_rgba(48,32,22,0.06)] sm:min-h-[23rem] sm:rounded-[1rem] sm:p-3 ${
                        formData.selectedProduct === product.title
                          ? "border-[#2f5597] ring-2 ring-[#2f5597]/25"
                          : "border-transparent hover:border-[#d9d2cb]"
                      }`}
                    >
                      <div className="aspect-[4/3] overflow-hidden rounded-[0.8rem] bg-[#f0ece7]">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="mt-3 flex min-w-0 flex-1 flex-col sm:mt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4865a9]">
                          {product.category}
                        </div>
                        <h3 className="mt-1 line-clamp-2 min-h-11 text-base font-bold leading-5 text-[#2b1b15] sm:min-h-14 sm:text-xl sm:leading-7">
                          {product.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-[#776a66]">
                          {product.short_description || product.description || "Available for high-volume custom orders."}
                        </p>
                        <div className="mt-3 text-lg font-extrabold text-[#2b1b15] sm:mt-4 sm:text-xl">
                          {money(product.price)}
                        </div>
                        <span className="mt-1 text-xs text-[#776a66]">Bulk rates available</span>

                        <div className="mt-auto flex items-center gap-2 pt-4 sm:pt-5">
                          <button
                            type="button"
                            aria-label={`Add ${product.title} to cart`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddToCart(product);
                            }}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#2f5597] bg-white text-[#2f5597] transition hover:bg-[#f3f6ff]"
                          >
                            <Plus className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleBuyNow(product);
                            }}
                            className="min-w-0 flex-1 rounded-full bg-[#2f5597] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#24477f]"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Value Propositions */}
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Custom Branding", desc: "Add your logo & tags to items" },
                  { title: "Artisan Impact", desc: "100% of proceeds fund therapeutic care" },
                  { title: "Eco-Friendly", desc: "Handmade using organic, local materials" },
                  { title: "Hassle-Free Delivery", desc: "Bulk packaging and direct delivery" },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start bg-white/50 p-4 rounded-[1rem] border border-[#e8dfd8]">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                      <Check className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#2b1b15]">{item.title}</h4>
                      <p className="text-xs text-[#776a66] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inquiry Form */}
            <div className="rounded-[1rem] bg-[#fffdf8] p-3 shadow-[0_18px_40px_rgba(28,31,50,0.08)] sm:rounded-[1.5rem] sm:p-4 lg:sticky lg:top-8">
              <div className="rounded-[0.9rem] bg-white p-4 sm:rounded-[1.2rem] sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#ffd86b] text-[#1a2d42]">
                    <Gift className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1a2d42]">Corporate Gifting Inquiry</h2>
                    <p className="text-xs text-[#776a66]">Get a customized quote and sample package</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#776a66] mb-1">Your Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                        placeholder="Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#776a66] mb-1">Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                        placeholder="Company"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#776a66] mb-1">Work Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                        placeholder="Email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#776a66] mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                        placeholder="Phone"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#776a66] mb-1">Selected Product *</label>
                      <select
                        name="selectedProduct"
                        value={formData.selectedProduct}
                        onChange={handleChange}
                        className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597] bg-white"
                      >
                        {displayGifts.map((p) => (
                          <option key={p.id} value={p.title}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#776a66] mb-1">Est. Quantity *</label>
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#776a66] mb-1">Special Requirements *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full resize-none rounded-md border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                      placeholder="E.g., custom branding, branding tag, specific color requests..."
                    />
                  </div>

                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || submitted}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a2d42] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#253f5c] disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      "Submitting..."
                    ) : submitted ? (
                      <>Inquiry Sent ✓</>
                    ) : (
                      <>
                        Submit Inquiry <Send className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
