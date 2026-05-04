import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  const unauthorized = new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Aksara Art House Admin"'
    }
  });

  if (!header?.startsWith("Basic ")) {
    return unauthorized;
  }

  const encoded = header.slice("Basic ".length);
  const decoded = atob(encoded);
  const [inputUser, inputPassword] = decoded.split(":");

  if (inputUser !== username || inputPassword !== password) {
    return unauthorized;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};

