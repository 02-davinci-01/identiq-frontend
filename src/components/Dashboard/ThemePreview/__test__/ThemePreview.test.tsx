/**
 * ThemePreview.test.tsx — fixed queries to avoid ambiguous role matches
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemePreview from "../ThemePreview";

describe("ThemePreview", () => {
  test("renders label, hex and apply button", () => {
    render(<ThemePreview id="teal" label="Teal theme" selected={false} />);

    // label present
    expect(screen.getByText(/Teal theme/i)).toBeInTheDocument();

    // hex text present (exact format depends on component; use contains #)
    expect(screen.getByText(/#2F6F66/i)).toBeInTheDocument();

    // Use the button title attribute (less ambiguous than role)
    const applyBtn = screen.getByTitle(/Apply Teal theme/i);
    expect(applyBtn).toBeInTheDocument();
    expect(applyBtn).not.toHaveAttribute("disabled");
  });

  test("calls onSelect when clicked or keyboard invoked", () => {
    const onSelect = jest.fn();
    render(
      <ThemePreview
        id="light"
        label="Light"
        selected={false}
        onSelect={onSelect}
      />
    );

    // The interactive wrapper is focusable and has accessible name via label.
    const wrapper = screen.getByRole("button", { name: /Light/i });
    fireEvent.click(wrapper);
    expect(onSelect).toHaveBeenCalledWith("light");

    onSelect.mockClear();
    fireEvent.keyDown(wrapper, { key: "Enter", code: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("light");
  });

  test("apply button disabled when selected", () => {
    render(<ThemePreview id="dark" label="Dark" selected={true} />);

    // The inner button shows "Applied" and has title "Selected" in the component
    const appliedBtn = screen.getByTitle(/Selected/i);
    expect(appliedBtn).toBeInTheDocument();
    expect(appliedBtn).toBeDisabled();
  });
});
