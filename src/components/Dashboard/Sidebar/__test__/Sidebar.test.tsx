/**
 * Sidebar.test.tsx — replace require() usePathname with jest.spyOn
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import Sidebar from "../Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nav items and highlights active item", () => {
    jest
      .spyOn(nextNavigation, "usePathname")
      .mockReturnValue("/dashboard/users");
    render(<Sidebar />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Users/i)).toBeInTheDocument();

    const usersLink = screen.getByText(/Users/i).closest("a");
    expect(usersLink).toBeTruthy();
    expect((usersLink as HTMLAnchorElement).className).toMatch(/active/);
  });
});
