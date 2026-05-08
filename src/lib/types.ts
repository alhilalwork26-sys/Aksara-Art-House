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
  stock: number;
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

export type AuctionBid = {
  id: string;
  auction_id: string;
  bidder_id: string | null;
  bidder_name: string;
  amount: number;
  created_at: string;
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
  promoCode?: string;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  courier: string | null;
  payment_method: string;
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  tracking_number: string | null;
  shipping_notes: string | null;
  estimated_delivery: string | null;
  promo_code_id: string | null;
  created_at: string;
  order_items?: Array<{
    artwork_id: string | null;
    title: string;
    price: number;
    quantity: number;
  }>;
};

export type Review = {
  id: string;
  artwork_id: string;
  user_id: string | null;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  created_at: string;
};

export type ReviewInput = {
  artworkId: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  comment?: string;
};

export type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

export type PromoValidationResult = {
  valid: boolean;
  promoCodeId?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  finalTotal?: number;
  message: string;
};
