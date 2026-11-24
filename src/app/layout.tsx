import type { Metadata, Viewport } from "next";
import { SessaoProvider } from "@/lib/sessao";
import { SCRIPT_TEMA } from "@/lib/tema";
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
  // o site tem tema claro e escuro próprios: o navegador não precisa forçar nada
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-tema="claro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="antialiased">
        <SessaoProvider>{children}</SessaoProvider>
      </body>
    </html>
  );
}
