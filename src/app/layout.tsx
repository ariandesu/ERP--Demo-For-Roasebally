import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rosebally Warehouse ERP System",
  description: "Enterprise-grade garment warehouse and inventory management SaaS console.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900">
        {/* Global Toast Notification Provider */}
        <Toaster position="top-right" closeButton richColors theme="light" />
        {children}
      </body>
    </html>
  );
}
