// src/app/layout.tsx
"use client";

import "@/app/globals.css";
import Header from "@/components/Header/header";
import { IBM_Plex_Mono, Josefin_Sans } from "next/font/google";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // create a client per session (keeps SSR-safe usage)
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} ${josefinSans.variable}`}
    >
      <body className="app-root">
        <QueryClientProvider client={queryClient}>
          <Header />
          <main className="main-container">{children}</main>
          <footer className="site-footer">
            © {new Date().getFullYear()} · User Management
          </footer>
          {/* If you ever need React Query Devtools in dev:
              import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
              and uncomment below:
              <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </body>
    </html>
  );
}
