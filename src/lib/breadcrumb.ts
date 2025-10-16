// src/lib/breadcrumb.ts
export type BreadcrumbType = "success" | "error" | "info";

/**
 * showBreadcrumb(message, type)
 * Lightweight DOM-based breadcrumb/toast utility.
 * Keep this simple and portable so other components can import and call it.
 */
export function showBreadcrumb(
  message: string,
  type: BreadcrumbType = "info",
  opts?: { durationMs?: number }
) {
  if (typeof document === "undefined") return;

  const duration = opts?.durationMs ?? 4000;
  const id = `breadcrumb-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const el = document.createElement("div");
  el.id = id;
  el.setAttribute("role", "status");
  el.style.position = "fixed";
  el.style.right = "20px";
  el.style.top = "20px";
  el.style.zIndex = "9999";
  el.style.padding = "12px 16px";
  el.style.borderRadius = "10px";
  el.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
  el.style.fontWeight = "600";
  el.style.fontFamily =
    "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
  el.style.maxWidth = "360px";
  el.style.wordWrap = "break-word";
  el.style.transition = "opacity 220ms ease, transform 220ms ease";
  el.style.opacity = "0";
  el.style.transform = "translateY(-6px)";

  if (type === "success") {
    el.style.background = "linear-gradient(180deg,#eaf7ef,#dff3e6)";
    el.style.color = "#1f6b2d";
    el.style.border = "1px solid rgba(31,107,45,0.08)";
  } else if (type === "error") {
    el.style.background = "linear-gradient(180deg,#fdeaea,#fbe8e8)";
    el.style.color = "#7a1f1f";
    el.style.border = "1px solid rgba(122,31,31,0.06)";
  } else {
    el.style.background = "linear-gradient(180deg,#f4f7ff,#eef2ff)";
    el.style.color = "#0f3a8a";
    el.style.border = "1px solid rgba(15,58,138,0.06)";
  }

  el.textContent = message;
  document.body.appendChild(el);

  // entrance
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });

  // remove
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";
    setTimeout(() => {
      const n = document.getElementById(id);
      if (n && n.parentNode) n.parentNode.removeChild(n);
    }, 240);
  }, duration);
}
