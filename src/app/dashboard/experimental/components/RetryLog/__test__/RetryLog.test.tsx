/**
 * RetryLog.test.tsx — robust summary number assertions
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { RetryLog } from "../RetryLog";

describe("RetryLog", () => {
  const baseSummary = { total: 0, passed: 0, failed: 0, error: 0 };

  test("renders idle state and 'No attempts yet.' when no entries", () => {
    render(
      <RetryLog
        attemptLog={[]}
        summary={baseSummary}
        fetching={false}
        triesCount={null}
      />
    );

    expect(screen.getByText(/Experimental fetch/i)).toBeInTheDocument();
    expect(screen.getByText(/Idle/i)).toBeInTheDocument();
    expect(screen.getByText(/No attempts yet\./i)).toBeInTheDocument();
    expect(screen.getByText(/No page loaded yet\./i)).toBeInTheDocument();
  });

  test("renders summary numbers and entries when provided", () => {
    const attempts = [
      {
        attempt: 1,
        status: "passed" as const,
        message: "First attempt",
        ts: new Date(Date.now() - 1000).toISOString(),
      },
      {
        attempt: 2,
        status: "failed" as const,
        message: "Second attempt failed",
        ts: new Date().toISOString(),
      },
    ];

    const summary = { total: 2, passed: 1, failed: 1, error: 0 };

    render(
      <RetryLog
        attemptLog={attempts}
        summary={summary}
        fetching={false}
        triesCount={2}
      />
    );

    // Summary header and total
    const totalContainer = screen.getByText(/Total attempts:/i).closest("div");
    expect(totalContainer).toBeTruthy();
    // inside that container there's a <strong> with the number
    expect(totalContainer!.querySelector("strong")?.textContent).toBe("2");

    // Passed container and number
    const passedContainer = screen.getByText(/Passed:/i).closest("div");
    expect(passedContainer).toBeTruthy();
    expect(passedContainer!.querySelector("strong")?.textContent).toBe("1");

    // Failed container and number
    const failedContainer = screen.getByText(/Failed:/i).closest("div");
    expect(failedContainer).toBeTruthy();
    expect(failedContainer!.querySelector("strong")?.textContent).toBe("1");

    // Error container and number
    const errorContainer = screen.getByText(/Error:/i).closest("div");
    expect(errorContainer).toBeTruthy();
    expect(errorContainer!.querySelector("strong")?.textContent).toBe("0");

    // Check that attempt entries exist: there will be one PASSED entry and one FAILED entry.
    const passedEntries = screen.getAllByText(/PASSED/i);
    const failedEntries = screen.getAllByText(/FAILED/i);
    expect(passedEntries.length).toBeGreaterThanOrEqual(1);
    expect(failedEntries.length).toBeGreaterThanOrEqual(1);

    // Footer text when not fetching but triesCount available
    expect(
      screen.getByText(/Last page satisfied after 2 tries\./i)
    ).toBeInTheDocument();
  });

  test("shows Running... and tries so far when fetching true", () => {
    render(
      <RetryLog
        attemptLog={[]}
        summary={{ total: 1, passed: 0, failed: 0, error: 0 }}
        fetching={true}
        triesCount={3}
      />
    );

    expect(screen.getByText(/Running.../i)).toBeInTheDocument();
    expect(screen.getByText(/Tries so far for page: 3/i)).toBeInTheDocument();
  });
});
