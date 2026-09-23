export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">EF Fall 2026</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Search the cohort&rsquo;s combined network.
      </p>
      <a className="underline underline-offset-4" href="/login">
        Sign in
      </a>
    </main>
  );
}
