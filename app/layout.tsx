import type { Metadata } from "next";
import { New_Rocker } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNav } from "@/components/app-nav";

const newRocker = New_Rocker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-new-rocker",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EF Fall 2026",
  description: "Search the cohort's combined network.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={newRocker.variable}>
      <body className="antialiased">
        <TooltipProvider>
          <AppNav />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
