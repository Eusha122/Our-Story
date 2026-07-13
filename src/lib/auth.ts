// Uses Web Crypto so the same code runs in the edge middleware and in
// Node route handlers.

export const AUTH_COOKIE = "os_auth";

export async function expectedToken(): Promise<string | null> {
  const password = process.env.EDITOR_PASSWORD;
  if (!password) return null;
  const secret = process.env.AUTH_SECRET ?? "our-story";
  const bytes = new TextEncoder().encode(`${password}:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
