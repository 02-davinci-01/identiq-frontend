// src/components/Header/__test__/Header.test.tsx
/**
 * Header.test.tsx
 * Ensure next/navigation is mocked *before* the component imports it.
 */
jest.mock("next/navigation", () => ({
  __esModule: true,
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import Header from "../header";

describe("Header", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders login/register when not on dashboard", () => {
    (nextNavigation.usePathname as jest.Mock).mockReturnValue("/");
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });

  test("returns null (no header) when on a dashboard route", () => {
    (nextNavigation.usePathname as jest.Mock).mockReturnValue(
      "/dashboard/users"
    );
    const { container } = render(<Header />);
    expect(container).toBeEmptyDOMElement();
  });
});
