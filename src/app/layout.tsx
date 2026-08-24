import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Finara",
    template: "%s · Finara",
  },
  description: "Catat dan pahami keuangan pribadi dengan lebih cepat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
