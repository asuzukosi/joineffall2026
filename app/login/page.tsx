"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">EF Fall 2026</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Search the cohort&rsquo;s combined network.
        </p>
      </div>

      {state.sent ? (
        <p className="rounded-md border border-neutral-300 px-3 py-4 text-sm dark:border-neutral-700">
          {state.message} Open it on this device — the link works for 15 minutes
          and once only.
        </p>
      ) : (
        <>
          <form action={action} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              disabled={pending}
              className="rounded-md bg-neutral-900 px-3 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {pending ? "Sending…" : "Email me a link"}
            </button>
          </form>
          <p className="text-sm text-neutral-500">
            {state.message ?? "Use the address EF has for you."}
          </p>
        </>
      )}
    </main>
  );
}
