import { createHmac } from "crypto";

export const ADMIN_COOKIE_NAME = "aksara_admin_token";

function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const config = getAdminConfig();
  if (!config) return false;
  return username === config.username && password === config.password;
}

export function createAdminToken(): string {
  const config = getAdminConfig();
  if (!config) throw new Error("ADMIN_USERNAME dan ADMIN_PASSWORD belum dikonfigurasi.");
  const payload = `${config.username}:${Date.now()}`;
  const sig = createHmac("sha256", config.password).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const config = getAdminConfig();
    if (!config) return false;
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = createHmac("sha256", config.password).update(payload).digest("hex");
    if (sig !== expected) return false;
    const username = payload.split(":")[0];
    if (username !== config.username) return false;
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
