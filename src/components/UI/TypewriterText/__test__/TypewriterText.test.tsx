// src/components/UI/TypewriterText/__test__/TypewriterText.test.tsx
import React from "react";
import { render } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import TypewriterText from "../TypewriterText";

jest.useFakeTimers();

describe("TypewriterText", () => {
  afterAll(() => jest.useRealTimers());

  test("renders progressively and shows full text after advancing timers", () => {
    const { container } = render(<TypewriterText text="hello" speed={10} />);
    const root = container.querySelector(".typewriter");
    expect(root).toBeTruthy();

    // advance timers inside act so React processes state updates synchronously
    act(() => {
      jest.advanceTimersByTime(60); // 5 chars * 10ms = 50ms, give a little extra
    });

    // now the displayed text should equal "hello|"
    expect(root?.textContent).toBe("hello|");
  });

  test("renders full text immediately if speed is 0", () => {
    const { container } = render(<TypewriterText text="instant" speed={0} />);
    const root = container.querySelector(".typewriter");
    expect(root).toBeTruthy();

    act(() => {
      jest.runAllTimers(); // run all intervals immediately
    });

    expect(root?.textContent).toBe("instant|");
  });
});
