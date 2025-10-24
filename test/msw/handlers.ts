import { rest } from "msw";

export const handlers = [
  rest.get("/users/count", (req: any, res: any, ctx: any) =>
    res(ctx.json({ count: 42 }))
  ),
];
