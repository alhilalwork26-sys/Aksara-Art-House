import { NextResponse } from "next/server";
import { getUser, getUserAuthToken } from "@/lib/supabase-auth";

export async function GET(request: Request) {
  try {
    const token = getUserAuthToken(request);

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const userData = await getUser(token);

    if (!userData) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.user_metadata?.full_name || userData.email?.split("@")[0] || "Kolektor",
        email: userData.email,
        wa: userData.user_metadata?.phone || null
      }
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
