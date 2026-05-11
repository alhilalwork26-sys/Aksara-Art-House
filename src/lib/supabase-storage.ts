import { createClient } from "@supabase/supabase-js";

const ARTWORK_BUCKET = "artwork-images";
const PAYMENT_PROOF_BUCKET = "payment-proofs";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_PAYMENT_PROOF_TYPES = new Set([...ALLOWED_IMAGE_TYPES, "application/pdf"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getStorageClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage belum dikonfigurasi.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function safeFilename(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "artwork";
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf") return "pdf";
  return "jpg";
}

async function ensureBucket(bucket: string, allowedMimeTypes: string[]) {
  const supabase = getStorageClient();
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes,
    fileSizeLimit: MAX_IMAGE_BYTES
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Gagal menyiapkan bucket storage: ${error.message}`);
  }

  return supabase;
}

export async function uploadArtworkImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Format gambar harus JPG, PNG, atau WEBP.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Ukuran gambar maksimal 5MB.");
  }

  const supabase = await ensureBucket(ARTWORK_BUCKET, [...ALLOWED_IMAGE_TYPES]);
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFilename(file.name)}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(ARTWORK_BUCKET).upload(path, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw new Error(`Gagal upload gambar: ${error.message}`);

  const { data } = supabase.storage.from(ARTWORK_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadPaymentProof(file: File) {
  if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.type)) {
    throw new Error("Bukti pembayaran harus berupa JPG, PNG, WEBP, atau PDF.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Ukuran bukti pembayaran maksimal 5MB.");
  }

  const supabase = await ensureBucket(PAYMENT_PROOF_BUCKET, [...ALLOWED_PAYMENT_PROOF_TYPES]);
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFilename(file.name)}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(PAYMENT_PROOF_BUCKET).upload(path, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw new Error(`Gagal upload bukti pembayaran: ${error.message}`);

  const { data } = supabase.storage.from(PAYMENT_PROOF_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
