import { createHmac } from "crypto";

const SECRET = process.env.ADMIN_PASSWORD || "changeme";
const USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_COOKIE_NAME = "aksara_admin_token";

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === USERNAME && password === SECRET;
}

export function createAdminToken(): string {
  const payload = `${USERNAME}:${Date.now()}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
    if (sig !== expected) return false;
    // Token berlaku 24 jam
    const ts = parseInt(payload.split(":")[1], 10);
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function getAdminToken(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (token) return token;

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const cookie = cookies.find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`));
  return cookie ? decodeURIComponent(cookie.slice(ADMIN_COOKIE_NAME.length + 1)) : null;
}
