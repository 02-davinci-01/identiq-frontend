// src/components/Dashboard/Sidebar/__test__/Sidebar.test.tsx
/**
 * Sidebar.test.tsx
 * Mock next/navigation at top so hooks are writable mocks.
 */
jest.mock("next/navigation", () => ({
  __esModule: true,
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import Sidebar from "../Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nav items and highlights active item", () => {
    (nextNavigation.usePathname as jest.Mock).mockReturnValue(
      "/dashboard/users"
    );
    render(<Sidebar />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Users/i)).toBeInTheDocument();

    const usersLink = screen.getByText(/Users/i).closest("a");
    expect(usersLink).toBeTruthy();
    expect((usersLink as HTMLAnchorElement).className).toMatch(/active/);
  });
});
