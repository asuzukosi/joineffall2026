import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EF Fall 2026",
  description: "Search the cohort's combined network.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
