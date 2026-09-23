import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getDb } from "./db";
import { isMember } from "./roster";
import { sendLoginEmail } from "./email";

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
      expiresIn: 900,
      sendMagicLink: async ({ email, url }) => sendLoginEmail(email, url),
    }),
    // Must stay last: it forwards Set-Cookie out of server actions, which is
    // how signing out actually clears the session rather than only appearing to.
    nextCookies(),
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
