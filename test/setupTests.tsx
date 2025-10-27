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
  // if require fails (very old Node), fall back silently — MSW may still need an npm polyfill
  // e.g. `npm i text-encoding` and then:
  // const { TextEncoder, TextDecoder } = require('text-encoding');
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
