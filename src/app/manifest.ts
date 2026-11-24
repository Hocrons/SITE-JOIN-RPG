import type { MetadataRoute } from "next";

/** Permite "Adicionar à tela inicial": o site abre em tela cheia, como um app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paratus: mesa de Ordem Paranormal",
    short_name: "Paratus",
    description: "Fichas, dados, códice e quadro da campanha Paratus.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#131114",
    theme_color: "#131114",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
