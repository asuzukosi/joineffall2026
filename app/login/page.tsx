"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EfMark } from "@/components/ef-mark";
import { signIn, type LoginState } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <EfMark size={40} />
          <CardTitle className="mt-3">Fall 2026</CardTitle>
          <CardDescription>
            Search the cohort&rsquo;s combined network.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state.sent ? (
            <p className="text-sm">
              {state.message} Open it on this device &mdash; the link works for
              15 minutes and once only.
            </p>
          ) : (
            <form action={action} className="flex flex-col gap-3">
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-label="Your email address"
              />
              <Button disabled={pending}>
                {pending ? "Sending…" : "Email me a link"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {state.message ?? "Use the address EF has for you."}
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
