"use client";
import { useState } from "react";

export default function PasswordField({
  id = "password",
  name = "password",
  placeholder = "Your password",
}: {
  id?: string;
  name?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="label">
        Password
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="input"
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #e6e6e6",
            background: "white",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <div className="hint">Minimum 8 characters. Use a strong password.</div>
    </div>
  );
}
