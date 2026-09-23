import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function currentEmail(): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email?.toLowerCase();
}

export async function requireSession(): Promise<{ email: string }> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  return { email };
}
