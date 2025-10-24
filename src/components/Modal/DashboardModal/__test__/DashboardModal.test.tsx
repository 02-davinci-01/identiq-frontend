// src/components/Modal/DashboardModal/__test__/DashboardModal.test.tsx
import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

/**
 * Mock axios.create BEFORE importing the module-under-test so the module's
 * `api` instance will use our mocked methods.
 */
const patchMock = jest.fn();
const deleteMock = jest.fn();
(axios.create as unknown as jest.Mock) = jest.fn(() => ({
  patch: patchMock,
  delete: deleteMock,
}));

// Import after mocking axios.create
import {
  GenericModal,
  ChangePasswordModal,
  DeleteAccountModal,
} from "../DashboardModal";

describe("DashboardModal components (tsx tests)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM location href to empty for tests (JSDOM supports assignment)
    (window.location as any).href = "";
  });

  describe("GenericModal", () => {
    test("renders when open and closes via close button, backdrop and Escape", async () => {
      const onClose = jest.fn();
      const { rerender } = render(
        <GenericModal open={true} title="My Title" onClose={onClose}>
          <button>inner</button>
        </GenericModal>
      );

      // Title present
      expect(screen.getByText("My Title")).toBeInTheDocument();

      // Close button click closes
      const closeBtn = screen.getByRole("button", { name: /close/i });
      await userEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Re-render open to test backdrop click
      onClose.mockClear();
      rerender(
        <GenericModal open={true} title="My Title" onClose={onClose}>
          <button>inner</button>
        </GenericModal>
      );

      // Query document (portal) for backdrop
      const backdrop = document.querySelector("[role='presentation']");
      expect(backdrop).toBeTruthy();
      if (backdrop) {
        fireEvent.mouseDown(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }

      // Re-render open to test Escape
      onClose.mockClear();
      rerender(
        <GenericModal open={true} title="My Title" onClose={onClose}>
          <button>inner</button>
        </GenericModal>
      );

      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("ChangePasswordModal", () => {
    test("shows validation errors for missing/invalid input", async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<ChangePasswordModal open={true} onClose={onClose} />);

      // Click Save without filling fields -> expect current password error
      const saveBtn = screen.getByRole("button", { name: /save/i });
      await user.click(saveBtn);
      expect(
        await screen.findByText(/Enter your current password/i)
      ).toBeInTheDocument();

      // Fill current, but new password too short
      const currentInput = screen.getByLabelText(/current password/i, {
        selector: "input",
      });
      const newInput = screen.getByLabelText(/new password/i, {
        selector: "input",
      });
      const confirmInput = screen.getByLabelText(/confirm password/i, {
        selector: "input",
      });

      // Use change events (more reliable in tests)
      fireEvent.change(currentInput, { target: { value: "current-pass" } });
      fireEvent.change(newInput, { target: { value: "short" } });
      fireEvent.change(confirmInput, { target: { value: "short" } });

      await user.click(saveBtn);
      expect(
        await screen.findByText(/New password must be at least 8 characters/i)
      ).toBeInTheDocument();

      // Mismatched confirm: set both to long values then mismatch
      fireEvent.change(newInput, { target: { value: "longenough" } });
      fireEvent.change(confirmInput, { target: { value: "different" } });

      await user.click(saveBtn);

      // Component sets error: "New password and confirm password do not match."
      expect(
        await screen.findByText(
          /New password and confirm password do not match/i
        )
      ).toBeInTheDocument();
    });

    test("calls api.patch and closes after success timeout", async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      // mock successful patch response
      patchMock.mockResolvedValueOnce({
        status: 200,
        data: { ok: true, message: "Changed" },
      });

      render(<ChangePasswordModal open={true} onClose={onClose} />);

      const currentInput = screen.getByLabelText(/current password/i, {
        selector: "input",
      });
      const newInput = screen.getByLabelText(/new password/i, {
        selector: "input",
      });
      const confirmInput = screen.getByLabelText(/confirm password/i, {
        selector: "input",
      });
      const saveBtn = screen.getByRole("button", { name: /save/i });

      // Use change events to reliably set long values
      fireEvent.change(currentInput, { target: { value: "current-pass" } });
      fireEvent.change(newInput, { target: { value: "longenough" } });
      fireEvent.change(confirmInput, { target: { value: "longenough" } });

      await user.click(saveBtn);

      // Wait for API call to be invoked
      await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1), {
        timeout: 1500,
      });

      // After success the component sets a timeout that triggers onClose
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), {
        timeout: 2000,
      });
    });

    test("calls api.patch and shows API error on failure", async () => {
      patchMock.mockRejectedValueOnce({
        response: { status: 400, data: { message: "Bad request" } },
      });

      const onClose = jest.fn();
      render(<ChangePasswordModal open={true} onClose={onClose} />);

      const currentInput = screen.getByLabelText(/current password/i, {
        selector: "input",
      });
      const newInput = screen.getByLabelText(/new password/i, {
        selector: "input",
      });
      const confirmInput = screen.getByLabelText(/confirm password/i, {
        selector: "input",
      });
      const saveBtn = screen.getByRole("button", { name: /save/i });

      fireEvent.change(currentInput, { target: { value: "current-pass" } });
      fireEvent.change(newInput, { target: { value: "longenough" } });
      fireEvent.change(confirmInput, { target: { value: "longenough" } });

      await userEvent.click(saveBtn);

      // Wait for API to have been called
      await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));

      // Error text should appear (component shows backend message or generic)
      await waitFor(() =>
        expect(
          screen.queryByText(/failed|error|bad request|bad/i)
        ).not.toBeNull()
      );
    });
  });

  describe("DeleteAccountModal", () => {
    test("calls api.delete and navigates to / on success", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      // mock successful delete
      deleteMock.mockResolvedValueOnce({ status: 200, data: { ok: true } });

      render(<DeleteAccountModal open={true} onClose={onClose} />);

      const confirmBtn = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmBtn);

      // axios.delete should have been called
      await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));

      // after successful delete the component does: window.location.href = "/";
      await waitFor(
        () => {
          // use URL parsing to check the pathname (works whether JSDOM sets "http://localhost/" or a bare "/")
          expect(new URL((window.location as any).href).pathname).toBe("/");
        },
        { timeout: 1000 }
      );
    });
  });
});
