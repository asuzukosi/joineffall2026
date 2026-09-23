"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type LoginState = { message?: string; sent?: boolean };

const SAME_EITHER_WAY =
  "If that address is on the cohort roster, a sign-in link is on its way.";

export async function signIn(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { message: "Enter your email address." };

  try {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/" },
      headers: await headers(),
    });
  } catch (error) {
    // An address that is not on the roster stops in the auth hook and lands
    // here, which is why the reply is the same either way. A send that genuinely
    // failed is different: the member is waiting for an email nobody sent.
    if (error instanceof Error && /RESEND|resend/.test(error.message)) {
      console.error("[login] could not send the sign-in link:", error.message);
      return { message: "Email is not working right now. Tell whoever runs this." };
    }
  }

  return { message: SAME_EITHER_WAY, sent: true };
}
