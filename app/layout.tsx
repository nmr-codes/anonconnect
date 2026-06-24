import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import Navbar from "../components/Navbar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "LingoGen — Interactive Language Exchange Matchmaking",
  description:
    "Connect with random language partners anonymously. Learn and chat based on native and learning languages and shared interests.",
  keywords: "language exchange, random chat, learn languages, meet strangers, online chat, LingoGen",
  openGraph: {
    title: "LingoGen",
    description: "Connect with language exchange partners anonymously",
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
        <Analytics />
      </body>
    </html>
  );
}
