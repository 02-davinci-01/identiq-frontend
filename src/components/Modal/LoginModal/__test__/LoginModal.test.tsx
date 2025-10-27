import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../LoginModal";

describe("LoginModal", () => {
  test("renders when open and close button triggers onClose", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <Modal open={true} title="Sign in" onClose={onClose}>
        <div>content</div>
      </Modal>
    );

    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
