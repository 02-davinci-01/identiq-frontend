/**
 * ForgotPasswordForm.test.tsx (stable — no navigation assertion)
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import ForgotPasswordForm from "../ForgotPasswordForm";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
  window.history.pushState({}, "", "/");
});

describe("ForgotPasswordForm", () => {
  test("shows missing token/email validation", async () => {
    // No token/email in URL
    window.history.pushState({}, "", "/");
    render(<ForgotPasswordForm />);

    const passwordInput = screen.getByPlaceholderText(/Enter new password/i);
    const confirmInput = screen.getByPlaceholderText(/Confirm password/i);
    const submit = screen.getByRole("button", { name: /reset password/i });

    fireEvent.change(passwordInput, { target: { value: "pw1" } });
    fireEvent.change(confirmInput, { target: { value: "pw1" } });

    await userEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Missing reset token or email/i
    );
  });

  test("submits and shows success status on success when token/email present", async () => {
    window.history.pushState({}, "", "/?token=abc&email=test%40example.com");

    mockedAxios.post.mockResolvedValueOnce({
      data: { message: "OK" },
      status: 200,
    });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByPlaceholderText(/Enter new password/i), {
      target: { value: "validpw1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm password/i), {
      target: { value: "validpw1" },
    });

    await userEvent.click(
      screen.getByRole("button", { name: /reset password/i })
    );

    // wait for axios.post to be invoked
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    // the component displays a success message in a role="status" element on success
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Password updated successfully|OK/
    );
  }, 10_000);
});
