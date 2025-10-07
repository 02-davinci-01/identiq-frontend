// src/app/layout.tsx
import "@/app/globals.css";
import Header from "@/components/header";
import { IBM_Plex_Mono, Josefin_Sans } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-josefin-sans",
});

export const metadata = {
  title: "User Management",
  description: "User Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} ${josefinSans.variable}`}
    >
      <body className="app-root">
        <Header />
        <main className="main-container">{children}</main>
        <footer className="site-footer">
          © {new Date().getFullYear()} · User Management
        </footer>
      </body>
    </html>
  );
}
