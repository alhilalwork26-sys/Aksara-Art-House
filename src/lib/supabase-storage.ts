import { createClient } from "@supabase/supabase-js";

const ARTWORK_BUCKET = "artwork-images";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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
  return "jpg";
}

async function ensureArtworkBucket() {
  const supabase = getStorageClient();
  const { error } = await supabase.storage.createBucket(ARTWORK_BUCKET, {
    public: true,
    allowedMimeTypes: [...ALLOWED_IMAGE_TYPES],
    fileSizeLimit: MAX_IMAGE_BYTES
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Gagal menyiapkan bucket gambar: ${error.message}`);
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

  const supabase = await ensureArtworkBucket();
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
