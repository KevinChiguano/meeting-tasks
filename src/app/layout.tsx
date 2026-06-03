import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Reuniones - Productividad",
  description:
    "Entorno de productividad para la gestión de reuniones, transcripción y tareas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} dark`}>
      <body
        className="antialiased font-sans selection:bg-primary/30"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
