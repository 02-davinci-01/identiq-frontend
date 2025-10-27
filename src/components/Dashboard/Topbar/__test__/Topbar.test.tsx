// src/components/Dashboard/Topbar/__test__/Topbar.test.tsx
/**
 * Topbar.test.tsx
 * Mock next/navigation early so useRouter is a jest.fn()
 */
jest.mock("next/navigation", () => ({
  __esModule: true,
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Topbar from "../Topbar";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as nextNavigation from "next/navigation";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

type MockRouter = { push: jest.Mock };

describe("Topbar", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    localStorage.setItem("access_token", "token-1");
    localStorage.setItem("token", "token-2");
  });

  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  }

  test("renders brand and logout button", () => {
    const mockRouter: MockRouter = { push: jest.fn() };
    (nextNavigation.useRouter as jest.Mock).mockReturnValue(
      mockRouter as unknown as ReturnType<typeof nextNavigation.useRouter>
    );

    renderWithProviders(<Topbar />);

    expect(screen.getByText(/identiq/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  test("handleLogout calls backend, clears storage and redirects", async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { ok: true } });
    const mockRouter: MockRouter = { push: jest.fn() };

    (nextNavigation.useRouter as jest.Mock).mockReturnValue(
      mockRouter as unknown as ReturnType<typeof nextNavigation.useRouter>
    );

    renderWithProviders(<Topbar />);

    const logoutBtn = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith("/auth/login");
  });
});
