// src/app/page.tsx
import TypewriterText from "@/components/TypewriterText";
export default function Home() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <h1 id="home-title">
        <TypewriterText text="Manage users, simply." speed={80} />
      </h1>
      <p>Lightweight user management built with clarity</p>
    </section>
  );
}
