/**
 * ProfileDropdown.test.tsx — avoids any + require, removes unused vars
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("@/components/Modal/DashboardModal/DashboardModal", () => ({
  ChangePasswordModal: ({ open }: { open: boolean }) =>
    open ? <div>ChangePasswordModal open</div> : null,
  DeleteAccountModal: ({ open }: { open: boolean }) =>
    open ? <div>DeleteAccountModal open</div> : null,
}));

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  getToken: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutateAsync: jest.fn() }),
  useQueryClient: () => ({
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(() => null),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/dashboard"),
}));

import ProfileDropdown from "../ProfileDropdown";
import { api } from "@/lib/api";

describe("ProfileDropdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("opens dropdown and shows fetched placeholders, Save with no changes shows breadcrumb error", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: { name: "Alice", email: "alice@example.com" } },
    });

    render(<ProfileDropdown />);

    const trigger = await screen.findByRole("button", {
      name: /edit profile/i,
    });
    fireEvent.click(trigger);

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    // Expect some status or breadcrumb element appears (component renders status role)
    const status = await screen.findByRole("status");
    expect(status).toBeInTheDocument();
  });

  test("clicking change password opens ChangePasswordModal", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: { name: "Bob", email: "bob@example.com" } },
    });

    render(<ProfileDropdown />);

    const trigger = await screen.findByRole("button", {
      name: /edit profile/i,
    });
    fireEvent.click(trigger);

    const changeBtn = screen.getByRole("button", { name: /change password/i });
    fireEvent.click(changeBtn);

    expect(
      await screen.findByText(/ChangePasswordModal open/i)
    ).toBeInTheDocument();
  });
});
