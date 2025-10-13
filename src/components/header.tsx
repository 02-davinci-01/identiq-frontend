// src/components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function Header() {
  const pathname = usePathname() ?? "/";

  // Hide the public header for any dashboard route (including nested routes)
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <header className="app-header" role="banner">
      <div className="site-title">identiq</div>

      <nav className="header-actions" aria-label="top navigation">
        <Link href="/auth/login" className="btn btn-ghost">
          Login
        </Link>
        <Link href="/auth/register" className="btn btn-accent">
          Register
        </Link>
      </nav>
    </header>
  );
}
