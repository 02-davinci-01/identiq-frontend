/**
 * CompleteRegisterForm.test.tsx — use import-based mocks (no require)
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import CompleteRegisterForm from "../CompleteRegisterForm";
import * as breadcrumb from "@/lib/breadcrumb";

jest.mock("axios");
jest.mock("@/lib/breadcrumb", () => ({ showBreadcrumb: jest.fn() }));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const showBreadcrumbMock = breadcrumb.showBreadcrumb as jest.MockedFunction<
  typeof breadcrumb.showBreadcrumb
>;

beforeEach(() => {
  jest.clearAllMocks();
  window.history.pushState({}, "", "/");
});

describe("CompleteRegisterForm", () => {
  test("shows validation errors for empty/mismatched passwords", async () => {
    render(<CompleteRegisterForm />);
    const submit = screen.getByRole("button", { name: /set password/i });
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    const newPwdInput = screen.getByPlaceholderText(/Enter new password/i);
    const confirmPwdInput = screen.getByPlaceholderText(/Confirm password/i);

    fireEvent.change(newPwdInput, { target: { value: "validpass1" } });
    fireEvent.change(confirmPwdInput, { target: { value: "different" } });
    await userEvent.click(submit);

    expect(
      await screen.findByText(/Passwords do not match|do not match/i)
    ).toBeInTheDocument();
  });

  test("submits and shows success breadcrumb on success", async () => {
    window.history.pushState({}, "", "/?token=tok1&email=test%40example.com");
    mockedAxios.post.mockResolvedValueOnce({
      data: { message: "OK" },
      status: 200,
    });

    render(<CompleteRegisterForm />);

    const newPwdInput = screen.getByPlaceholderText(/Enter new password/i);
    const confirmPwdInput = screen.getByPlaceholderText(/Confirm password/i);
    const submit = screen.getByRole("button", { name: /set password/i });

    fireEvent.change(newPwdInput, { target: { value: "validpass1" } });
    fireEvent.change(confirmPwdInput, { target: { value: "validpass1" } });

    await userEvent.click(submit);

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    expect(showBreadcrumbMock).toHaveBeenCalled();
  });
});
