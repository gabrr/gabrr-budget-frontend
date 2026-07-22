const DEFAULT_ALLOWED_EMAIL = "g.webdevelopr@gmail.com";

export function allowedUserEmail(): string {
  return (
    process.env.NEXT_PUBLIC_ALLOWED_USER_EMAIL ?? DEFAULT_ALLOWED_EMAIL
  ).trim().toLowerCase();
}
