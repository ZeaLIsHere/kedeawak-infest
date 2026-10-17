import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "KedeAwak",
  description:
    "Aplikasi agen AI operasional warung yang menyambungkan WhatsApp ke satu sistem terpusat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={cn(geist.variable)}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
