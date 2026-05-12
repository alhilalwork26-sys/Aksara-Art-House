import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  const missing = [
    ["RESEND_API_KEY", process.env.RESEND_API_KEY],
    ["NOTIFICATION_FROM", process.env.NOTIFICATION_FROM],
    ["ADMIN_NOTIFICATION_EMAIL", process.env.ADMIN_NOTIFICATION_EMAIL]
  ].filter(([, value]) => !value).map(([key]) => key);

  return NextResponse.json({
    active: missing.length === 0,
    provider: "Resend",
    missing
  });
}
