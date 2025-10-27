/**
 * RegisterForm.test.tsx — import-based breadcrumb mock
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import RegisterForm from "../RegisterForm";
import * as breadcrumb from "@/lib/breadcrumb";

jest.mock("axios");
jest.mock("@/lib/breadcrumb", () => ({ showBreadcrumb: jest.fn() }));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const showBreadcrumbMock = breadcrumb.showBreadcrumb as jest.MockedFunction<
  typeof breadcrumb.showBreadcrumb
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RegisterForm", () => {
  test("shows validation errors for missing fields", async () => {
    render(<RegisterForm />);
    const submit = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  test("submits form and shows breadcrumb on success", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { message: "Check inbox" },
    });
    render(<RegisterForm />);

    fireEvent.change(screen.getByPlaceholderText(/your-username/i), {
      target: { value: "bob" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "bob@example.com" },
    });

    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    expect(showBreadcrumbMock).toHaveBeenCalled();
  });
});
