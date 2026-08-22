import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { apiGet, apiPost } from "../lib/api";
import { clearCart, clearCheckoutProduct, getCart, getCheckoutProduct } from "../lib/cart";
import { useAuth } from "../context/AuthContext";
import type { CartItem } from "../lib/cart";
import type { Order, Product } from "../types/api";

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      prefill?: {
        name?: string;
        email?: string;
        contact?: string;
      };
      theme?: {
        color?: string;
      };
      notes?: Record<string, string>;
      handler?: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => void;
      modal?: {
        ondismiss?: () => void;
        onDismiss?: () => void;
        escape?: boolean;
        animation?: boolean;
        handleback?: boolean;
        confirm_close?: boolean;
      };
    }) => {
      open: () => void;
      on?: (event: string, callback: (response: any) => void) => void;
    };
  }
}

type PaymentMethod = "razorpay_modal" | "qr";

type AddressForm = {
  country: string;
  fullName: string;
  email: string;
  mobile: string;
  pincode: string;
  house: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  instructions: string;
  defaultAddress: boolean;
};

const initialAddress: AddressForm = {
  country: "India",
  fullName: "",
  email: "",
  mobile: "",
  pincode: "",
  house: "",
  area: "",
  landmark: "",
  city: "",
  state: "",
  instructions: "",
  defaultAddress: false,
};

function money(total: number) {
  return `₹${total.toFixed(2)}`;
}

type RazorpayCreateResponse = {
  order: Order;
  razorpay: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
  };
};

type DynamicQrCodeData = {
  id: string;
  status: string;
  imageUrl: string;
  imageContent?: string;
  amount: number;
  currency: string;
  localOrderId: string;
  orderNumber: string;
  isFallback?: boolean;
};

