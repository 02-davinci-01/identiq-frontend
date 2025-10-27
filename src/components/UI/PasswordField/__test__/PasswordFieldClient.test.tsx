// src/components/UI/PasswordField/__test__/PasswordFieldClient.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordField from "../PasswordFieldClient"; // adjust path if needed

describe("PasswordField", () => {
  test("toggles visibility and accepts input", async () => {
    const user = userEvent.setup();
    render(<PasswordField />);

    // target the input element specifically (the label text "Password" also appears in the toggle button's aria-label)
    const input = screen.getByLabelText(/password/i, {
      selector: "input",
    }) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");

    // find the toggle button by its aria-label "Show password"
    const toggleBtn = screen.getByRole("button", { name: /show password/i });

    // Click to show password
    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "text");

    // Type into the input (uncontrolled input - should update value)
    await user.type(input, "my-secret");
    expect(input.value).toBe("my-secret");

    // Click again to hide
    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "password");
  });
});
