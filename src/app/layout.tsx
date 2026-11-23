import type { Metadata, Viewport } from "next";
import { SessaoProvider } from "@/lib/sessao";
import "@fontsource/marcellus/400.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paratus — Mesa",
  description: "Fichas, Escudo do Mestre, dados e códice da campanha Paratus.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12284a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <SessaoProvider>{children}</SessaoProvider>
      </body>
    </html>
  );
}
