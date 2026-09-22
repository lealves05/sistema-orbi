import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORBI | Gestão para salões de beleza",
  description: "Agenda, clientes, equipe, financeiro, estoque e relatórios em uma única plataforma.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
