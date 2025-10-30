// src/app/dashboard/users/components/ThemePanel/__test__/ThemePanel.test.tsx
import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import ThemePanel from "../ThemePanel";
import axios from "axios";

// Fix: mock ResizeObserver so Recharts ResponsiveContainer won't crash
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("ThemePanel", () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders canonical items and shows labels, counts and hexes", async () => {
    const payload = {
      ok: true,
      items: [
        { label: "Teal", count: 3, colorHex: "#2F6F66" },
        { label: "Blue", count: 1, colorHex: "#2B65EC" },
      ],
    };

    mockedAxios.get.mockResolvedValue({ status: 200, data: payload });

    render(<ThemePanel />);

    // Wait for labels to appear (async)
    await waitFor(() => {
      expect(screen.getByText(/Teal/i)).toBeInTheDocument();
      expect(screen.getByText(/Blue/i)).toBeInTheDocument();
    });

    // counts
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // hexes
    expect(screen.getAllByText(/#/i).length).toBeGreaterThanOrEqual(2);
  });

  it("handles legacy counts object shape", async () => {
    const payload = {
      counts: { Light: 2, Dark: 4 },
    };

    mockedAxios.get.mockResolvedValue({ status: 200, data: payload });

    render(<ThemePanel />);

    await waitFor(() => {
      expect(screen.getByText(/Light/i)).toBeInTheDocument();
      expect(screen.getByText(/Dark/i)).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    render(<ThemePanel />);

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to fetch theme distribution/i)
      ).toBeInTheDocument()
    );
  });
});
