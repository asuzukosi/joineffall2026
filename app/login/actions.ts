"use server";

import { headers } from "next/headers";
import { auth, takeSignInLink } from "@/lib/auth";

export type LoginState = { message?: string; href?: string };

export async function signIn(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { message: "Enter your email address." };

  let href: string | undefined;
  try {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/" },
      headers: await headers(),
    });
    href = takeSignInLink(email);
  } catch {
    // An address that is not on the roster stops in the auth hook. The reply
    // below is the same either way, so the roster cannot be probed from here.
  }

  if (!href) {
    return { message: "If that address is on the cohort roster, you can sign in." };
  }

  // The browser has to follow this itself. A server-action redirect navigates
  // inside the router, which drops the Set-Cookie the verify endpoint returns.
  return { href };
}
