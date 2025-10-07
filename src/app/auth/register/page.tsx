// src/app/auth/register/page.tsx
import React from "react";
import RegisterForm from "@/components/RegisterForm/RegisterForm";

export const dynamic = "force-static";

export default function RegisterPage() {
  return (
    <main className="main-container">
      <section className="hero" aria-labelledby="register-hero">
        <h1 id="register-hero" className="typewriter">
          Create account<span className="cursor">|</span>
        </h1>
        <p>Sign up to get access to the dashboard and features.</p>
      </section>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 28,
        }}
      >
        <RegisterForm />
      </div>
    </main>
  );
}
