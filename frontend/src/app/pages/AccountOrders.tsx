import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

function printInvoice(orderId: string) {
  const invoice = document.getElementById(`invoice-${orderId}`);
  if (!invoice) return;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head><title>Invoice ${orderId}</title></head>
      <body>${invoice.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export function AccountOrders() {
  const { user, orders, addresses, refreshUserData } = useAuth();
  const paidOrders = useMemo(() => orders.filter((order) => order.paymentStatus === "paid"), [orders]);

  return (
    <div className="bg-[#f8f3ef] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[1.4rem] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4865a9]">My Account</div>
            <h1 className="mt-2 text-3xl font-semibold text-[#2b1b15]">{user?.name}</h1>
            <p className="mt-1 text-sm text-[#776a66]">{user?.email}</p>
          </div>
          <button type="button" onClick={refreshUserData} className="rounded-full bg-[#2f5597] px-5 py-3 text-sm font-semibold text-white">
            Refresh Orders
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-2xl font-semibold text-[#2b1b15]">{orders.length}</div>
            <div className="text-sm text-[#776a66]">Total Orders</div>
          </div>
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-2xl font-semibold text-[#2b1b15]">{paidOrders.length}</div>
            <div className="text-sm text-[#776a66]">Paid Orders</div>
          </div>
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-2xl font-semibold text-[#2b1b15]">{addresses.length}</div>
            <div className="text-sm text-[#776a66]">Saved Addresses</div>
          </div>
        </div>

        <div className="grid gap-5">
          {orders.length ? (
            orders.map((order) => (
              <article key={order.id} className="rounded-[1.2rem] bg-white p-6 shadow-[0_12px_24px_rgba(48,32,22,0.07)]">
                <div id={`invoice-${order.id}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                    <div>
                      <h2>UDAI Invoice</h2>
                      <p>Order: {order.orderNumber ?? order.id}</p>
                      <p>Date: {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</p>
                    </div>
                    <div>
                      <strong>{order.customerName}</strong>
                      <p>{order.customerEmail}</p>
                      <p>{order.customerPhone}</p>
                    </div>
                  </div>
                  <hr />
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {order.items?.map((item) => (
                        <tr key={`${order.id}-${item.productId}`}>
                          <td style={{ padding: 8 }}>{item.title} x {item.quantity}</td>
                          <td style={{ padding: 8, textAlign: "right" }}>Rs. {(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <hr />
                  <p><strong>Total:</strong> Rs. {Number(order.totalAmount ?? 0).toFixed(2)}</p>
                  <p><strong>Payment:</strong> {order.paymentStatus}</p>
                  <p><strong>Status:</strong> {order.orderStatus}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => printInvoice(order.id)} className="rounded-full bg-[#2f5597] px-4 py-2 text-sm font-semibold text-white">
                    Print Invoice
                  </button>
                  <button type="button" onClick={() => printInvoice(order.id)} className="rounded-full border border-[#2f5597] px-4 py-2 text-sm font-semibold text-[#2f5597]">
                    Download Invoice
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-[#d9d2cb] bg-white p-8 text-center text-sm text-[#776a66]">
              No orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
