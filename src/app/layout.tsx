import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// As fontes Geist são super modernas e rápidas (criadas pela Vercel)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configuração Global de SEO
export const metadata: Metadata = {
  title: "LOVEPOD | O Melhor Pod Descartável da Região",
  description: "Entrega expressa de pods descartáveis. Selecione sua cidade e acesse o catálogo VIP.",
  icons: {
    icon: "/logolove.png", // Usa sua logo como ícone da aba do navegador caso não tenha um favicon
  },
};

// Configuração de Tela e Cor do Navegador Mobile
export const viewport: Viewport = {
  themeColor: "#030303", // Deixa a barra superior do Chrome no celular escura combinando com o site
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Evita aquele zoom chato quando clica em algum botão no celular
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Mudamos para Português do Brasil
    <html lang="pt-BR"> 
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030303] text-zinc-100 selection:bg-pink-500 selection:text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}