type RazorpayVerificationResponse = Order;

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window !== "undefined" && typeof window.Razorpay !== "undefined") {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function Checkout() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay_modal");
  const [address, setAddress] = useState<AddressForm>(initialAddress);
  const [submitting, setSubmitting] = useState(false);
  const [dynamicQr, setDynamicQr] = useState<DynamicQrCodeData | null>(null);
  const [qrStatusText, setQrStatusText] = useState<string>("");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopQrPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopQrPolling();
    };
  }, [stopQrPolling]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please sign in to continue to checkout");
      navigate("/auth?redirect=/checkout");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setAddress((current) => ({
        ...current,
        fullName: current.fullName || user.name || "",
        email: current.email || user.email || "",
        mobile: current.mobile || user.phone || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const selectedProduct = getCheckoutProduct();
    const nextCart = getCart();
    setCheckoutProduct(selectedProduct);
    setCartItems(nextCart);
  }, []);

  const orderItems = useMemo(() => {
    if (checkoutProduct) {
      return [{ product: checkoutProduct, quantity: 1 }];
    }
    return cartItems;
  }, [checkoutProduct, cartItems]);

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shipping = subtotal > 0 ? 0 : 0;
  const total = subtotal + shipping;

  function updateField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setAddress((current) => ({ ...current, [key]: value }));
  }



  async function handlePayNow(event: React.FormEvent) {
    event.preventDefault();

    if (
      !address.fullName ||
      !address.mobile ||
      !address.pincode ||
      !address.house ||
      !address.area ||
      !address.city ||
      !address.state
    ) {
      toast.error("Please fill all required delivery address fields.");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    try {
      const cleanPhone = address.mobile.replace(/\D/g, "").slice(-10);
      const itemsSummary = orderItems.map((item) => `${item.product.title} (x${item.quantity})`).join(", ");

      const payload = {
        amount: total,
        customerName: address.fullName.trim(),
        customerEmail: address.email.trim() || undefined,
        customerPhone: cleanPhone,
        purpose: `Shop Order: ${itemsSummary}`,
        donationCategory: "shop",
        callbackUrl: `${window.location.origin}/donation-success`,
        shippingAddress: {
          ...address,
          email: address.email.trim() || undefined,
        },
        items: orderItems.map((item) => ({
          productId: item.product.id,
          title: item.product.title,
          price: item.product.price,
          quantity: item.quantity,
          image: item.product.image,
          category: item.product.category,
        })),
        subtotal,
        shippingAmount: shipping,
      };

      const res = await apiPost<any>("/payments/razorpay/create-payment-link", payload);
      const linkUrl = res?.short_url || res?.paymentLinkUrl || res?.data?.short_url;

      if (!linkUrl) {
        throw new Error(res?.message || "Failed to create Razorpay Payment Link.");
      }

      clearCheckoutProduct();
      clearCart();

      // Redirect user to Razorpay Hosted Payment Link page (supports UPI, QR, Cards, NetBanking, Wallets)
      window.location.href = linkUrl;
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Unable to initiate payment.";
      toast.error(message);
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[#776a66]">Please wait...</p>
      </div>
    );
  }

  if (orderItems.length === 0) {
    return (
      <div className="bg-[#f8f3ef] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-semibold text-[#2b1b15]">Checkout</h1>
          <p className="mt-4 text-[#776a66]">
            Your cart is empty. Please add a product first.
          </p>
          <Button className="mt-8 rounded-full bg-[#2f5597] px-6" onClick={() => navigate("/products")}>
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f3ef]">
      <section className="py-4 sm:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mb-4 sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[#2b1b15] sm:text-4xl">Checkout</h1>
            <p className="mt-1 text-sm text-[#776a66] sm:mt-2">Add delivery details and proceed to secure payment.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <form onSubmit={handlePayNow} className="order-1 space-y-4 sm:space-y-8">
              <div className="rounded-[0.9rem] bg-white p-3 shadow-[0_10px_22px_rgba(48,32,22,0.07)] sm:rounded-[1.4rem] sm:p-8">
                <h2 className="text-lg font-semibold text-[#2b1b15] sm:text-2xl">Delivery address</h2>
                <p className="mt-1 text-sm text-[#776a66] sm:mt-2">Use an address where you can receive your order.</p>

                <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Country / Region</label>
                    <select
                      value={address.country}
                      onChange={(event) => updateField("country", event.target.value)}
                      className="w-full rounded-xl border border-[#d8d0c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#2f5597]"
                    >
                      <option value="India">India</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Full name</label>
                      <Input value={address.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Enter full name" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Email address</label>
                      <Input value={address.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Enter email address" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Mobile number</label>
                      <Input value={address.mobile} onChange={(e) => updateField("mobile", e.target.value)} placeholder="Enter mobile number" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Pincode</label>
                      <Input value={address.pincode} onChange={(e) => updateField("pincode", e.target.value)} placeholder="6 digits PIN code" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Flat, House no., Building, Company, Apartment</label>
                    <Input value={address.house} onChange={(e) => updateField("house", e.target.value)} placeholder="Enter address line 1" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Area, Street, Sector, Village</label>
                    <Input value={address.area} onChange={(e) => updateField("area", e.target.value)} placeholder="Enter address line 2" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Landmark</label>
                    <Input value={address.landmark} onChange={(e) => updateField("landmark", e.target.value)} placeholder="E.g. near Apollo hospital" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Town / City</label>
                      <Input value={address.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Enter city" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">State</label>
                      <Input value={address.state} onChange={(e) => updateField("state", e.target.value)} placeholder="Enter state" />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 text-sm text-[#2b1b15]">
                    <input
                      type="checkbox"
                      checked={address.defaultAddress}
                      onChange={(e) => updateField("defaultAddress", e.target.checked)}
                      className="size-4 rounded border-[#c7beb6]"
                    />
                    Make this my default address
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Delivery instructions (optional)</label>
                    <Textarea
                      value={address.instructions}
                      onChange={(e) => updateField("instructions", e.target.value)}
                      placeholder="Add preferences, notes, or access details"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[0.9rem] bg-white p-3 shadow-[0_10px_22px_rgba(48,32,22,0.07)] sm:rounded-[1.4rem] sm:p-8">
                <h2 className="text-lg font-semibold text-[#2b1b15] sm:text-2xl">Payment Method</h2>
                <p className="mt-1 text-sm text-[#776a66] sm:mt-2">
                  Choose your preferred payment method below.
                </p>

                <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4">
                  <label className={`cursor-pointer rounded-xl border p-3 sm:rounded-2xl sm:p-4 ${paymentMethod === "razorpay_modal" ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#ddd8d1] bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "razorpay_modal"}
                        onChange={() => {
                          setPaymentMethod("razorpay_modal");
                          stopQrPolling();
                          setDynamicQr(null);
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#2b1b15]">Standard Razorpay Checkout</div>
                        <div className="text-sm text-[#776a66]">Pay securely via Razorpay popup (Cards, NetBanking, UPI, Wallets).</div>
                      </div>
                    </div>
                  </label>

                  <label className={`cursor-pointer rounded-xl border p-3 sm:rounded-2xl sm:p-4 ${paymentMethod === "qr" ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#ddd8d1] bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "qr"}
                        onChange={() => {
                          setPaymentMethod("qr");
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#2b1b15]">Dynamic UPI QR Code</div>
                        <div className="text-sm text-[#776a66]">Generate a dynamic transaction QR code and scan from any UPI app.</div>
                      </div>
                    </div>
                    {paymentMethod === "qr" ? (
                      <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-center shadow-sm border border-[#ddd8d1]">
                        {dynamicQr ? (
                          <div className="mx-auto flex flex-col items-center w-full">
                            <img
                              src={dynamicQr.imageUrl}
                              alt="Razorpay QR Code"
                              className="mx-auto h-auto max-h-[340px] w-full max-w-[280px] rounded-2xl object-contain shadow-md"
                            />
                            <p className="mt-3 text-sm font-semibold text-[#2b1b15]">
                              Scan to pay {money(dynamicQr.amount / 100)}
                            </p>
                            <p className="mt-1 text-xs font-medium text-[#2f5597] animate-pulse">
                              {qrStatusText || "Polling payment status..."}
                            </p>
                            {dynamicQr.imageContent ? (
                              <div className="mt-3">
                                <a
                                  href={dynamicQr.imageContent}
                                  className="inline-flex rounded-full bg-[#f0f4ff] px-4 py-2 text-sm font-semibold text-[#2f5597] shadow-sm hover:bg-[#e2ebff]"
                                >
                                  Open UPI Link
                                </a>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-[#776a66]">
                            Fill delivery details and click &quot;Generate QR Code&quot; below.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full rounded-full bg-[#2f5597] py-5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,85,151,0.22)] hover:bg-[#264882] sm:mt-6 sm:py-6 sm:text-base"
                >
                  {submitting
                    ? "Processing..."
                    : paymentMethod === "qr"
                      ? dynamicQr
                        ? "Regenerate QR Code"
                        : `Generate QR Code ${money(total)}`
                      : `Pay Now ${money(total)}`}
                </Button>
              </div>
            </form>

            <aside className="order-2 space-y-4 lg:space-y-6">
              <div className="rounded-[0.9rem] bg-white p-3 shadow-[0_10px_22px_rgba(48,32,22,0.07)] sm:rounded-[1.4rem] sm:p-8">
                <h2 className="text-lg font-semibold text-[#2b1b15] sm:text-2xl">Order Summary</h2>
                <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.product.id} className="flex min-w-0 gap-3 border-b border-[#eee7e1] pb-3 last:border-b-0 last:pb-0 sm:gap-4 sm:pb-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f0ece7] sm:h-20 sm:w-20">
                        <img src={item.product.image} alt={item.product.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold leading-5 text-[#2b1b15] sm:text-base">{item.product.title}</div>
                        <div className="text-sm text-[#776a66]">Qty: {item.quantity}</div>
                        <div className="mt-1 font-medium text-[#4f4038]">{money(item.product.price * item.quantity)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-[#eee7e1] pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#776a66]">Subtotal</span>
                    <span className="font-medium text-[#2b1b15]">{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#776a66]">Shipping</span>
                    <span className="font-medium text-[#2b1b15]">{shipping === 0 ? "Free" : money(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="font-semibold text-[#2b1b15]">Total</span>
                    <span className="font-semibold text-[#2b1b15]">{money(total)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[0.9rem] bg-[#20325c] p-4 text-white shadow-[0_10px_22px_rgba(48,32,22,0.07)] sm:rounded-[1.4rem] sm:p-8">
                <h3 className="text-lg font-semibold sm:text-2xl">Existing User?</h3>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  You can use the saved delivery details on this device and proceed directly to payment.
                </p>
                <button
                  type="button"
                  onClick={() => toast.info("Saved details will be used if available on this device.")}
                  className="mt-5 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Use Saved Details
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
