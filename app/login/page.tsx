"use client";

import { useActionState, useEffect } from "react";
import { signIn, type LoginState } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );

  useEffect(() => {
    if (state.href) window.location.href = state.href;
  }, [state.href]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">EF Fall 2026</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Search the cohort&rsquo;s combined network.
        </p>
      </div>

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
          {pending || state.href ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        {state.message ?? "Use the address EF has for you."}
      </p>
    </main>
  );
}
