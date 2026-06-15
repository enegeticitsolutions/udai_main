import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { clearCheckoutProduct, getCart, saveCart, type CartItem } from "../lib/cart";
import { useAuth } from "../context/AuthContext";

function money(total: number) {
  return `₹${total.toFixed(2)}`;
}

export function Cart() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());

    function handleCartChanged() {
      setItems(getCart());
    }

    window.addEventListener("udai-cart-changed", handleCartChanged);
    return () => window.removeEventListener("udai-cart-changed", handleCartChanged);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  function persistCart(nextItems: CartItem[]) {
    setItems(nextItems);
    saveCart(nextItems);
  }

  function updateQuantity(productId: string | number, quantity: number) {
    const nextQuantity = Math.max(1, Math.min(quantity, 99));
    persistCart(
      items.map((item) =>
        String(item.product.id) === String(productId)
          ? { ...item, quantity: nextQuantity }
          : item,
      ),
    );
  }

  function removeItem(productId: string | number) {
    persistCart(items.filter((item) => String(item.product.id) !== String(productId)));
    toast.success("Product removed from cart.");
  }

  function handleProceed() {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    clearCheckoutProduct();
    if (!isAuthenticated) {
      toast.error("Please sign in or sign up to continue to checkout.");
      navigate("/auth?redirect=/checkout");
      return;
    }

    navigate("/checkout");
  }

  return (
    <div className="bg-[#f8f3ef]">
      <section className="py-8 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2f5597] shadow-sm">
                <ShoppingCart className="h-4 w-4" />
                Cart
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b1b15] sm:mt-4 sm:text-4xl">Your cart</h1>
            </div>
            <Button
              type="button"
              onClick={() => navigate("/new-arrivals#collection")}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#2f5597] shadow-sm hover:bg-[#f3f6ff]"
            >
              Continue Shopping
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-[#d7cfc8] bg-white/70 p-10 text-center">
              <p className="text-sm text-[#776a66]">Your cart is empty.</p>
              <Button
                type="button"
                onClick={() => navigate("/new-arrivals#collection")}
                className="mt-6 rounded-full bg-[#2f5597] px-6 py-3 text-sm font-semibold text-white hover:bg-[#264882]"
              >
                Browse Products
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:gap-8">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="grid grid-cols-[5.5rem_1fr] gap-3 rounded-[0.9rem] bg-white p-3 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:grid-cols-[7rem_1fr_auto] sm:gap-4 sm:rounded-[1rem] sm:p-4"
                  >
                    <div className="h-24 w-full overflow-hidden rounded-[0.75rem] bg-[#f0ece7] sm:h-full sm:rounded-[0.9rem]">
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4865a9]">
                        {item.product.category}
                      </p>
                      <h2 className="mt-1 line-clamp-2 text-base font-semibold leading-5 text-[#2b1b15] sm:mt-2 sm:text-xl sm:leading-7">{item.product.title}</h2>
                      <p className="mt-2 text-sm font-medium text-[#4f4038]">
                        {money(item.product.price)} each
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#b04d2f] hover:text-[#8f3e26] sm:mt-4"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                      <div className="flex h-11 items-center overflow-hidden rounded-full border border-[#d8d0c8] bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="flex h-11 w-11 items-center justify-center text-[#2f5597] hover:bg-[#f3f6ff]"
                          aria-label={`Decrease ${item.product.title} quantity`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-[#2b1b15]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="flex h-11 w-11 items-center justify-center text-[#2f5597] hover:bg-[#f3f6ff]"
                          aria-label={`Increase ${item.product.title} quantity`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-lg font-semibold text-[#2b1b15]">
                        {money(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="h-fit rounded-[1rem] bg-white p-5 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:rounded-[1.1rem] sm:p-6">
                <h2 className="text-xl font-semibold text-[#2b1b15] sm:text-2xl">Order summary</h2>
                <div className="mt-5 space-y-3 border-b border-[#eee7e1] pb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#776a66]">Items</span>
                    <span className="font-medium text-[#2b1b15]">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#776a66]">Subtotal</span>
                    <span className="font-medium text-[#2b1b15]">{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#776a66]">Shipping</span>
                    <span className="font-medium text-[#2b1b15]">Calculated at checkout</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-lg font-semibold text-[#2b1b15]">
                  <span>Total</span>
                  <span>{money(subtotal)}</span>
                </div>
                <Button
                  type="button"
                  onClick={handleProceed}
                  className="mt-6 w-full rounded-full bg-[#2f5597] py-6 text-base font-semibold text-white hover:bg-[#264882]"
                >
                  Proceed
                </Button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
