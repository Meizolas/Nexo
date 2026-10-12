import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Átrio", template: "%s | Átrio" },
  description: "Gestão jurídica e imobiliária em um só lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
