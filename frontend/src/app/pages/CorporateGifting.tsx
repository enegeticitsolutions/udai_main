import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Gift, Check, Send } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { apiGet, apiPost, adminApiPost } from "../lib/api";
import fallbackProducts from "../data/products.json";
import type { Product } from "../types/api";

export function CorporateGifting() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // All fetched products are already gift products — no additional filtering needed
  const displayGifts = products;

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

  return (
    <div className="bg-[#f8f3ef]">
      {/* Premium Dark Slate Hero Banner */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 rounded-[1.5rem] bg-[#1a2d42] px-6 py-10 text-white shadow-[0_18px_36px_rgba(26,45,66,0.14)] sm:px-10">
            <div className="flex justify-between items-start mb-4">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd86b]">
                Corporate Gifting
              </div>
              <Link
                to="/new-arrivals"
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Back to Shop
              </Link>
            </div>
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Gifts that Empower, Connect, and Inspire.
              </h1>
              <p className="mt-4 text-sm leading-8 text-white/75 sm:text-lg">
                Delight your clients and partners with sustainable, socially conscious gift packs. Every item is handcrafted by the talented team at UDAI rehabilitation and training center, making your brand values shine.
              </p>
            </div>
          </div>

          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
            {/* Curated Products List */}
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-semibold text-[#2b1b15]">Curated Corporate Collection</h2>
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
                <div className="space-y-4">
                  {displayGifts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, selectedProduct: product.title }));
                        toast.info(`Selected "${product.title}" for your inquiry.`);
                      }}
                      className={`flex items-center gap-4 rounded-[1.2rem] bg-white p-4 cursor-pointer border-2 transition shadow-[0_12px_24px_rgba(48,32,22,0.05)] ${
                        formData.selectedProduct === product.title
                          ? "border-[#2f5597] ring-2 ring-[#2f5597]/25"
                          : "border-transparent hover:border-[#d9d2cb]"
                      }`}
                    >
                      <div className="size-20 shrink-0 overflow-hidden rounded-[0.9rem] bg-[#f0ece7]">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4865a9]">
                          {product.category}
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-[#2b1b15] truncate">
                          {product.title}
                        </h3>
                        <p className="text-sm text-[#776a66]">
                          Available for high-volume custom orders.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-[#2b1b15]">
                          ₹{product.price.toFixed(2)}
                        </div>
                        <span className="text-xs text-[#776a66]">Bulk rates available</span>
                      </div>
                    </div>
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
            <div className="rounded-[1.5rem] bg-[#fffdf8] p-4 shadow-[0_18px_40px_rgba(28,31,50,0.08)] lg:sticky lg:top-8">
              <div className="rounded-[1.2rem] bg-white p-6 sm:p-8">
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
                    <label className="block text-xs font-semibold text-[#776a66] mb-1">Special Requirements</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
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
