import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export async function sendLoginEmail(to: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const { error } = await new Resend(key).emails.send({
    from: FROM,
    to,
    subject: "Your sign-in link",
    text: [
      "Sign in to the EF Fall 2026 network:",
      "",
      url,
      "",
      "The link works for 15 minutes and can only be used once.",
      "If you did not ask for it, nothing has happened — ignore this email.",
    ].join("\n"),
  });

  if (error) throw new Error(`resend refused the send: ${error.message}`);
}
