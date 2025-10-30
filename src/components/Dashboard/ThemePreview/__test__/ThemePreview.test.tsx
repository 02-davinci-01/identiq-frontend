// src/components/Dashboard/ThemePreview/__tests__/ThemePreview.test.tsx
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ThemePreview from "../../../../components/Dashboard/ThemePreview/ThemePreview"; // adjust path if needed

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("ThemePreview", () => {
  it("renders label, primary hex and three swatches", () => {
    const onSelect = jest.fn();
    // Render the static 'Dark' theme (id 'dark' maps to #000000 in STATIC)
    const { container } = render(
      <ThemePreview id="dark" label="Dark" onSelect={onSelect} />
    );

    // Label present
    expect(screen.getByText("Dark")).toBeInTheDocument();

    // Primary HEX appears at least twice (card area and previewActions)
    const hexNodes = screen.getAllByText((content) => content.includes("#"));
    expect(hexNodes.length).toBeGreaterThanOrEqual(2);
    // Ensure the primary hex value is the expected #000000 for 'dark'
    expect(hexNodes.some((n) => n.textContent === "#000000")).toBe(true);

    // There should be three swatch divs inside the preview (20x20 squares)
    const swatches = container.querySelectorAll(
      'div[style*="width: 20px"][style*="height: 20px"]'
    );
    expect(swatches.length).toBe(3);
  });

  it("clicking the Apply button calls onSelect with { themeId } for static themes", () => {
    const onSelect = jest.fn();
    render(<ThemePreview id="teal" label="Teal" onSelect={onSelect} />);

    // Find the Apply button (text "Apply")
    const applyButton = screen.getByRole("button", { name: /Apply/i });
    fireEvent.click(applyButton);

    // Expect onSelect called once with id and payload { themeId: id }
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("teal", { themeId: "teal" });
  });

  it("card click and keyboard (Enter) invoke onSelect (respecting isCustom payload)", () => {
    const onSelect = jest.fn();

    // Custom theme: provide hex and isCustom true
    const customHex = "#ABCDEF";
    render(
      <ThemePreview
        id="aditya"
        label="Aditya"
        hex={customHex}
        isCustom
        onSelect={onSelect}
      />
    );

    // Card has aria-label "Select theme Aditya"
    const card = screen.getByRole("button", { name: /Select theme Aditya/i });
    // Click the card
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith("aditya", { colorHex: customHex });

    onSelect.mockClear();

    // Press Enter while focused on card (simulate keyboard activation)
    fireEvent.keyDown(card, { key: "Enter", code: "Enter", charCode: 13 });
    expect(onSelect).toHaveBeenCalledWith("aditya", { colorHex: customHex });
  });

  it("shows Delete button for custom themes and calls onDelete when clicked", () => {
    const onDelete = jest.fn();
    const onSelect = jest.fn();
    const customHex = "#112233";

    render(
      <ThemePreview
        id="custom1"
        label="Custom One"
        hex={customHex}
        isCustom
        onSelect={onSelect}
        onDelete={onDelete}
      />
    );

    // Delete button should be visible
    const deleteButton = screen.getByRole("button", { name: /Delete/i });
    expect(deleteButton).toBeInTheDocument();

    // Click Delete and expect onDelete called
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables Apply button when selected is true and shows 'Applied' text", () => {
    const onSelect = jest.fn();
    render(
      <ThemePreview id="light" label="Light" selected onSelect={onSelect} />
    );

    // The Applied button should render and be disabled
    const appliedButton = screen.getByRole("button", { name: /Applied/i });
    expect(appliedButton).toBeInTheDocument();
    expect(appliedButton).toBeDisabled();

    // Important: Do NOT click the disabled button in the test.
    // Instead assert that onSelect has not been called so far.
    expect(onSelect).not.toHaveBeenCalled();
  });
});
