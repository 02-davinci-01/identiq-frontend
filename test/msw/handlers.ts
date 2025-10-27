import { rest } from "msw";

export const handlers = [
  rest.get("/users/count", (req: any, res: any, ctx: any) =>
    res(ctx.json({ count: 42 }))
  ),

  rest.get("/auth/captcha", (req: any, res: any, ctx: any) => {
    return res(
      ctx.status(200),
      ctx.json({ svg: "<svg></svg>", token: "test-captcha-token" })
    );
  }),
];
