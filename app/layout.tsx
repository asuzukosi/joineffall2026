import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNav } from "@/components/app-nav";

export const metadata: Metadata = {
  title: "EF Fall 2026",
  description: "Search the cohort's combined network.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TooltipProvider>
          <AppNav />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
