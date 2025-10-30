// test/setupTests.tsx
import React from "react";
import "@testing-library/jest-dom";
import "whatwg-fetch";

/**
 * Polyfill TextEncoder / TextDecoder for environments where they may be missing.
 * Node v11+ exports these from 'util'. If your Node is older, you can install
 * the 'text-encoding' package instead and import from there.
 */
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require("util");
  // assign only if missing
  // @ts-ignore
  if (typeof global.TextEncoder === "undefined")
    global.TextEncoder = TextEncoder;
  // @ts-ignore
  if (typeof global.TextDecoder === "undefined")
    global.TextDecoder = TextDecoder;
} catch (err) {
  // if require fails (very old Node), fall back silently
  // e.g. `npm i text-encoding` and then:
  // const { TextEncoder, TextDecoder } = require('text-encoding');
}

/**
 * Minimal ResizeObserver mock so components that rely on it (eg. recharts'
 * ResponsiveContainer) don't throw in jsdom.
 *
 * This mock is intentionally small — it provides the observe/unobserve/disconnect
 * methods used by libraries, but performs no layout measurement.
 */
class ResizeObserverMock {
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
}
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;

/**
 * Basic window.matchMedia stub (some UI libs check it).
 * Returns an object with add/remove listener methods compatible with older APIs.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated API
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

/** Simple next/image mock (no JSX allowed if this file is .ts — we assume .tsx) */
jest.mock(
  "next/image",
  () => (props: any) => React.createElement("img", props)
);

/** Basic next/router mock */
jest.mock("next/router", () => ({
  useRouter: () => ({ route: "/", pathname: "/", query: {}, asPath: "/" }),
}));

/**
 * MSW server: load if available. If you don't have test/msw/server.ts,
 * the try/catch will avoid crashing the setup.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { server } = require("./msw/server");
  if (server) {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
  }
} catch (e) {
  // no msw server file found or require failed — ignore
}
