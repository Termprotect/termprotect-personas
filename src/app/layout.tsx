import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Termprotect · Gestión de Personas",
  description: "App interna de gestión de personas — Termprotect",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
