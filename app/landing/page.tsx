import { HeroVideo } from "@/components/hero-video";

export const metadata = { title: "Go get that money!" };

export default function Landing() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="text-center font-[family-name:var(--font-new-rocker)] text-6xl leading-none sm:text-7xl md:text-8xl">
        Go get that money!
      </h1>
      <HeroVideo />
    </main>
  );
}
