/**
 * LoginForm.test.tsx
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import LoginForm from "../LoginForm";

// Mock next/navigation useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("LoginForm", () => {
  test("shows errors when fields missing or captcha not solved", async () => {
    render(<LoginForm />);

    const submit = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Please enter both email and password|Please solve the captcha/i
    );
  });

  test("renders captcha from server and logs in with token", async () => {
    // Mock captcha GET to return svg + token
    mockedAxios.get.mockResolvedValueOnce({
      data: { svg: "<svg></svg>", token: "ctok" },
      status: 200,
    });

    // Mock captcha verify -> ok
    mockedAxios.post.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
    });

    // Mock login -> returns accessToken
    mockedAxios.post.mockResolvedValueOnce({
      data: { accessToken: "atoken" },
      status: 200,
    });

    // re-import to ensure initial captcha fetch occurs in effect
    render(<LoginForm />);

    // wait for captcha to be rendered
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));

    // fill fields
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "bob@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "password1" },
    });

    // set captcha input
    const captchaInput =
      screen.getByPlaceholderText(/Type the text you see/i) ||
      screen.getByRole("textbox", { name: /captcha/i });
    fireEvent.change(captchaInput, { target: { value: "answer" } });

    // click submit -> captcha verify + login
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // captcha verify called, then login called
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());

    // token stored in localStorage
    expect(
      localStorage.getItem("access_token") || localStorage.getItem("token")
    ).toBeTruthy();
  });
});
