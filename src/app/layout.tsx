import type { Metadata, Viewport } from "next";
import { PrototypeAuthProvider } from "@/components/prototype-auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Finara",
    template: "%s · Finara",
  },
  description: "Catat dan pahami keuangan pribadi dengan lebih cepat.",
};

export const viewport: Viewport = {
  themeColor: "#eef1ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        <PrototypeAuthProvider>{children}</PrototypeAuthProvider>
      </body>
    </html>
  );
}
