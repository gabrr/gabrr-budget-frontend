import { NextResponse, type NextRequest } from "next/server";
import { allowedUserEmail } from "@/auth/config";
import { safeAuthDestination } from "@/auth/redirect";
import { createAuthCallbackGateway } from "@/auth/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextUrl = new URL(
    safeAuthDestination(request.nextUrl.searchParams.get("next")),
    request.url,
  );
  const auth = createAuthCallbackGateway();

  try {
    const identity = await auth.completeCallback({ code, tokenHash, type });
    if (identity.email !== allowedUserEmail()) {
      await auth.signOut();
      throw new Error("User is not allowed");
    }
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "authentication-failed");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(nextUrl);
}
