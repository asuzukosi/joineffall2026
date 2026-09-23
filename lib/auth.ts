import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getDb } from "./db";
import { isMember } from "./roster";

// The link is never emailed. It is generated, handed straight back to the
// browser that asked for it, and consumed on the next request. That makes
// sign-in "type a roster address and you are in" — a real gate, because the
// roster is private, but not proof that the address belongs to whoever typed
// it. Sending this link by email is the only change needed to make it one.
const issued = new Map<string, string>();

export function takeSignInLink(email: string): string | undefined {
  const key = email.trim().toLowerCase();
  const url = issued.get(key);
  issued.delete(key);
  return url;
}

export const auth = betterAuth({
  appName: "EF Fall 2026",
  database: getDb(),
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  advanced: {
    // Behind Fly's proxy every request looks like it comes from the same
    // address, which collapses rate limiting into one bucket for the whole app.
    ipAddress: { ipAddressHeaders: ["fly-client-ip", "x-forwarded-for"] },
  },
  plugins: [
    magicLink({
      expiresIn: 300,
      sendMagicLink: async ({ email, url }) => {
        issued.set(email.trim().toLowerCase(), url);
      },
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/magic-link") return;
      const email = String((ctx.body as { email?: string } | undefined)?.email ?? "");
      if (!isMember(email)) {
        // Answer exactly as a success does. A 400 here would let anyone read the
        // roster off the API one address at a time. Throwing still stops the
        // flow, so no user row, no verification row and no link are created.
        throw new APIError("OK", { status: true });
      }
    }),
  },
});
