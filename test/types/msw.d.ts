declare module "msw" {
  // minimal, safe shims for test-time usage
  export const rest: {
    get: (...args: any[]) => any;
    post: (...args: any[]) => any;
    put: (...args: any[]) => any;
    delete: (...args: any[]) => any;
    patch: (...args: any[]) => any;
  };
  export const graphql: any;
  export type RestRequest = any;
  export type ResponseComposition<T = any> = any;
  export type RestContext = any;
  export function setupWorker(...args: any[]): any;
  export const DefaultRequestBodyType: any;
  export const DefaultRequestMultipartBodyType: any;
  export const DefaultRequestTransformers: any;
}

declare module "msw/node" {
  export function setupServer(...handlers: any[]): any;
}
