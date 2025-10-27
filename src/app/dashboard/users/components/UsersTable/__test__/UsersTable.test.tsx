/**
 * UsersTable.test.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UsersTable } from "../UsersTable";

// Minimal UserView type matching your component's expectations
type UserView = {
  id: string;
  name: string;
  email?: string;
  theme: { name: string; color: string };
};

describe("UsersTable", () => {
  const makeUser = (i: number): UserView => ({
    id: `u${i}`,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    theme: {
      name: i % 2 === 0 ? "Teal" : "Dark",
      color: i % 2 === 0 ? "#2F6F66" : "#000000",
    },
  });

  test("renders rows and Delete button for non-current users", () => {
    const users = [makeUser(1), makeUser(2)];
    const onOpenDelete = jest.fn();

    render(
      <UsersTable
        users={users}
        onOpenDelete={onOpenDelete}
        loadingInitial={false}
        loadingMore={false}
        pageLimit={2}
      />
    );

    // header and rows
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();

    // Both rows should have Delete buttons (not current user)
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons.length).toBe(2);

    // Click delete on first user
    fireEvent.click(deleteButtons[0]);
    expect(onOpenDelete).toHaveBeenCalledWith("u1");
  });

  test("hides Delete button for current user via isCurrentUser callback", () => {
    const users = [makeUser(1), makeUser(2)];
    const onOpenDelete = jest.fn();

    const isCurrentUser = (u: UserView) => u.id === "u1";

    render(
      <UsersTable
        users={users}
        onOpenDelete={onOpenDelete}
        loadingInitial={false}
        loadingMore={false}
        pageLimit={2}
        isCurrentUser={isCurrentUser}
      />
    );

    // Only one Delete button (for user2)
    const deleteButtons = screen.queryAllByRole("button", { name: /delete/i });
    expect(deleteButtons.length).toBe(1);
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();
  });

  test("shows loading row when loadingInitial and no users", () => {
    render(
      <UsersTable
        users={[]}
        onOpenDelete={() => {}}
        loadingInitial={true}
        loadingMore={false}
        pageLimit={4}
      />
    );

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test("shows empty message when not loading and no users", () => {
    render(
      <UsersTable
        users={[]}
        onOpenDelete={() => {}}
        loadingInitial={false}
        loadingMore={false}
        pageLimit={4}
      />
    );

    expect(screen.getByText(/No users found/i)).toBeInTheDocument();
  });

  test("shows loadingMore section when loadingMore and users.length >= pageLimit", () => {
    const users = Array.from({ length: 4 }).map((_, i) => makeUser(i + 1));
    render(
      <UsersTable
        users={users}
        onOpenDelete={() => {}}
        loadingInitial={false}
        loadingMore={true}
        pageLimit={4}
      />
    );

    expect(screen.getByText(/Loading more/i)).toBeInTheDocument();
  });
});
