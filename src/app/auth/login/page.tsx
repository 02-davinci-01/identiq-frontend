// src/app/auth/login/page.tsx
import React from "react";
import LoginForm from "@/components/LoginForm/LoginForm";

export const dynamic = "force-static"; // enforce SSG

export default function LoginPage() {
  return (
    <main className="main-container">
      <section className="hero" aria-labelledby="login-hero">
        <h1 id="login-hero" className="typewriter">
          Welcome Back!<span className="cursor">|</span>
        </h1>
        <p>Sign in to your account to continue.</p>
      </section>

      {/* The actual interactive form is a client component imported from components */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 28,
        }}
      >
        <LoginForm />
      </div>
    </main>
  );
}
