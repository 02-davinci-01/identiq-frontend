// getCurrentUserIdentifiers.ts
// Best-effort extraction of current user id/email from common localStorage keys.
// Returns { id: string | null, email: string | null }

export function getCurrentUserIdentifiers(): {
  id: string | null;
  email: string | null;
} {
  try {
    const keysToTry = [
      "user",
      "currentUser",
      "me",
      "profile",
      "authUser",
      "user_profile",
      "user_email",
      "email",
      "user_id",
      "id",
      "uid",
    ];

    let id: string | null = null;
    let email: string | null = null;

    for (const key of keysToTry) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const trimmed = raw.trim();
      // JSON object stored as string
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          id =
            id ??
            String(
              parsed.id ?? parsed._id ?? parsed.userId ?? parsed.uid ?? null
            ) ??
            null;
          email =
            email ??
            String(
              parsed.email ?? parsed.emailAddress ?? parsed.userEmail ?? null
            ) ??
            null;
        } catch {
          // ignore JSON parse errors for this key
        }
      } else {
        // raw string
        if (!email && raw.includes("@")) email = raw;
        else if (!id) id = raw;
      }

      // short-circuit if both found
      if (id && email) break;
    }

    return { id: id ?? null, email: email ?? null };
  } catch {
    return { id: null, email: null };
  }
}
