import { NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase-rest";

export interface Exhibition {
  id: number;
  title: string;
  description: string | null;
  date_start: string;
  date_end: string | null;
  location: string | null;
  image_url: string | null;
  status: "upcoming" | "ongoing" | "past";
  created_at: string;
}

export async function GET() {
  try {
    const rows = await supabaseFetch<Exhibition[]>(
      `/rest/v1/exhibitions?status=in.(upcoming,ongoing)&order=date_start.asc&select=*`
    );
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat pameran." },
      { status: 500 }
    );
  }
}
