import { NextResponse, type NextRequest } from "next/server";
import { allowedUserEmail } from "@/auth/config";
import { createAuthCallbackGateway } from "@/auth/server";

function safeNextUrl(request: NextRequest, value: string | null): URL {
  const fallback = new URL("/dashboard", request.url);
  if (!value) return fallback;

  const destination = new URL(value, request.url);
  return destination.origin === request.nextUrl.origin ? destination : fallback;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextUrl = safeNextUrl(request, request.nextUrl.searchParams.get("next"));
  const auth = createAuthCallbackGateway();

  try {
    const identity = await auth.completeCallback({ code, tokenHash, type });
    if (identity.email !== allowedUserEmail()) {
      await auth.signOut();
      throw new Error("User is not allowed");
    }
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid-link");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(nextUrl);
}
