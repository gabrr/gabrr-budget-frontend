import { browserAuth } from "@/auth/browser";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await browserAuth.getAccessToken();

  if (!token) {
    window.location.assign("/login");
    throw new Error("Authentication required");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    await browserAuth.signOut({ localOnly: true });
    window.location.assign("/login");
  }

  return response;
}
