import { requireSession } from "@/lib/session";

export default async function Home() {
  const { email } = await requireSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">EF Fall 2026</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Signed in as {email}.
      </p>
    </main>
  );
}
