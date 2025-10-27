/**
 * RefreshTimer.test.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RefreshTimer } from "../RefreshTimer";

describe("RefreshTimer", () => {
  test("displays secondsLeft and calls onManualRefresh when clicked", () => {
    const onManualRefresh = jest.fn();
    render(<RefreshTimer secondsLeft={12} onManualRefresh={onManualRefresh} />);

    expect(screen.getByTitle(/Auto refresh timer/i)).toBeInTheDocument();
    expect(screen.getByText(/12s/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /Refresh/i });
    expect(btn).toBeEnabled();

    fireEvent.click(btn);
    expect(onManualRefresh).toHaveBeenCalledTimes(1);
  });

  test("disables Refresh button when disabled prop is true", () => {
    const onManualRefresh = jest.fn();
    render(
      <RefreshTimer
        secondsLeft={5}
        onManualRefresh={onManualRefresh}
        disabled
      />
    );

    const btn = screen.getByRole("button", { name: /Refresh/i });
    expect(btn).toBeDisabled();
  });
});
