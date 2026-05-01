import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript, type Theme } from "@/components/theme/ThemeProvider";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans-pf",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-pf",
  display: "swap",
});

const instrument = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif-pf",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Termprotect · Gestión de Personas",
  description: "App interna de gestión de personas — Termprotect",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("tp_theme")?.value;
  const theme: Theme = cookieValue === "night" ? "night" : "day";

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider initial={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
