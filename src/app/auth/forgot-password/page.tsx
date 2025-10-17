// src/app/auth/forgot-password/page.tsx
import React from "react";
import ForgotPasswordForm from "@/components/ForgotPasswordForm/ForgotPasswordForm";

export const dynamic = "force-static";

export default function ForgotPasswordPage() {
  return (
    <main className="main-container">
      <section className="hero" aria-labelledby="forgot-hero">
        <h1 id="forgot-hero" className="typewriter">
          Lost?<span className="cursor">|</span>
        </h1>
        <p>don't worry - we got it.</p>
      </section>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 28,
        }}
      >
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
