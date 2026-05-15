import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { apiPost } from "../lib/api";
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
      prefill: {
        name: string;
        email: string;
        contact: string;
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
      };
    }) => {
      open: () => void;
    };
  }
}

type PaymentMethod = "qr" | "upi" | "card" | "netbanking";

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

type RazorpayVerificationResponse = Order;

type RazorpayQrCreateResponse = {
  order: Order;
  qrCode: {
    id: string;
    status: string;
    imageUrl: string;
    imageContent?: string;
    amount: number;
    currency: string;
    isFallback?: boolean;
  };
};

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [address, setAddress] = useState<AddressForm>(initialAddress);
  const [submitting, setSubmitting] = useState(false);
  const [qrPayment, setQrPayment] = useState<RazorpayQrCreateResponse | null>(null);

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
      toast.error("Please fill the delivery address fields.");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerName: address.fullName.trim(),
        customerEmail: address.email.trim() || undefined,
        customerPhone: address.mobile.trim(),
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
        totalAmount: total,
        currency: "INR",
        paymentMethod,
        paymentStatus: "initiated",
        orderStatus: "new",
        notes: address.instructions.trim(),
      };

      if (paymentMethod === "qr") {
        const qrCheckout = await apiPost<RazorpayQrCreateResponse>("/payments/razorpay/qr-code", payload);
        setQrPayment(qrCheckout);
        toast.success(`QR code generated for order ${qrCheckout.order.orderNumber ?? qrCheckout.order.id}.`);
        return;
      }

      setQrPayment(null);
      const checkout = await apiPost<RazorpayCreateResponse>("/payments/razorpay/order", payload);
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay checkout.");
      }

      await new Promise<void>((resolve, reject) => {
        const instance = new (window as any).Razorpay({
          key: checkout.razorpay.keyId,
          amount: checkout.razorpay.amount,
          currency: checkout.razorpay.currency,
          name: checkout.razorpay.name,
          description: checkout.razorpay.description,
          order_id: checkout.razorpay.orderId,
          prefill: checkout.razorpay.prefill,
          theme: {
            color: "#2f5597",
          },
          notes: {
            localOrderId: checkout.order.id,
            paymentMethod,
          },
          handler: async (response: any) => {
            try {
              const verified = await apiPost<RazorpayVerificationResponse>("/payments/razorpay/verify", {
                localOrderId: checkout.order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentMethod,
              });

              clearCheckoutProduct();
              clearCart();
              toast.success(`Payment verified successfully. Order ${verified.orderNumber ?? verified.id} is confirmed.`);
              navigate("/products");
              resolve();
            } catch (verificationError) {
              reject(verificationError instanceof Error ? verificationError : new Error("Payment verification failed."));
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment window closed before completion."));
            },
          },
        });

        instance.open();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start Razorpay checkout.";
      if (message === "Payment window closed before completion.") {
        toast.info(message);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
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
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <form onSubmit={handlePayNow} className="space-y-8">
            <div className="rounded-[1.4rem] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:p-8">
              <h2 className="text-2xl font-semibold text-[#2b1b15]">Enter a new delivery address</h2>
              <p className="mt-2 text-sm text-[#776a66]">Use a delivery address where you can receive your order.</p>

              <div className="mt-6 grid gap-4">
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

            <div className="rounded-[1.4rem] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:p-8">
              <h2 className="text-2xl font-semibold text-[#2b1b15]">Payment Method</h2>
              <p className="mt-2 text-sm text-[#776a66]">
                This checkout now opens Razorpay test checkout for the selected payment method.
              </p>

              <div className="mt-6 grid gap-4">
                <label className={`cursor-pointer rounded-2xl border p-4 ${paymentMethod === "qr" ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#ddd8d1] bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "qr"}
                      onChange={() => {
                        setPaymentMethod("qr");
                        setQrPayment(null);
                      }}
                    />
                    <div>
                      <div className="font-semibold text-[#2b1b15]">QR Code</div>
                      <div className="text-sm text-[#776a66]">Scan the QR code to complete payment.</div>
                    </div>
                  </div>
                  {paymentMethod === "qr" ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-[#cfd8f6] bg-[#f7f9ff] p-5 text-center">
                      {qrPayment ? (
                        <>
                          <img
                            src={qrPayment.qrCode.imageUrl}
                            alt="Razorpay payment QR code"
                            className="mx-auto h-44 w-44 rounded-2xl border border-[#d8e0fb] bg-white object-contain p-2"
                          />
                          <p className="mt-3 text-sm text-[#776a66]">
                            Test QR generated for {money(qrPayment.qrCode.amount / 100)}. Scan it from a UPI app.
                          </p>
                          {qrPayment.qrCode.isFallback ? (
                            <p className="mt-2 text-xs text-[#9a6a12]">
                              Razorpay QR API is unavailable for this test account, so this is a local test QR.
                            </p>
                          ) : null}
                          {qrPayment.qrCode.imageContent ? (
                            <a
                              href={qrPayment.qrCode.imageContent}
                              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2f5597] shadow-sm"
                            >
                              Open UPI Link
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-[#776a66]">
                          Click Pay Now to generate a Razorpay test QR code for this order.
                        </p>
                      )}
                    </div>
                  ) : null}
                </label>

                <label className={`cursor-pointer rounded-2xl border p-4 ${paymentMethod === "card" ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#ddd8d1] bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "card"}
                      onChange={() => {
                        setPaymentMethod("card");
                        setQrPayment(null);
                      }}
                    />
                    <div>
                      <div className="font-semibold text-[#2b1b15]">Credit Card / Debit Card</div>
                      <div className="text-sm text-[#776a66]">Pay securely with your card.</div>
                    </div>
                  </div>
                </label>

                <label className={`cursor-pointer rounded-2xl border p-4 ${paymentMethod === "upi" ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#ddd8d1] bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "upi"}
                      onChange={() => {
                        setPaymentMethod("upi");
                        setQrPayment(null);
                      }}
                    />
                    <div>
                      <div className="font-semibold text-[#2b1b15]">Pay with UPI</div>
                      <div className="text-sm text-[#776a66]">Enter your UPI ID to complete payment.</div>
                    </div>
                  </div>
                  {paymentMethod === "upi" ? (
                    <div className="mt-4">
                      <Input placeholder="example@upi" />
                    </div>
                  ) : null}
                </label>

                <label className={`cursor-pointer rounded-2xl border p-4 ${paymentMethod === "netbanking" ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#ddd8d1] bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "netbanking"}
                      onChange={() => {
                        setPaymentMethod("netbanking");
                        setQrPayment(null);
                      }}
                    />
                    <div>
                      <div className="font-semibold text-[#2b1b15]">Net Banking</div>
                      <div className="text-sm text-[#776a66]">Choose your bank and continue to pay.</div>
                    </div>
                  </div>
                  {paymentMethod === "netbanking" ? (
                    <div className="mt-4">
                      <select className="w-full rounded-xl border border-[#d8d0c8] bg-white px-4 py-3 text-sm outline-none">
                        <option value="">Select bank</option>
                        <option>State Bank of India</option>
                        <option>HDFC Bank</option>
                        <option>ICICI Bank</option>
                        <option>Axis Bank</option>
                      </select>
                    </div>
                  ) : null}
                </label>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-full bg-[#2f5597] py-6 text-base font-semibold text-white shadow-[0_10px_20px_rgba(47,85,151,0.22)] hover:bg-[#264882]"
              >
                {submitting ? "Processing..." : paymentMethod === "qr" && !qrPayment ? "Generate QR" : "Pay Now"}
              </Button>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="rounded-[1.4rem] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:p-8">
              <h2 className="text-2xl font-semibold text-[#2b1b15]">Order Summary</h2>
              <div className="mt-6 space-y-4">
                {orderItems.map((item) => (
                  <div key={item.product.id} className="flex gap-4 border-b border-[#eee7e1] pb-4 last:border-b-0 last:pb-0">
                    <div className="h-20 w-20 overflow-hidden rounded-xl bg-[#f0ece7]">
                      <img src={item.product.image} alt={item.product.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[#2b1b15]">{item.product.title}</div>
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

            <div className="rounded-[1.4rem] bg-[#20325c] p-6 text-white shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:p-8">
              <h3 className="text-2xl font-semibold">Existing User?</h3>
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
      </section>
    </div>
  );
}
