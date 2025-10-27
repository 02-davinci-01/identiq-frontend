/**
 * src/app/dashboard/experimental/components/__test__/UsersTable.test.tsx
 *
 * Updated: use getByTitle/getByText for the "You" helper button (title="This is your account")
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import UsersTable from "../UsersTable";

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
    theme: { name: "Teal", color: "#2F6F66" },
  });

  test("renders users and Delete button for non-current users", () => {
    const users = [makeUser(1), makeUser(2)];
    const onStartDelete = jest.fn();

    render(
      <UsersTable
        users={users}
        onStartDelete={onStartDelete}
        fetching={false}
        currentUserId={null}
        currentUserEmail={null}
        deleting={false}
      />
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();

    // two delete buttons present
    const deletes = screen.getAllByRole("button", { name: /Delete/i });
    expect(deletes.length).toBe(2);

    // click first delete triggers callback with id
    fireEvent.click(deletes[0]);
    expect(onStartDelete).toHaveBeenCalledWith("u1");
  });

  test("shows 'You' button for current user (by id) and hides Delete", () => {
    const users = [makeUser(1), makeUser(2)];
    const onStartDelete = jest.fn();

    render(
      <UsersTable
        users={users}
        onStartDelete={onStartDelete}
        fetching={false}
        currentUserId={"u1"}
        currentUserEmail={null}
        deleting={false}
      />
    );

    // The helper button's visible text is "You" and it also has title="This is your account".
    // Query by title to assert the intended attribute exists:
    expect(screen.getByTitle(/This is your account/i)).toBeInTheDocument();

    // There should be only one Delete button (for user2)
    const deleteBtns = screen.queryAllByRole("button", { name: /Delete/i });
    expect(deleteBtns.length).toBe(1);
  });

  test("shows 'You' when matched by email (case-insensitive)", () => {
    const users = [{ ...makeUser(1), email: "Me@Example.com" }, makeUser(2)];
    const onStartDelete = jest.fn();

    render(
      <UsersTable
        users={users}
        onStartDelete={onStartDelete}
        fetching={false}
        currentUserId={null}
        currentUserEmail={"me@example.com"}
        deleting={false}
      />
    );

    // Query by the visible "You" text (this is the accessible name)
    expect(screen.getByText(/^You$/)).toBeInTheDocument();

    // Only one Delete button should remain
    expect(screen.queryAllByRole("button", { name: /Delete/i }).length).toBe(1);
  });

  test("shows loading/empty messages correctly", () => {
    render(
      <UsersTable
        users={[]}
        onStartDelete={() => {}}
        fetching={true}
        currentUserId={null}
        currentUserEmail={null}
        deleting={false}
      />
    );

    expect(
      screen.getByText(/Waiting for experimental data.../i)
    ).toBeInTheDocument();

    // when not fetching, empty message changes
    render(
      <UsersTable
        users={[]}
        onStartDelete={() => {}}
        fetching={false}
        currentUserId={null}
        currentUserEmail={null}
        deleting={false}
      />
    );
    expect(
      screen.getByText(/No users loaded yet. Scroll to trigger load./i)
    ).toBeInTheDocument();
  });

  test("delete button disabled when deleting prop true", () => {
    const users = [makeUser(1)];
    const onStartDelete = jest.fn();

    render(
      <UsersTable
        users={users}
        onStartDelete={onStartDelete}
        fetching={false}
        currentUserId={null}
        currentUserEmail={null}
        deleting={true}
      />
    );

    // the delete button has an aria-label like "Delete user User 1"
    const del = screen.getByRole("button", { name: /Delete user/i });
    expect(del).toBeDisabled();
  });
});
