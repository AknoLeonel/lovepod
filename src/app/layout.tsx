import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LOVEPOD | O Melhor Pod Descartável da Região",
  description: "Entrega expressa de pods descartáveis. Selecione sua cidade e acesse o catálogo VIP.",
  icons: {
    icon: "/logolove.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#030303",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-surface text-zinc-100 selection:bg-pink-500 selection:text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
