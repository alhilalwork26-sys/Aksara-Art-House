import type { AdminOrder, Auction, AuctionBid, CheckoutInput } from "@/lib/types";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!apiKey || !from) return null;
  return { apiKey, from, adminEmail };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendEmail(payload: EmailPayload) {
  const config = getEmailConfig();
  if (!config) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gagal mengirim email (${response.status}): ${detail}`);
  }

  return { skipped: false };
}

export async function notifyOrderCreated(order: AdminOrder, input: CheckoutInput) {
  const config = getEmailConfig();
  if (!config) return;

  const itemRows = input.items
    .map((item) => `<li>${escapeHtml(item.title)} x ${item.quantity} - ${currency.format(item.price * item.quantity)}</li>`)
    .join("");

  const customerHtml = `
    <h2>Pesanan ${escapeHtml(order.order_number)} berhasil dibuat</h2>
    <p>Halo ${escapeHtml(input.customerName)}, terima kasih sudah memesan karya di Aksara Art House.</p>
    <ul>${itemRows}</ul>
    <p><strong>Total:</strong> ${currency.format(order.total)}</p>
    <p>Kami akan menghubungi Anda untuk konfirmasi pembayaran dan pengiriman.</p>
  `;

  const adminHtml = `
    <h2>Pesanan baru: ${escapeHtml(order.order_number)}</h2>
    <p><strong>Pemesan:</strong> ${escapeHtml(input.customerName)} (${escapeHtml(input.customerEmail)})</p>
    <p><strong>WhatsApp:</strong> ${escapeHtml(input.customerPhone)}</p>
    <p><strong>Total:</strong> ${currency.format(order.total)}</p>
    <ul>${itemRows}</ul>
  `;

  await Promise.allSettled([
    sendEmail({
      to: input.customerEmail,
      subject: `Pesanan ${order.order_number} diterima - Aksara Art House`,
      html: customerHtml
    }),
    config.adminEmail
      ? sendEmail({
          to: config.adminEmail,
          subject: `Pesanan baru ${order.order_number}`,
          html: adminHtml
        })
      : Promise.resolve()
  ]);
}

export async function notifyAuctionBidPlaced(input: {
  auction: Auction;
  bid: AuctionBid;
  artworkTitle?: string;
}) {
  const config = getEmailConfig();
  if (!config?.adminEmail) return;

  await sendEmail({
    to: config.adminEmail,
    subject: `Bid baru: ${input.artworkTitle || "Lelang Aksara"}`,
    html: `
      <h2>Penawaran baru masuk</h2>
      <p><strong>Karya:</strong> ${escapeHtml(input.artworkTitle || input.auction.artwork_id)}</p>
      <p><strong>Penawar:</strong> ${escapeHtml(input.bid.bidder_name)}</p>
      <p><strong>Nominal:</strong> ${currency.format(input.bid.amount)}</p>
      <p><strong>Auction ID:</strong> ${escapeHtml(input.auction.id)}</p>
    `
  });
}

export async function notifyOrderUpdated(order: AdminOrder) {
  if (!order.customer_email) return;

  await sendEmail({
    to: order.customer_email,
    subject: `Update pesanan ${order.order_number} - Aksara Art House`,
    html: `
      <h2>Status pesanan diperbarui</h2>
      <p>Halo ${escapeHtml(order.customer_name)}, status pesanan Anda sekarang:</p>
      <p><strong>${escapeHtml(order.status)}</strong> / pembayaran <strong>${escapeHtml(order.payment_status)}</strong></p>
      ${order.tracking_number ? `<p><strong>Resi:</strong> ${escapeHtml(order.tracking_number)}</p>` : ""}
      ${order.shipping_notes ? `<p>${escapeHtml(order.shipping_notes)}</p>` : ""}
    `
  });
}
