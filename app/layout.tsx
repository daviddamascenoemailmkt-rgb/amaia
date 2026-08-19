import type { Metadata, Viewport } from "next";
import { marca } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `Reativar meu acordo · ${marca.programa}`,
  description:
    "Seu PIX expirou, mas sua proposta pode ser reativada. Confirme o CPF e veja a nova condição.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1b34b8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
