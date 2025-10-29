// src/app/dashboard/experimental/components/ThemeChart/__tests__/ThemeChart.test.tsx
import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import ThemeChart from "../ThemeChart";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Small helper: basic users fixture for client-side fallback aggregation.
 * Each user has a .theme object with various possible hex fields to test normalization.
 */
const usersFixture = [
  { id: "u1", name: "A", theme: { label: "Light", colorHex: "#112233" } },
  { id: "u2", name: "B", theme: { label: "Light", color: "#112233" } },
  { id: "u3", name: "C", theme: { label: "Dark", colorHex: "#000000" } },
];

describe("ThemeChart", () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    cleanup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders canonical items from payload.items (labels, counts, hexes)", async () => {
    const payload = {
      ok: true,
      items: [
        { label: "Teal", count: 3, colorHex: "#2F6F66" },
        { label: "Blue", count: 1, colorHex: "#2B65EC" },
      ],
    };

    mockedAxios.get.mockResolvedValue({ status: 200, data: payload });

    render(<ThemeChart />);

    // wait for labels to appear (async)
    await waitFor(() => {
      expect(screen.getByText(/Teal/i)).toBeInTheDocument();
      expect(screen.getByText(/Blue/i)).toBeInTheDocument();
    });

    // counts and hex should be present
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // at least two hex strings should appear (we check presence of '#' in text nodes)
    expect(
      screen.getAllByText((content) => content.includes("#")).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders legacy counts object (payload.counts) and generates hex fallbacks", async () => {
    const payload = { counts: { Light: 2, Dark: 4 } };
    mockedAxios.get.mockResolvedValue({ status: 200, data: payload });

    render(<ThemeChart />);

    await waitFor(() => {
      expect(screen.getByText(/Light/i)).toBeInTheDocument();
      expect(screen.getByText(/Dark/i)).toBeInTheDocument();
    });

    // numeric counts present
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    // generated hex fallback strings are rendered beside labels (at least contain '#')
    expect(
      screen.getAllByText((content) => content.includes("#")).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("falls back to client-side aggregation from users prop when server returns no usable payload", async () => {
    // server returns an empty object (no items/no counts)
    mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

    render(<ThemeChart users={usersFixture as any} />);

    // should render aggregated labels "Light" and "Dark"
    await waitFor(() => {
      expect(screen.getByText(/Light/i)).toBeInTheDocument();
      expect(screen.getByText(/Dark/i)).toBeInTheDocument();
    });

    // Light count should equal 2, Dark count 1
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // hex for Light should be present (#112233)
    expect(screen.getAllByText("#112233").length).toBeGreaterThanOrEqual(1);
  });

  it("shows an error message when network request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    render(<ThemeChart />);

    // The component sets error to err.message — wait for an element containing that message
    await waitFor(() => {
      expect(
        screen.getByText(/Network error|Failed to fetch distribution/i)
      ).toBeInTheDocument();
    });
  });
});
