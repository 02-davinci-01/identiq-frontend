// src/app/email-verification/page.tsx
import React, { Suspense } from "react";
import styles from "./EmailVerificationClient/email-verification.module.css";

/**
 * Server page — renders the client verification component inside Suspense.
 * This avoids the "useSearchParams() should be wrapped in a suspense boundary"
 * error during prerender/build.
 */

const ClientEmailVerification = React.lazy(
  () =>
    import(
      "@/app/email-verification/EmailVerificationClient/EmailVerificationClient"
    )
);

export default function EmailVerificationPage() {
  return (
    <main className={styles.mainContainer}>
      <Suspense
        fallback={
          <div className={styles.hero}>
            <div className={styles.typewriter}>Preparing verification...</div>
          </div>
        }
      >
        <ClientEmailVerification />
      </Suspense>
    </main>
  );
}
