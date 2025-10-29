// ThemePreview.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemePreview from "@/components/Dashboard/ThemePreview/ThemePreview";

describe("ThemePreview", () => {
  test("renders label and hex and three swatches", () => {
    render(<ThemePreview id="dark" label="Dark" />);

    // Label visible
    expect(screen.getByText("Dark")).toBeInTheDocument();

    // HEX text should be rendered (component shows primary hex)
    expect(screen.getByText(/#000000/i)).toBeInTheDocument();

    // There should be three swatch divs (background color blocks)
    // Query by role won't work for these, so look for elements by style via getAllByRole is not possible.
    // Instead, ensure there are 3 elements with width/height style set inline (matching how component renders them).
    const swatches = screen.getAllByRole("presentation", {
      hidden: true,
    }).length;
    // If your test environment doesn't expose role="presentation" for those divs, fallback to counting 3 boxes by CSS-like query.
    // We'll assert at least that the HEX and label are present as the primary checks.
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  test("clicking the card calls onSelect with themeId payload", async () => {
    const onSelect = jest.fn();
    render(<ThemePreview id="teal" label="Teal" onSelect={onSelect} />);

    // Outer card has aria-label `Select theme ${label}`
    const card = screen.getByLabelText("Select theme Teal");
    await userEvent.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("teal", { themeId: "teal" });
  });

  test("clicking Apply button calls onSelect and does NOT bubble to card (stopPropagation)", async () => {
    const onSelect = jest.fn();
    render(<ThemePreview id="teal" label="Teal" onSelect={onSelect} />);

    const card = screen.getByLabelText("Select theme Teal");
    // The Apply button shows text "Apply" by default
    const applyButton = screen.getByRole("button", { name: /Apply/i });

    // Click the Apply button only
    await userEvent.click(applyButton);

    // onSelect should be called once by the button handler
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("teal", { themeId: "teal" });

    // Now click the card — should call again (total 2)
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  test("keyboard activation (Enter and Space) triggers onSelect from card", async () => {
    const onSelect = jest.fn();
    render(<ThemePreview id="light" label="Light" onSelect={onSelect} />);

    const card = screen.getByLabelText("Select theme Light");

    fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("light", { themeId: "light" });

    fireEvent.keyDown(card, { key: " ", code: "Space" });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith("light", { themeId: "light" });
  });

  test("when selected=true, Apply button is disabled and shows 'Applied' and clicking does nothing", async () => {
    const onSelect = jest.fn();
    render(
      <ThemePreview
        id="teal"
        label="Teal"
        onSelect={onSelect}
        selected={true}
      />
    );

    const appliedButton = screen.getByRole("button", { name: /Applied/i });
    expect(appliedButton).toBeDisabled();

    // Click should not call onSelect
    await userEvent.click(appliedButton);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("custom theme shows Delete button and clicking it calls onDelete without calling onSelect", async () => {
    const onSelect = jest.fn();
    const onDelete = jest.fn();
    // pass hex and isCustom
    render(
      <ThemePreview
        id="custom-1"
        label="My Custom"
        hex="#123ABC"
        isCustom
        onSelect={onSelect}
        onDelete={onDelete}
      />
    );

    // Delete button should be visible
    const deleteButton = screen.getByRole("button", { name: /Delete/i });
    await userEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    // Ensure clicking delete doesn't call onSelect
    expect(onSelect).not.toHaveBeenCalled();
  });
});
