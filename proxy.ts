import { NextResponse, type NextRequest } from "next/server";

// The root domain is the landing page; the app lives on its own hostname. One
// deploy, split here rather than by DNS.
export default function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  if (host === (process.env.APP_HOST ?? "localhost")) return NextResponse.next();
  return NextResponse.rewrite(new URL("/landing", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icon.png|ef.png).*)",
  ],
};
