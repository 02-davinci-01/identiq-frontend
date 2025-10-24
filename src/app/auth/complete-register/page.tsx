// src/app/auth/complete-register/page.tsx
import React from "react";
import CompleteRegisterForm from "@/components/Form/CompleteRegisterForm/CompleteRegisterForm";

export const dynamic = "force-static";

export default function CompleteRegisterPage() {
  return (
    <main className="main-container">
      <section className="hero" aria-labelledby="complete-register-hero">
        <h1 id="complete-register-hero" className="typewriter">
          Welcome<span className="cursor">|</span>
        </h1>
        <p>Set your password to finish account setup.</p>
      </section>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 28,
        }}
      >
        <CompleteRegisterForm />
      </div>
    </main>
  );
}
