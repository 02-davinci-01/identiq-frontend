/**
 * Header.test.tsx — no require(), use spyOn for usePathname
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import Header from "../header";

describe("Header", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders login/register when not on dashboard", () => {
    jest.spyOn(nextNavigation, "usePathname").mockReturnValue("/");
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });

  test("returns null (no header) when on a dashboard route", () => {
    jest
      .spyOn(nextNavigation, "usePathname")
      .mockReturnValue("/dashboard/users");
    const { container } = render(<Header />);
    expect(container).toBeEmptyDOMElement();
  });
});
