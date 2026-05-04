export type ArtworkStatus = "draft" | "available" | "auction" | "sold" | "archived";
export type OrderStatus = "pending" | "confirmed" | "paid" | "packed" | "shipped" | "done" | "cancelled";
export type PaymentStatus = "unpaid" | "waiting_confirmation" | "paid" | "failed" | "refunded";

export type Artwork = {
  id: string;
  title: string;
  artist: string;
  category: string;
  status: ArtworkStatus;
  medium: string;
  year: number | null;
  price: number;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  weight_kg: number | null;
  description: string | null;
  image_url: string | null;
  colors: string[];
  tags: string[];
  is_featured: boolean;
};

export type Auction = {
  id: string;
  artwork_id: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
  start_bid: number;
  current_bid: number;
  min_step: number;
  starts_at: string;
  ends_at: string;
  created_at?: string;
  updated_at?: string;
};

export type OrderItemInput = {
  artworkId: string;
  title: string;
  price: number;
  quantity: number;
};

export type CheckoutInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  courier: string;
  paymentMethod: string;
  notes?: string;
  items: OrderItemInput[];
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_city: string | null;
  courier: string | null;
  payment_method: string;
  payment_status: PaymentStatus;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_items?: Array<{
    title: string;
    price: number;
    quantity: number;
  }>;
};

