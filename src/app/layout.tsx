import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TeamSidebar, DebugPanel, PersistentHeader } from "@/components/ui";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeaderProvider } from "@/contexts/HeaderContext";
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
  title: "YAP Sports",
  description: "Fantasy football with player cards and tokens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{backgroundColor: 'var(--color-obsidian)'}}
      >
        <AuthProvider>
          <HeaderProvider>
            <TeamSidebar />
            <main className="min-h-screen ml-64">
              <PersistentHeader />
              {children}
            </main>
            <DebugPanel />
          </HeaderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
