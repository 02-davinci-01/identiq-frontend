// src/components/Header.tsx
"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="app-header" role="banner">
      <div className="site-title">identiq</div>

      <nav className="header-actions" aria-label="top navigation">
        <Link href="/auth/login" className="btn btn-ghost">
          Login
        </Link>
        <Link href="/register" className="btn btn-accent">
          Register
        </Link>
      </nav>
    </header>
  );
}
