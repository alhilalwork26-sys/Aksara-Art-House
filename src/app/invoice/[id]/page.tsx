import { notFound } from "next/navigation";
import { getOrderInvoiceById } from "@/lib/supabase-rest";

type PageProps = {
  params: Promise<{ id: string }>;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

function labelPayment(status: string) {
  return {
    unpaid: "Belum dibayar",
    waiting_confirmation: "Menunggu verifikasi",
    paid: "Lunas",
    failed: "Perlu upload ulang",
    refunded: "Refund"
  }[status] || status;
}

export default async function InvoicePage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrderInvoiceById(id);
  if (!order) notFound();

  const items = order.order_items || [];
  const subtotal = Number(order.subtotal || items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0));
  const discount = Number(order.discount_amount || 0);
  const total = Number(order.total || Math.max(0, subtotal - discount));

  return (
    <main style={{ minHeight: "100vh", background: "#f7f3ee", color: "#3d2a22", padding: "32px 16px", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 860, margin: "0 auto", background: "#fffaf6", border: "1px solid #e7ddd5", borderRadius: 12, padding: 32 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 24, borderBottom: "1px solid #e7ddd5", paddingBottom: 22 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 500 }}>Invoice</h1>
            <p style={{ margin: "8px 0 0", color: "#8b7a70" }}>Aksara Art House</p>
          </div>
          <div style={{ textAlign: "right", lineHeight: 1.7, color: "#8b7a70" }}>
            <strong style={{ color: "#3d2a22" }}>{order.order_number}</strong><br />
            {order.created_at ? new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : ""}<br />
            {labelPayment(order.payment_status)}
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 24 }}>
          <div style={{ border: "1px solid #e7ddd5", borderRadius: 10, padding: 18, background: "#fbf7f2" }}>
            <div style={{ color: "#9a8a80", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12, marginBottom: 10 }}>Pemesan</div>
            <strong>{order.customer_name}</strong><br />
            {order.customer_email}<br />
            {order.customer_phone || "-"}
          </div>
          <div style={{ border: "1px solid #e7ddd5", borderRadius: 10, padding: 18, background: "#fbf7f2" }}>
            <div style={{ color: "#9a8a80", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12, marginBottom: 10 }}>Pengiriman</div>
            {order.shipping_address || "Menunggu konfirmasi"}<br />
            {order.shipping_city || "-"} {order.shipping_postal_code || ""}<br />
            {order.courier || "-"}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 26 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e7ddd5", padding: "12px 0", color: "#9a8a80", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Karya</th>
              <th style={{ textAlign: "center", borderBottom: "1px solid #e7ddd5", padding: "12px 0", color: "#9a8a80", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Qty</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #e7ddd5", padding: "12px 0", color: "#9a8a80", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Harga</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.title}-${index}`}>
                <td style={{ borderBottom: "1px solid #e7ddd5", padding: "14px 0" }}>{item.title}</td>
                <td style={{ borderBottom: "1px solid #e7ddd5", padding: "14px 0", textAlign: "center" }}>{Number(item.quantity || 1)}</td>
                <td style={{ borderBottom: "1px solid #e7ddd5", padding: "14px 0", textAlign: "right" }}>{currency.format(Number(item.price || 0) * Number(item.quantity || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", marginTop: 18, color: "#8b7a70" }}>
          <div>Subtotal: <span style={{ color: "#3d2a22" }}>{currency.format(subtotal)}</span></div>
          {discount > 0 ? <div>Diskon: <span style={{ color: "#467044" }}>-{currency.format(discount)}</span></div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, paddingTop: 18, borderTop: "1px solid #e7ddd5", color: "#c1714b", fontSize: 28 }}>
          <span>Total</span>
          <strong>{currency.format(total)}</strong>
        </div>

        <div style={{ marginTop: 24, padding: 18, background: "#fbf7f2", borderRadius: 10, border: "1px solid #e7ddd5", lineHeight: 1.7 }}>
          <strong>Pembayaran:</strong> {order.payment_method} / {labelPayment(order.payment_status)}
          {order.tracking_number ? <><br /><strong>Resi:</strong> {order.tracking_number}</> : null}
          {order.estimated_delivery ? <><br /><strong>Estimasi tiba:</strong> {order.estimated_delivery}</> : null}
        </div>

        <p style={{ marginTop: 24, color: "#8b7a70", fontSize: 13 }}>Untuk menyimpan PDF, gunakan fitur Print di browser lalu pilih Save as PDF.</p>
      </section>
    </main>
  );
}
