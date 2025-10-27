/**
 * DeleteModal.test.tsx — lint-clean version (no any)
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteModal } from "../DeleteModal";

// Mock GenericModal so modal content renders inline for assertions
jest.mock("@/components/Modal/DashboardModal/DashboardModal", () => ({
  GenericModal: ({
    open,
    children,
  }: {
    open: boolean;
    children?: React.ReactNode;
  }) => (open ? <div data-testid="generic-modal">{children}</div> : null),
}));

describe("DeleteModal", () => {
  test("renders correct text when userName supplied and calls onClose/onConfirm", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    render(
      <DeleteModal
        open={true}
        userName="Alice"
        onClose={onClose}
        onConfirm={onConfirm}
        loading={false}
      />
    );

    expect(screen.getByTestId("generic-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/Do you want to delete Alice account\?/i)
    ).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    const deleteBtn = screen.getByRole("button", { name: /Delete/i });

    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("Delete button shows 'Deleting...' and Cancel disabled while loading", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    render(
      <DeleteModal
        open={true}
        userName="Bob"
        onClose={onClose}
        onConfirm={onConfirm}
        loading={true}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    const deleteBtn = screen.getByRole("button", {
      name: /Deleting...|Delete/i,
    });

    expect(cancelBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
  });
});
