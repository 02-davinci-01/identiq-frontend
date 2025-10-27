// RetryLog.tsx
import React from "react";
import type { AttemptLogEntry } from "../../hooks/useInfiniteExperimentalUsers";

type Props = {
  attemptLog: AttemptLogEntry[];
  summary: { total: number; passed: number; failed: number; error: number };
  fetching: boolean;
  triesCount: number | null;
};

export function RetryLog({ attemptLog, summary, fetching, triesCount }: Props) {
  return (
    <div
      style={{
        marginTop: 12,
        fontSize: 13,
        padding: "8px 6px",
        borderTop: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>Experimental fetch</div>
        <div style={{ fontSize: 12, color: "#666" }}>
          {fetching ? "Running..." : "Idle"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 12 }}>
          Total attempts: <strong>{summary.total}</strong>
        </div>
        <div style={{ fontSize: 12, color: "green" }}>
          Passed: <strong>{summary.passed}</strong>
        </div>
        <div style={{ fontSize: 12, color: "#b85a2a" }}>
          Failed: <strong>{summary.failed}</strong>
        </div>
        <div style={{ fontSize: 12, color: "#c0392b" }}>
          Error: <strong>{summary.error}</strong>
        </div>
      </div>

      <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 6 }}>
        {attemptLog.length === 0 ? (
          <div style={{ fontSize: 13, color: "#666" }}>No attempts yet.</div>
        ) : (
          attemptLog.map((a) => (
            <div
              key={`${a.attempt}-${a.ts}`}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  minWidth: 36,
                  textAlign: "center",
                  padding: "4px 6px",
                  borderRadius: 6,
                  background:
                    a.status === "passed"
                      ? "rgba(0,128,0,0.08)"
                      : a.status === "failed"
                      ? "rgba(184,90,42,0.06)"
                      : "rgba(192,57,43,0.06)",
                  color:
                    a.status === "passed"
                      ? "green"
                      : a.status === "failed"
                      ? "#b85a2a"
                      : "#c0392b",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >{`#${a.attempt}`}</div>

              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {a.status.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {a.message} • {new Date(a.ts).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        {fetching
          ? `Tries so far for page: ${triesCount ?? summary.total}`
          : triesCount != null
          ? `Last page satisfied after ${triesCount} ${
              triesCount === 1 ? "try" : "tries"
            }.`
          : "No page loaded yet."}
      </div>
    </div>
  );
}
