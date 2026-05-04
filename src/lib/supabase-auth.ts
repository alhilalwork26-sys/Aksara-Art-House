function getAuthConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export function isAuthConfigured() {
  return Boolean(getAuthConfig());
}

async function authFetch(path: string, init?: RequestInit) {
  const config = getAuthConfig();
  if (!config) throw new Error("Supabase belum dikonfigurasi.");

  const res = await fetch(`${config.url}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || "Terjadi kesalahan autentikasi.";
    throw new Error(msg);
  }

  return data;
}

export async function signUp(email: string, password: string, fullName: string, phone?: string) {
  return authFetch("signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName, phone: phone || null }
    })
  });
}

export async function signIn(email: string, password: string) {
  return authFetch("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function signOut(accessToken: string) {
  const config = getAuthConfig();
  if (!config) return;

  await fetch(`${config.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });
}

export async function getUser(accessToken: string) {
  const config = getAuthConfig();
  if (!config) return null;

  const res = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!res.ok) return null;
  return res.json();
}
