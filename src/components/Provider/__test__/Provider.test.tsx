import React from "react";
import { render, screen } from "@testing-library/react";
import Providers from "../Providers";

describe("Providers", () => {
  test("renders children inside QueryClientProvider", () => {
    render(
      <Providers>
        <div data-testid="child">child</div>
      </Providers>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("child");
  });
});
