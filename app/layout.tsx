import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "AnonConnect — Meet Strangers, Make Connections",
  description:
    "Connect with random strangers anonymously. Chat based on shared interests. No profiles exposed, just real conversations.",
  keywords: "anonymous chat, random chat, meet strangers, online chat",
  openGraph: {
    title: "AnonConnect",
    description: "Connect with random strangers anonymously",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main className="page-wrapper">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
