"use client";

import { useActionState } from "react";
import { upload, type UploadState } from "./actions";

export default function Upload() {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    upload,
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Add your connections</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          LinkedIn &rarr; Settings &rarr; Data privacy &rarr; Get a copy of your
          data &rarr; Connections. The file arrives by email in a few minutes.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        <button
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Adding…" : "Add to the bank"}
        </button>
      </form>

      {state.error && <p className="text-red-600">{state.error}</p>}

      {state.result && (
        <p>
          Added {state.result.added.toLocaleString()}{" "}
          {state.result.added === 1 ? "person" : "people"},{" "}
          {state.result.shared.toLocaleString()} already here.
        </p>
      )}

      <p className="text-sm text-neutral-500">
        Only who you are connected to is read — names, titles and companies. No
        messages, and nothing about who you talk to.
      </p>
    </main>
  );
}
